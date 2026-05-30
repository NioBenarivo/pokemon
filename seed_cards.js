/**
 * seed_cards.js
 *
 * For every Pokemon in the Supabase `pokemon` table, scrapes their cards from
 * artofpkm.com, uploads each card image to Cloudflare R2, and upserts the record
 * into the `scraped_cards` table.
 *
 * Run:
 *   node --env-file=.env.local seed_cards.js
 *
 * Schema (run in Supabase SQL editor before first run):
 *   create table scraped_cards (
 *     id          text    primary key,  -- "{set_id}-{card_id}" e.g. "581-101"
 *     pokemon_id  integer references pokemon(id),
 *     name        text    not null,
 *     pack        text    not null,
 *     image_url   text    not null
 *   );
 *   alter table scraped_cards enable row level security;
 *   create policy "Public read" on scraped_cards for select using (true);
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'

const SUPABASE_URL  = process.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const WORKER_URL    = process.env.VITE_WORKER_URL
const UPLOAD_SECRET = process.env.VITE_UPLOAD_SECRET
const R2_BASE       = process.env.VITE_R2_BASE_URL?.replace(/\/$/, '')

const ARTOFPKM = 'https://www.artofpkm.com'
const UA       = 'Mozilla/5.0 (compatible; PokemonCardSeeder/1.0)'

// ── Validation ────────────────────────────────────────────────────────────────

const missing = ['VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'VITE_WORKER_URL', 'VITE_UPLOAD_SECRET', 'VITE_R2_BASE_URL']
  .filter(k => !process.env[k])
if (missing.length) {
  console.error('Missing env vars:', missing.join(', '))
  process.exit(1)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** @param {number} ms */
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

/**
 * Fetches all Pokemon rows from Supabase, ordered by id.
 * Paginates in batches of 1000 to work around Supabase's default row limit.
 * @returns {Promise<Array<{id: number, name: string}>>}
 */
async function getAllPokemon() {
  const all = []
  const PAGE_SIZE = 1000
  let from = 0

  while (true) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/pokemon?select=id,name&order=id.asc`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Range: `${from}-${from + PAGE_SIZE - 1}`,
        'Range-Unit': 'items',
      },
    })
    if (!res.ok) throw new Error(`Failed to fetch pokemon list: ${res.status}`)
    const rows = await res.json()
    all.push(...rows)
    if (rows.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return all
}

/**
 * Returns the set of card IDs already saved in the scraped_cards table.
 * Paginates in batches of 1000 to work around Supabase's default row limit.
 * @returns {Promise<Set<string>>}
 */
async function getExistingCardIds() {
  const ids = new Set()
  const PAGE_SIZE = 1000
  let from = 0

  while (true) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/scraped_cards?select=id`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Range: `${from}-${from + PAGE_SIZE - 1}`,
        'Range-Unit': 'items',
      },
    })
    if (!res.ok) break
    const rows = await res.json()
    rows.forEach(r => ids.add(r.id))
    if (rows.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return ids
}

/**
 * Scrapes one page of cards for a given Pokemon.
 * Returns an array of card objects parsed from the turbo-frame HTML.
 * @param {number} pokemonId
 * @param {number} page
 * @returns {Promise<Array<{id: string, name: string, pack: string, imgPath: string}>>}
 */
async function scrapeCardsPage(pokemonId, page) {
  const url = `${ARTOFPKM}/pokemon/${pokemonId}/cards${page > 1 ? `?page=${page}` : ''}`
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const html = await res.text()

  // All cards live inside <turbo-frame id="tab_content">
  const frameStart = html.indexOf('<turbo-frame')
  if (frameStart === -1) return []
  const frame = html.slice(frameStart)

  // Each card anchor has data-lightbox-url="/sets/{setId}/card/{cardId}"
  // and href pointing to the full-size image on artofpkm.com
  const cardPattern = /data-lightbox-url="\/sets\/(\d+)\/card\/(\d+)"[^>]+href="(https:\/\/www\.artofpkm\.com\/rails[^"]+)"[\s\S]*?card-title[^>]*>([\s\S]*?)<\/div>[\s\S]*?card-subtitle[^>]*line-clamp-1[^>]*>([\s\S]*?)<\/div>/g

  const cards = []
  let m
  while ((m = cardPattern.exec(frame)) !== null) {
    const [, setId, cardId, imgPath, rawName, rawPack] = m
    cards.push({
      id: `${setId}-${cardId}`,
      name: rawName.trim(),
      pack: rawPack.trim(),
      imgPath: `${ARTOFPKM}${imgPath}`,
    })
  }
  return cards
}

