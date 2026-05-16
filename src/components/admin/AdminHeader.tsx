// ─────────────────────────────────────────────────────────────
// components/admin/AdminHeader.tsx
//
// The top header for the admin panel.
// Shows the "Card Management" title and a Sign out button.
// Identical in purpose to the main Header component, but with
// different styling to suit the admin layout.
// ─────────────────────────────────────────────────────────────

import { ADMIN, AUTH } from '../../constants/strings'

interface Props {
  onSignOut: () => void
}

export default function AdminHeader({ onSignOut }: Props) {
  return (
    <header className="flex items-center justify-between mb-8">
      <div>
        <p className="text-zinc-400 text-xs uppercase tracking-widest mb-1">{ADMIN.SUBTITLE}</p>
        <h1 className="text-zinc-900 text-2xl font-bold tracking-tight">{ADMIN.TITLE}</h1>
      </div>
      <button
        onClick={onSignOut}
        className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
      >
        {AUTH.SIGN_OUT}
      </button>
    </header>
  )
}
