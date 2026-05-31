/**
 * seed_packs.js
 *
 * Scrapes all card packs from artofpkm.com/cards, uploads each pack logo
 * to Cloudflare R2, and upserts the record into the Supabase `packs` table.
 *
 * Run:
 *   node --env-file=.env.local seed_packs.js
 *
 * Schema (run in Supabase SQL editor before first run):
 *   create table packs (
 *     id           integer primary key,
 *     name         text    not null,
 *     image_url    text    not null,
 *     card_count   integer,
 *     release_date text
 *   );
 *   alter table packs enable row level security;
 *   create policy "Public read" on packs for select using (true);
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'

const SUPABASE_URL  = process.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const WORKER_URL    = process.env.VITE_WORKER_URL
const UPLOAD_SECRET = process.env.VITE_UPLOAD_SECRET
const R2_BASE       = process.env.VITE_R2_BASE_URL?.replace(/\/$/, '')

const ARTOFPKM = 'https://www.artofpkm.com'
const UA       = 'Mozilla/5.0 (compatible; PackSeeder/1.0)'
const PROGRESS_FILE = 'seed_packs_progress.json'

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
 * Loads progress from disk.
 * @returns {{ completedIds: Set<number>, failedIds: Map<number, string> }}
 */
function loadProgress() {
  if (!existsSync(PROGRESS_FILE)) return { completedIds: new Set(), failedIds: new Map() }
  const data = JSON.parse(readFileSync(PROGRESS_FILE, 'utf8'))
  return {
    completedIds: new Set(data.completedIds ?? []),
    failedIds: new Map(Object.entries(data.failedIds ?? {}).map(([k, v]) => [Number(k), v])),
  }
}

/**
 * Saves progress to disk.
 * @param {Set<number>} completedIds
 * @param {Map<number, string>} failedIds
 */
function saveProgress(completedIds, failedIds) {
  writeFileSync(PROGRESS_FILE, JSON.stringify({
    completedIds: [...completedIds],
    failedIds: Object.fromEntries(failedIds),
  }, null, 2))
}

/**
 * Scrapes the /cards listing page and returns basic info for every pack.
 * @returns {Promise<Array<{id: number, name: string, logoPath: string}>>}
 */
async function scrapePackList() {
  const res = await fetch(`${ARTOFPKM}/cards`, { headers: { 'User-Agent': UA } })
  const html = await res.text()

  // Each pack is an <a href="/sets/{id}"> containing two lazy-loaded images:
  //   1. data-src ending in Tile.jpg  → background art
  //   2. data-src ending in Name.png  → pack logo (what we want)
  const packPattern = /href="(\/sets\/(\d+))"[\s\S]*?<h4[^>]*>([^<]+)<\/h4>/g
  const imgPattern  = /data-src="([^"]+)"/g

  const packs = []
  let m

  while ((m = packPattern.exec(html)) !== null) {
    const [fullMatch, , id, name] = m
    const matchStart = m.index

    // Extract data-src values within this pack's block (up to ~1500 chars)
    const block = html.slice(matchStart, matchStart + 1500)
    imgPattern.lastIndex = 0
    const imgs = []
    let imgMatch
    while ((imgMatch = imgPattern.exec(block)) !== null) imgs.push(imgMatch[1])

    // The logo is the second image (first is the tile background)
    const logoPath = imgs[1] ?? imgs[0] ?? null
    if (!logoPath) continue

    packs.push({ id: Number(id), name: name.trim(), logoPath })
  }

  return packs
}

/**
 * Fetches a pack's detail page and returns its release date and card count.
 * @param {number} id
 * @returns {Promise<{releaseDate: string | null, cardCount: number | null}>}
 */
