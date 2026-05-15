import { useState } from 'react'
import { supabase } from '../lib/supabase'

const DOMAIN = '@pokemon-binder.app'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const email = `${username.toLowerCase().trim()}${DOMAIN}`
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) setError('Invalid username or password')
    setLoading(false)
  }

  return (
    <div className="bg-white min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <p className="text-zinc-400 text-xs uppercase tracking-widest mb-1">Collection</p>
          <h1 className="text-zinc-900 text-2xl font-bold tracking-tight">
            Pokémon Wishlist Binder
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="e.g. xxxx"
              required
              autoComplete="username"
              className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 text-sm
                         text-zinc-800 placeholder:text-zinc-400
                         focus:outline-none focus:border-zinc-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
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
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

      </div>
    </div>
  )
}