/**
 * Checks whether the current page has a "next page" link for the given Pokemon.
 * @param {number} pokemonId
 * @param {number} currentPage
 * @param {string} html
 * @returns {boolean}
 */
function hasNextPage(pokemonId, currentPage, html) {
  return html.includes(`/pokemon/${pokemonId}/cards?page=${currentPage + 1}`)
}

/**
 * Fetches all pages of cards for a Pokemon and returns the combined list.
 * @param {number} pokemonId
 * @returns {Promise<Array<{id: string, name: string, pack: string, imgPath: string}>>}
 */
async function scrapeAllCardsForPokemon(pokemonId) {
  const all = []
  let page = 1

  while (true) {
    const url = `${ARTOFPKM}/pokemon/${pokemonId}/cards${page > 1 ? `?page=${page}` : ''}`
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (!res.ok) break
    const html = await res.text()

    const frameStart = html.indexOf('<turbo-frame')
    if (frameStart === -1) break
    const frame = html.slice(frameStart)

    const cardPattern = /data-lightbox-url="\/sets\/(\d+)\/card\/(\d+)"[^>]+href="(\/rails[^"]+)"[\s\S]*?card-title[^>]*>([\s\S]*?)<\/div>[\s\S]*?card-subtitle[^>]*line-clamp-1[^>]*>([\s\S]*?)<\/div>/g
    let m
    while ((m = cardPattern.exec(frame)) !== null) {
      const [, setId, cardId, imgPath, rawName, rawPack] = m
      all.push({ id: `${setId}-${cardId}`, name: rawName.trim(), pack: rawPack.trim(), imgPath: `${ARTOFPKM}${imgPath}` })
    }

    if (!hasNextPage(pokemonId, page, html)) break
    page++
    await sleep(300)
  }

  return all
}

/**
 * Downloads a card image from artofpkm.com (full URL, already resolved).
 * @param {string} url - Full https://www.artofpkm.com/rails/... URL
 * @returns {Promise<{buffer: ArrayBuffer, ext: string}>}
 */
async function downloadCardImage(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' })
  if (!res.ok) throw new Error(`Image download failed: ${res.status}`)
  const contentType = res.headers.get('content-type') ?? 'image/jpeg'
  const ext = contentType.includes('png') ? 'png' : 'jpg'
  return { buffer: await res.arrayBuffer(), ext }
}

/**
 * Uploads a card image buffer to Cloudflare R2 via the worker, stored as `pkm-cards/{id}.{ext}`.
 * @param {string} cardId - e.g. "581-101"
 * @param {ArrayBuffer} buffer
 * @param {string} ext - "jpg" or "png"
 * @returns {Promise<string>} The public R2 URL.
 */
