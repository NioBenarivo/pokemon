// ─────────────────────────────────────────────────────────────
// pages/LoginPage.tsx
//
// The sign-in screen shown to users who aren't logged in.
//
// This app uses a "username + password" login that's built on top
// of Supabase's email/password auth. Because Supabase requires an
// email address, we append a fixed domain to whatever username the
// user types:
//
//   username "ash"  →  email "ash@pokemon-binder.app"
//
// The domain is fake/internal — users never see it or use it as a
// real email. It's just a convention to make Supabase happy.
//
// After a successful login, Supabase stores the session in the browser.
// useAuth's onAuthStateChange listener fires, sets the user in state,
// and App.tsx re-renders to show the main app.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { APP, AUTH } from '../constants/strings'
import { EMAIL_DOMAIN } from '../constants/config'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const email = `${username.toLowerCase().trim()}${EMAIL_DOMAIN}`
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) setError(AUTH.INVALID_CREDENTIALS)
    setLoading(false)
  }

  return (
    <div className="bg-white min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <p className="text-zinc-400 text-xs uppercase tracking-widest mb-1">{APP.SUBTITLE}</p>
          <h1 className="text-zinc-900 text-2xl font-bold tracking-tight">
            {APP.TITLE}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">
              {AUTH.USERNAME_LABEL}
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder={AUTH.USERNAME_PLACEHOLDER}
              required
              autoComplete="username"
              className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 text-sm
                         text-zinc-800 placeholder:text-zinc-400
                         focus:outline-none focus:border-zinc-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">
              {AUTH.PASSWORD_LABEL}
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={AUTH.PASSWORD_PLACEHOLDER}
              required
              autoComplete="current-password"
              className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 text-sm
                         text-zinc-800 placeholder:text-zinc-400
                         focus:outline-none focus:border-zinc-400 transition-colors"
            />
          </div>

          {error && (
            <p className="text-red-500 text-xs">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-zinc-900 text-white text-sm font-medium
                       hover:bg-zinc-700 disabled:opacity-40 transition-colors duration-150"
          >
            {loading ? AUTH.SIGNING_IN : AUTH.SIGN_IN}
          </button>
        </form>

      </div>
    </div>
  )
}
