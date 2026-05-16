// ─────────────────────────────────────────────────────────────
// data/cards.ts
//
// This file defines shared types and constants used throughout
// the whole app. Think of it as the "dictionary" — it says what
// a Card object looks like so every other file agrees on the shape.
// ─────────────────────────────────────────────────────────────


// The shape of a single Pokemon card stored in the database.
//
// Example value:
//   { id: 42, name: 'Charizard', pack: 'Genetic Apex', image: 'cards/charizard.webp' }
//
// Every component that works with cards relies on this type.
// If the database ever adds a new column (e.g. "rarity"), you'd
// add it here and TypeScript will tell you everywhere that needs updating.
export interface Card {
  id: number      // unique number from the database, e.g. 1, 2, 3...
  name: string    // display name, e.g. "Pikachu"
  pack: string    // which card set it belongs to, e.g. "Genetic Apex"
  image: string   // the file path inside the R2 bucket, e.g. "cards/pikachu.webp"
}


// The base URL for Cloudflare R2 — the cloud storage where card images live.
//
// Card images are NOT stored in the code or Supabase.
// They live in a Cloudflare R2 bucket (like an S3 bucket).
// To build a full image URL you combine this base + the card's image path:
//
//   `${R2_BASE}/${card.image}`
//   → "https://pub-xxx.r2.dev/cards/charizard.webp"
//
// The actual URL comes from the .env file (VITE_R2_BASE_URL) so it's
// never hardcoded in the source code.
export const R2_BASE = import.meta.env.VITE_R2_BASE_URL as string
