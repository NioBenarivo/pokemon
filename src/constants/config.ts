// ─────────────────────────────────────────────────────────────
// constants/config.ts
//
// All magic numbers and configuration keys used across the app.
// Centralising them here means you only need to change a value
// in one place if you ever want to tune behaviour.
// ─────────────────────────────────────────────────────────────


// How long (ms) the user must hold a card before it counts as a long press.
// Used by PokemonCard to enter selection mode.
export const LONG_PRESS_MS = 500

// How many cards are fetched per page in the infinite scroll list.
export const PAGE_SIZE = 12

// localStorage key for the cached card list (admin page).
// The "v1" suffix means: bump it to "v2" if the cache structure ever changes,
// so old cached data is automatically ignored.
export const CACHE_KEY = 'pokeBinder_cards_v1'

// How long (ms) the localStorage cache stays valid before a fresh fetch is needed.
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

// How long (ms) a toast notification stays on screen before auto-dismissing.
export const TOAST_DURATION_MS = 3000

// How long (ms) to wait after the user stops typing before firing a search query.
// Prevents a database request on every single keystroke.
export const SEARCH_DEBOUNCE_MS = 350

// How far from the bottom of the page (px) to trigger the next infinite scroll load.
// '300px' means the next page starts fetching before the user actually hits the bottom.
export const SCROLL_ROOT_MARGIN = '300px'

// The domain appended to usernames to form a valid Supabase email.
// e.g. username "ash" → email "ash@pokemon-binder.app"
export const EMAIL_DOMAIN = '@pokemon-binder.app'
