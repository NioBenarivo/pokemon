// ─────────────────────────────────────────────────────────────
// components/Header.tsx
//
// The page title area at the top of the main app.
// Shows the app name and the logged-in user's username.
// Also contains the "Sign out" button in the top-right corner.
//
// The username is derived in App.tsx by splitting the email address
// at the "@" — so "ash@pokemon-binder.app" becomes "ash".
// ─────────────────────────────────────────────────────────────

import { APP, AUTH } from '../constants/strings'

interface Props {
  username: string     // first part of the user's email, used as their display name
  onSignOut: () => void
}

export default function Header({ username, onSignOut }: Props) {
  return (
    <header className="text-center mb-7 relative">
      <p className="text-zinc-400 text-xs uppercase tracking-widest mb-1">{APP.SUBTITLE}</p>
      <h1 className="text-zinc-900 text-2xl font-bold tracking-tight">
        {APP.TITLE}
      </h1>
      <p className="text-zinc-400 text-xs mt-1">{username}'s binder</p>
      <button
        onClick={onSignOut}
        className="absolute right-0 top-0 text-xs text-zinc-400
                   hover:text-zinc-700 transition-colors duration-150"
      >
        {AUTH.SIGN_OUT}
      </button>
    </header>
  )
}
