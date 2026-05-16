// ─────────────────────────────────────────────────────────────
// lib/cardsCache.ts
//
// A simple localStorage cache for the full list of cards.
//
// WHY cache at all?
//   The admin page loads ALL cards every time it opens. Without a cache,
//   every page visit hits the database unnecessarily. localStorage persists
//   across page refreshes, so the next visit can be instant.
//
// WHY expire after 24 hours?
//   If an admin adds or edits a card, the old cached list would show stale
//   data. After 24 hours we force a fresh fetch. The admin CRUD operations
//   also call clearCardsCache() immediately so changes show up right away.
//
// NOTE: This cache is only used by the older useCards hook (admin page).
//       The main user-facing page uses useInfiniteCards which has its own
//       in-memory cache (no localStorage involved).
// ─────────────────────────────────────────────────────────────

import type { Card } from '../data/cards'
import { CACHE_KEY, CACHE_TTL_MS } from '../constants/config'


// What we actually store in localStorage.
// We save the cards array AND the timestamp so we can check if it's expired.
interface Cache {
  cards: Card[]
  cachedAt: number  // Date.now() value — milliseconds since Jan 1 1970
}


// Reads cards from localStorage.
// Returns the cards array if the cache exists and is not expired.
// Returns null if there's no cache, it's expired, or it's corrupted.
//
// Example:
//   const cached = getCachedCards()
//   if (cached) {
//     // use cached data — no network call needed
//   } else {
//     // fetch from Supabase
//   }
export function getCachedCards(): Card[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null  // nothing stored yet

    const { cards, cachedAt }: Cache = JSON.parse(raw)

    // Check if the cache is older than 24 hours
    if (Date.now() - cachedAt > CACHE_TTL_MS) return null

    return cards
  } catch {
    // If JSON.parse fails (corrupted data), pretend there's no cache
    return null
  }
}


// Saves cards to localStorage along with the current timestamp.
// Called after a successful Supabase fetch.
export function setCachedCards(cards: Card[]): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ cards, cachedAt: Date.now() }))
}


// Removes the cache entry entirely.
// Called after any admin create/update/delete so the next page load
// fetches fresh data rather than showing stale cards.
export function clearCardsCache(): void {
  localStorage.removeItem(CACHE_KEY)
}
