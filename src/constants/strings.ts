// ─────────────────────────────────────────────────────────────
// constants/strings.ts
//
// All user-facing text in the app, grouped by feature area.
// Keeping text here makes it easy to find, edit, or translate
// without hunting through individual component files.
// ─────────────────────────────────────────────────────────────


// ── App-wide ─────────────────────────────────────────────────

export const APP = {
  TITLE: 'Pokémon Wishlist Binder',
  SUBTITLE: 'Collection',
  DEFAULT_USERNAME: 'Trainer',
} as const


// ── Loading screens ───────────────────────────────────────────

export const LOADING = {
  AUTH: 'Loading...',
  CARDS: 'Loading cards...',
} as const


// ── Login page ────────────────────────────────────────────────

export const AUTH = {
  SIGN_IN: 'Sign In',
  SIGNING_IN: 'Signing in...',
  SIGN_OUT: 'Sign out',
  USERNAME_LABEL: 'Username',
  USERNAME_PLACEHOLDER: 'e.g. xxxx',
  PASSWORD_LABEL: 'Password',
  PASSWORD_PLACEHOLDER: '••••••••',
  INVALID_CREDENTIALS: 'Invalid username or password',
} as const





// ── Toast notifications ───────────────────────────────────────

export const TOAST = {
  CARD_CREATED: 'Card created ✓',
  CARD_UPDATED: 'Card updated ✓',
  CARD_DELETED: 'Card deleted',
  cardsAdded: (count: number) => `${count} card${count > 1 ? 's' : ''} added to binder ✓`,
  cardsRemoved: (count: number) => `${count} card${count > 1 ? 's' : ''} removed from binder`,
}


