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


// ── Tab labels ────────────────────────────────────────────────

export const TABS = {
  ALL: 'All Cards',
  BINDER: 'My Binder',
} as const


// ── Search & filter bar ───────────────────────────────────────

export const SEARCH = {
  PLACEHOLDER: 'Search cards...',
  ALL_PACKS: 'All packs',
} as const


// ── Card grid empty states ────────────────────────────────────

export const CARD_GRID = {
  EMPTY_SEARCH: 'No cards match your search.',
  EMPTY_BINDER: 'Your binder is empty. Go to All Cards to add some!',
  EMPTY_DEFAULT: 'No cards found.',
} as const


// ── Footer hint text ──────────────────────────────────────────

export const FOOTER = {
  HINT: 'Hold a card to select it, then tap Add to Binder',
} as const


// ── Individual card labels and tooltips ───────────────────────

export const CARD = {
  OWNED: '✓ Owned',
  SELECTED: '+ Selected',
  NOT_OWNED: 'Not owned',
  TOOLTIP_OWNED: 'Already in binder',
  TOOLTIP_DESELECT: 'Click to deselect',
  TOOLTIP_SELECT: 'Click to select',
  TOOLTIP_HOLD: 'Hold to select',
} as const


// ── Action bar (add / remove bar that appears during selection) ───

export const ACTION_BAR = {
  SELECT_PROMPT: 'Select cards',
  ADD: 'Add to Binder',
  REMOVE: 'Remove from Binder',
  ADDING: 'Adding...',
  REMOVING: 'Removing...',
  selectedLabel: (count: number) => `${count} card${count !== 1 ? 's' : ''} selected`,
} as const


// ── Toast notifications ───────────────────────────────────────

export const TOAST = {
  CARD_CREATED: 'Card created ✓',
  CARD_UPDATED: 'Card updated ✓',
  CARD_DELETED: 'Card deleted',
  cardsAdded: (count: number) => `${count} card${count > 1 ? 's' : ''} added to binder ✓`,
  cardsRemoved: (count: number) => `${count} card${count > 1 ? 's' : ''} removed from binder`,
}


// ── Admin panel ───────────────────────────────────────────────

export const ADMIN = {
  TITLE: 'Card Management',
  SUBTITLE: 'Admin',
  SEARCH_PLACEHOLDER: 'Search by name or pack...',
  NEW_CARD: '+ New Card',
} as const


// ── Card create / edit form modal ─────────────────────────────

export const CARD_FORM = {
  TITLE_CREATE: 'New Card',
  TITLE_EDIT: 'Edit Card',
  NAME_LABEL: 'Name',
  NAME_PLACEHOLDER: 'e.g. Charizard',
  PACK_LABEL: 'Pack',
  PACK_PLACEHOLDER: 'e.g. Base Set',
  IMAGE_LABEL: 'Image',
  IMAGE_UPLOAD_HINT: 'Click to upload image',
  IMAGE_CHANGE: 'Change image',
  SAVE: 'Save',
  SAVING: 'Saving...',
  UPLOADING: 'Uploading...',
  CANCEL: 'Cancel',
  ERROR_REQUIRED: 'Name and pack are required.',
  ERROR_IMAGE: 'Please upload an image or provide an image path.',
  ERROR_UPLOAD: 'Image upload failed. Check your connection and try again.',
  ERROR_GENERIC: 'Something went wrong.',
} as const


// ── Delete confirmation dialog ────────────────────────────────

export const DELETE_DIALOG = {
  TITLE: 'Delete card?',
  BODY: 'will be permanently removed.',
  WARNING: "This will also remove it from all users' binders.",
  CONFIRM: 'Delete',
  CONFIRMING: 'Deleting...',
  CANCEL: 'Cancel',
  ERROR_FALLBACK: 'Failed to delete.',
} as const
