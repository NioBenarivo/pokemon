/**
 * Fetches one pack page and prints a relevant HTML snippet for debugging.
 * Run: node --env-file=.env.local debug_pack_html.js <packId>
 * Example: node --env-file=.env.local debug_pack_html.js 7
 */

const packId = process.argv[2] ?? '7'
const UA = 'Mozilla/5.0 (compatible; PackCardSeeder/1.0)'
const ARTOFPKM = 'https://www.artofpkm.com'

const res = await fetch(`${ARTOFPKM}/sets/${packId}`, { headers: { 'User-Agent': UA } })
const html = await res.text()

console.log(`\n=== Status: ${res.status} ===`)
console.log(`=== Total HTML length: ${html.length} ===\n`)

// Check for turbo-frame
const frameIdx = html.indexOf('<turbo-frame')
console.log(`turbo-frame found: ${frameIdx !== -1} (at index ${frameIdx})`)

// Print first 3000 chars of the turbo-frame if it exists, otherwise the middle of the page
const snippet = frameIdx !== -1
  ? html.slice(frameIdx, frameIdx + 3000)
  : html.slice(Math.floor(html.length / 3), Math.floor(html.length / 3) + 3000)

console.log('\n=== HTML snippet ===\n')
console.log(snippet)