async function scrapePackDetail(id) {
  const res = await fetch(`${ARTOFPKM}/sets/${id}`, { headers: { 'User-Agent': UA } })
  const html = await res.text()

  // Card count from meta description: "Pack Name: 118 cards | ..."
  const countMatch = html.match(/:?\s*(\d+)\s*cards?\s*[\|,]/i)
  const cardCount = countMatch ? parseInt(countMatch[1]) : null

  // Release date from <span>May. 22, 2026</span>
  const dateMatch = html.match(/<span>((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[^<]+\d{4})<\/span>/)
  const releaseDate = dateMatch ? dateMatch[1].trim() : null

  return { releaseDate, cardCount }
}

/**
 * Downloads a pack logo image from artofpkm.com.
 * @param {string} path - The /rails/active_storage/... path
 * @returns {Promise<{buffer: ArrayBuffer, ext: string}>}
 */
async function downloadImage(path) {
  const res = await fetch(`${ARTOFPKM}${path}`, { headers: { 'User-Agent': UA }, redirect: 'follow' })
  if (!res.ok) throw new Error(`Image download failed: ${res.status}`)
  const contentType = res.headers.get('content-type') ?? 'image/png'
  const ext = contentType.includes('png') ? 'png' : 'jpg'
  return { buffer: await res.arrayBuffer(), ext }
}

/**
 * Uploads a pack logo to Cloudflare R2 via the worker, stored as `packs/{id}.{ext}`.
 * @param {number} id
 * @param {ArrayBuffer} buffer
 * @param {string} ext
 * @returns {Promise<string>} Public R2 URL
 */
async function uploadToR2(id, buffer, ext) {
  const filename = `${id}.${ext}`
  const form = new FormData()
  form.append('file', new Blob([buffer], { type: ext === 'png' ? 'image/png' : 'image/jpeg' }), filename)
  form.append('filename', filename)
  form.append('folder', 'packs')

  const res = await fetch(WORKER_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${UPLOAD_SECRET}` },
    body: form,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`R2 upload failed (${res.status}): ${text}`)
  }
  return `${R2_BASE}/packs/${filename}`
}

/**
 * Upserts a pack row into the Supabase `packs` table.
 * @param {number} id
 * @param {string} name
 * @param {string} imageUrl
 * @param {number | null} cardCount
 * @param {string | null} releaseDate
 */
async function upsertPack(id, name, imageUrl, cardCount, releaseDate) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/packs`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ id, name, image_url: imageUrl, card_count: cardCount, release_date: releaseDate }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase upsert failed (${res.status}): ${text}`)
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { completedIds, failedIds } = loadProgress()

  console.log('Scraping pack list from artofpkm.com/cards...')
  const packs = await scrapePackList()
  console.log(`  Found: ${packs.length} packs`)
  console.log(`  Already completed: ${completedIds.size}`)
  console.log(`  Previously failed: ${failedIds.size}\n`)

  const todo = packs.filter(p => !completedIds.has(p.id))
  console.log(`To process: ${todo.length}\n`)

  let done = 0
  let failed = 0

  for (let i = 0; i < todo.length; i++) {
    const { id, name, logoPath } = todo[i]
    process.stdout.write(`[${String(i + 1).padStart(3)}/${todo.length}] #${id} ${name.substring(0, 30).padEnd(32)} `)

    try {
      const [{ releaseDate, cardCount }, { buffer, ext }] = await Promise.all([
        scrapePackDetail(id),
        downloadImage(logoPath),
      ])

      const imageUrl = await uploadToR2(id, buffer, ext)
      await upsertPack(id, name, imageUrl, cardCount, releaseDate)

      completedIds.add(id)
      failedIds.delete(id)
      saveProgress(completedIds, failedIds)

      console.log(`✓  ${cardCount ?? '?'} cards · ${releaseDate ?? 'no date'}`)
      done++
    } catch (err) {
      console.log(`✗ ${err.message}`)
      failedIds.set(id, err.message)
      saveProgress(completedIds, failedIds)
      failed++
    }

    await sleep(200)
  }

  console.log(`\nDone. ${done} seeded, ${failed} failed.`)
  if (failedIds.size > 0) {
    console.log(`\nFailed packs (check ${PROGRESS_FILE}):`)
    failedIds.forEach((reason, id) => console.log(`  #${id}: ${reason}`))
  }
}

main().catch(err => { console.error(err); process.exit(1) })