async function uploadToR2(cardId, buffer, ext) {
  const filename = `${cardId}.${ext}`
  const form = new FormData()
  form.append('file', new Blob([buffer], { type: ext === 'png' ? 'image/png' : 'image/jpeg' }), filename)
  form.append('filename', filename)
  form.append('folder', 'pkm-cards')

  const res = await fetch(WORKER_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${UPLOAD_SECRET}` },
    body: form,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`R2 upload failed (${res.status}): ${text}`)
  }
  return `${R2_BASE}/pkm-cards/${filename}`
}

/**
 * Upserts a single card row into the Supabase `scraped_cards` table.
 * Updates the existing row if the id already exists.
 * @param {string} id
 * @param {number} pokemonId
 * @param {string} name
 * @param {string} pack
 * @param {string} imageUrl
 */
async function upsertCard(id, pokemonId, name, pack, imageUrl) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/scraped_cards`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ id, pokemon_id: pokemonId, name, pack, image_url: imageUrl }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase upsert failed (${res.status}): ${text}`)
  }
}

const BATCH_SIZE = 5

/**
 * Downloads, uploads, and saves a single card. Adds its id to existingIds on success.
 * @param {{id: string, name: string, pack: string, imgPath: string}} card
 * @param {number} pokemonId
 * @param {Set<string>} existingIds
 */
async function processCard(card, pokemonId, existingIds) {
  const { buffer, ext } = await downloadCardImage(card.imgPath)
  const imageUrl = await uploadToR2(card.id, buffer, ext)
  await upsertCard(card.id, pokemonId, card.name, card.pack, imageUrl)
  existingIds.add(card.id)
}

const PROGRESS_FILE = 'seed_cards_progress.json'

/**
 * Loads progress from disk. Returns completed Pokemon IDs and failed card IDs.
 * @returns {{ completedPokemon: Set<number>, failedCards: Map<string, string> }}
 */
function loadProgress() {
  if (!existsSync(PROGRESS_FILE)) return { completedPokemon: new Set(), failedCards: new Map() }
  const data = JSON.parse(readFileSync(PROGRESS_FILE, 'utf8'))
  return {
    completedPokemon: new Set(data.completedPokemon ?? []),
    failedCards: new Map(Object.entries(data.failedCards ?? {})),
  }
}

/**
 * Saves current progress to disk after each Pokemon is processed.
 * @param {Set<number>} completedPokemon
 * @param {Map<string, string>} failedCards
 */
function saveProgress(completedPokemon, failedCards) {
  writeFileSync(PROGRESS_FILE, JSON.stringify({
    completedPokemon: [...completedPokemon],
    failedCards: Object.fromEntries(failedCards),
  }, null, 2))
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { completedPokemon, failedCards } = loadProgress()

  console.log('Loading data from Supabase...')
  const [allPokemon, existingIds] = await Promise.all([getAllPokemon(), getExistingCardIds()])
  console.log(`  Pokemon to process : ${allPokemon.length}`)
  console.log(`  Already completed  : ${completedPokemon.size} Pokemon`)
  console.log(`  Cards already saved: ${existingIds.size}`)
  console.log(`  Previously failed  : ${failedCards.size} cards\n`)

  let totalDone = 0
  let totalFailed = 0
  let totalSkipped = 0

  for (let pi = 0; pi < allPokemon.length; pi++) {
    const { id: pokemonId, name: pokemonName } = allPokemon[pi]

    if (completedPokemon.has(pokemonId)) {
      totalSkipped++
      continue
    }

    process.stdout.write(`[${String(pi + 1).padStart(4)}/${allPokemon.length}] ${pokemonName.padEnd(14)} `)

    let cards
    try {
      cards = await scrapeAllCardsForPokemon(pokemonId)
    } catch (err) {
      console.log(`✗ scrape failed: ${err.message}`)
      totalFailed++
      await sleep(400)
      continue
    }

    const newCards = cards.filter(c => !existingIds.has(c.id))

    if (cards.length === 0) {
      console.log('no cards')
      completedPokemon.add(pokemonId)
      saveProgress(completedPokemon, failedCards)
      continue
    }

    console.log(`${cards.length} cards (${newCards.length} new, ${cards.length - newCards.length} skip)`)

    for (let i = 0; i < newCards.length; i += BATCH_SIZE) {
      const batch = newCards.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(batch.map(c => processCard(c, pokemonId, existingIds)))

      for (let j = 0; j < results.length; j++) {
        const card = batch[j]
        const result = results[j]
        if (result.status === 'fulfilled') {
          console.log(`    ✓ #${card.id}  ${card.name}`)
          failedCards.delete(card.id)
          totalDone++
        } else {
          const reason = result.reason?.message ?? 'unknown error'
          console.log(`    ✗ #${card.id}  ${card.name} — ${reason}`)
          failedCards.set(card.id, reason)
          totalFailed++
        }
      }

      await sleep(150)
    }

    completedPokemon.add(pokemonId)
    saveProgress(completedPokemon, failedCards)
    await sleep(250)
  }

  console.log(`\nDone. ${totalDone} seeded, ${totalFailed} failed, ${totalSkipped} Pokemon skipped.`)

  if (failedCards.size > 0) {
    console.log(`\nFailed cards saved in ${PROGRESS_FILE} — re-run the script to retry them.`)
    failedCards.forEach((reason, id) => console.log(`  ${id}: ${reason}`))
  }
}

main().catch(err => { console.error(err); process.exit(1) })
