/**
 * seed_cards_from_packs.js
 *
 * For every pack in the Supabase `packs` table, scrapes all cards from
 * artofpkm.com/sets/{id}, uploads each card image to Cloudflare R2, and
 * upserts the record into the `scraped_cards` table.
 *
 * Complements seed_cards.js (which seeds via Pokemon pages). This script
 * picks up trainer, energy, and item cards that don't appear on any Pokemon page.
 * Cards already in the DB are skipped — existing pokemon_id values are preserved.
 *
 * Run:
 *   node --env-file=.env.local seed_cards_from_packs.js
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'

const SUPABASE_URL  = process.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const WORKER_URL    = process.env.VITE_WORKER_URL
const UPLOAD_SECRET = process.env.VITE_UPLOAD_SECRET
const R2_BASE       = process.env.VITE_R2_BASE_URL?.replace(/\/$/, '')

const ARTOFPKM      = 'https://www.artofpkm.com'
const UA            = 'Mozilla/5.0 (compatible; PackCardSeeder/1.0)'
const PROGRESS_FILE = 'seed_cards_from_packs_progress.json'
const BATCH_SIZE    = 5

// ── Validation ────────────────────────────────────────────────────────────────

const missing = ['VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'VITE_WORKER_URL', 'VITE_UPLOAD_SECRET', 'VITE_R2_BASE_URL']
  .filter(k => !process.env[k])
if (missing.length) {
  console.error('Missing env vars:', missing.join(', '))
  process.exit(1)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function loadProgress() {
  if (!existsSync(PROGRESS_FILE)) return { completedPacks: new Set(), failedCards: new Map() }
  const data = JSON.parse(readFileSync(PROGRESS_FILE, 'utf8'))
  return {
    completedPacks: new Set(data.completedPacks ?? []),
    failedCards: new Map(Object.entries(data.failedCards ?? {})),
  }
}

function saveProgress(completedPacks, failedCards) {
  writeFileSync(PROGRESS_FILE, JSON.stringify({
    completedPacks: [...completedPacks],
    failedCards: Object.fromEntries(failedCards),
  }, null, 2))
}

async function getAllPacks() {
  const all = []
  const PAGE_SIZE = 1000
  let from = 0

  while (true) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/packs?select=id,name&order=id.asc`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Range: `${from}-${from + PAGE_SIZE - 1}`,
        'Range-Unit': 'items',
      },
    })
    if (!res.ok) throw new Error(`Failed to fetch packs: ${res.status}`)
    const rows = await res.json()
    all.push(...rows)
    if (rows.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return all
}

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
 * Scrapes all cards from a pack's page, handling pagination.
 * Pack pages may or may not use a turbo-frame — we try the frame first,
 * then fall back to the full page HTML.
 * @param {number} packId
 * @returns {Promise<Array<{id: string, name: string, imgPath: string}>>}
 */
async function scrapeAllCardsForPack(packId) {
  const all = []
  let page = 1

  while (true) {
    const url = `${ARTOFPKM}/sets/${packId}${page > 1 ? `?page=${page}` : ''}`
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (!res.ok) break
    const html = await res.text()

    // Try turbo-frame first (same as Pokemon pages), fall back to full HTML
    const frameStart = html.indexOf('<turbo-frame')
    const content = frameStart !== -1 ? html.slice(frameStart) : html

    // Each card is an <a> tag with data-lightbox-url, data-lightbox-title, and href.
    // Attributes are not in a fixed order so we match the whole opening tag first,
    // then extract individual attributes from it.
    const anchorPattern = /<a\s[^>]*data-lightbox-url="\/sets\/(\d+)\/card\/(\d+)"[^>]*>/g
    const pageBefore = all.length
    let m
    while ((m = anchorPattern.exec(content)) !== null) {
      const [fullTag, setId, cardId] = m
      const titleMatch = fullTag.match(/data-lightbox-title="([^"]+)"/)
      const hrefMatch = fullTag.match(/href="(\/rails[^"]+)"/)
      if (!titleMatch || !hrefMatch) continue
      all.push({
        id: `${setId}-${cardId}`,
        name: titleMatch[1],
        imgPath: `${ARTOFPKM}${hrefMatch[1]}`,
      })
    }

    const pageCount = all.length - pageBefore
    if (pageCount === 0) break
    if (!html.includes(`/sets/${packId}?page=${page + 1}`)) break
    page++
    await sleep(300)
  }

  return all
}

async function downloadCardImage(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' })
  if (!res.ok) throw new Error(`Image download failed: ${res.status}`)
  const contentType = res.headers.get('content-type') ?? 'image/jpeg'
  const ext = contentType.includes('png') ? 'png' : 'jpg'
  return { buffer: await res.arrayBuffer(), ext }
}

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

async function upsertCard(id, packId, packName, name, imageUrl) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/scraped_cards`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ id, pack_id: packId, pack: packName, name, image_url: imageUrl }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase upsert failed (${res.status}): ${text}`)
  }
}

async function processCard(card, packId, packName, existingIds) {
  const { buffer, ext } = await downloadCardImage(card.imgPath)
  const imageUrl = await uploadToR2(card.id, buffer, ext)
  await upsertCard(card.id, packId, packName, card.name, imageUrl)
  existingIds.add(card.id)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { completedPacks, failedCards } = loadProgress()

  console.log('Loading data from Supabase...')
  const [allPacks, existingIds] = await Promise.all([getAllPacks(), getExistingCardIds()])
  console.log(`  Packs to process   : ${allPacks.length}`)
  console.log(`  Already completed  : ${completedPacks.size} packs`)
  console.log(`  Cards already saved: ${existingIds.size}`)
  console.log(`  Previously failed  : ${failedCards.size} cards\n`)

  let totalDone = 0
  let totalFailed = 0
  let totalSkipped = 0

  for (let pi = 0; pi < allPacks.length; pi++) {
    const { id: packId, name: packName } = allPacks[pi]

    if (completedPacks.has(packId)) {
      totalSkipped++
      continue
    }

    process.stdout.write(`[${String(pi + 1).padStart(3)}/${allPacks.length}] #${String(packId).padStart(4)} ${packName.substring(0, 26).padEnd(28)} `)

    let cards
    try {
      cards = await scrapeAllCardsForPack(packId)
    } catch (err) {
      console.log(`✗ scrape failed: ${err.message}`)
      totalFailed++
      await sleep(400)
      continue
    }

    const newCards = cards.filter(c => !existingIds.has(c.id))

    if (cards.length === 0) {
      console.log('no cards found')
      completedPacks.add(packId)
      saveProgress(completedPacks, failedCards)
      continue
    }

    console.log(`${cards.length} cards (${newCards.length} new, ${cards.length - newCards.length} skip)`)

    for (let i = 0; i < newCards.length; i += BATCH_SIZE) {
      const batch = newCards.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(batch.map(c => processCard(c, packId, packName, existingIds)))

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

    completedPacks.add(packId)
    saveProgress(completedPacks, failedCards)
    await sleep(250)
  }

  console.log(`\nDone. ${totalDone} seeded, ${totalFailed} failed, ${totalSkipped} packs skipped.`)

  if (failedCards.size > 0) {
    console.log(`\nFailed cards saved in ${PROGRESS_FILE} — re-run the script to retry them.`)
    failedCards.forEach((reason, id) => console.log(`  ${id}: ${reason}`))
  }
}

main().catch(err => { console.error(err); process.exit(1) })
