/**
 * seed_pokemon.js
 *
 * Scrapes all Pokemon from artofpkm.com, uploads each PNG to Cloudflare R2
 * via the existing worker, then upserts the record into the Supabase `pokemon` table.
 *
 * Run:
 *   node --env-file=.env.local seed_pokemon.js
 *
 * Required env vars (add to .env.local):
 *   VITE_SUPABASE_URL        — already present
 *   SUPABASE_SERVICE_ROLE_KEY — get from Supabase dashboard → Settings → API
 *   VITE_WORKER_URL          — already present
 *   VITE_UPLOAD_SECRET       — already present
 *   VITE_R2_BASE_URL         — already present
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const WORKER_URL   = process.env.VITE_WORKER_URL
const UPLOAD_SECRET = process.env.VITE_UPLOAD_SECRET
const R2_BASE      = process.env.VITE_R2_BASE_URL?.replace(/\/$/, '')

const ARTOFPKM = 'https://www.artofpkm.com'
const UA = 'Mozilla/5.0 (compatible; PokemonSeeder/1.0)'

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
 * Fetches one page of Pokemon from artofpkm.com and parses each card's id, name, and image path.
 * @param {number} page
 * @returns {Promise<Array<{id: number, name: string, srcPath: string}>>}
 */
async function scrapePage(page) {
  const res = await fetch(`${ARTOFPKM}/pokemon?page=${page}`, { headers: { 'User-Agent': UA } })
  const html = await res.text()

  const pattern = /<a[^>]+href="(\/pokemon\/\d+)"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*>[\s\S]*?<h4[^>]*>([^<]+)<\/h4>/g
  const results = []
  let m
  while ((m = pattern.exec(html)) !== null) {
    const id = parseInt(m[1].split('/').pop())
    results.push({ id, name: m[3].trim(), srcPath: m[2] })
  }
  return results
}

/**
 * Downloads a Pokemon image from artofpkm.com, following any redirects to the CDN.
 * @param {string} path - The `/rails/active_storage/...` path from the scraped HTML.
 * @returns {Promise<ArrayBuffer>}
 */
async function downloadImage(path) {
  const res = await fetch(`${ARTOFPKM}${path}`, {
    headers: { 'User-Agent': UA },
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`Image download failed: ${res.status}`)
  return res.arrayBuffer()
}

/**
 * Uploads a PNG image buffer to Cloudflare R2 via the worker, stored as `pokemon/{id}.png`.
 * @param {number} id - Pokemon national dex number, used as the filename.
 * @param {ArrayBuffer} imageBuffer
 * @returns {Promise<string>} The public R2 URL of the uploaded image.
 */
async function uploadToR2(id, imageBuffer) {
  const form = new FormData()
  form.append('file', new Blob([imageBuffer], { type: 'image/png' }), `${id}.png`)
  form.append('filename', `${id}.png`)
  form.append('folder', 'pokemon')

  const res = await fetch(WORKER_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${UPLOAD_SECRET}` },
    body: form,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`R2 upload failed (${res.status}): ${text}`)
  }
  return `${R2_BASE}/pokemon/${id}.png`
}

/**
 * Upserts a Pokemon row into the Supabase `pokemon` table using the service role key.
 * Updates the row if the id already exists instead of erroring.
 * @param {number} id
 * @param {string} name
 * @param {string} imageUrl - The public R2 URL.
 */
async function upsertPokemon(id, name, imageUrl) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/pokemon`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ id, name, image_url: imageUrl }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase upsert failed (${res.status}): ${text}`)
  }
}

/**
 * Returns the set of Pokemon IDs already saved in Supabase.
 * Paginates in batches of 1000 to work around Supabase's default row limit.
 * @returns {Promise<Set<number>>}
 */
async function getExistingIds() {
  const ids = new Set()
  const PAGE_SIZE = 1000
  let from = 0

  while (true) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/pokemon?select=id`, {
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

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Fetching existing Pokemon from Supabase...')
  const existing = await getExistingIds()
  console.log(`  Already seeded: ${existing.size} Pokemon`)

  // ── Scrape all pages ────────────────────────────────────────────────────────
  const allPokemon = []
  let page = 1
  console.log('\nScraping artofpkm.com...')
  while (true) {
    process.stdout.write(`  Page ${page}... `)
    const batch = await scrapePage(page)
    if (batch.length === 0) { console.log('empty — done.'); break }
    console.log(`${batch.length} pokemon`)
    allPokemon.push(...batch)
    page++
    await sleep(350)
  }
  console.log(`\nTotal scraped: ${allPokemon.length} Pokemon`)

  // ── Process each Pokemon ────────────────────────────────────────────────────
  const todo = allPokemon.filter(p => !existing.has(p.id))
  console.log(`To process: ${todo.length} (skipping ${allPokemon.length - todo.length} already done)\n`)

  let done = 0
  let failed = 0

  for (const { id, name, srcPath } of todo) {
    process.stdout.write(`  [${String(done + failed + 1).padStart(3)}/${todo.length}] #${String(id).padStart(4)} ${name.padEnd(16)} `)
    try {
      const buffer = await downloadImage(srcPath)
      await sleep(80)
      const imageUrl = await uploadToR2(id, buffer)
      await upsertPokemon(id, name, imageUrl)
      console.log(`✓ ${imageUrl}`)
      done++
    } catch (err) {
      console.log(`✗ ${err.message}`)
      failed++
    }
    await sleep(120)
  }

  console.log(`\nDone. ${done} seeded, ${failed} failed, ${existing.size} skipped.`)
}

main().catch(err => { console.error(err); process.exit(1) })
