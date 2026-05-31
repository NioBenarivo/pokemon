import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePacks } from '../hooks/usePacks'
import { useAuth } from '../hooks/useAuth'
import Header from '../components/Header'
import { usePackOwnedCounts } from '../hooks/usePackOwnedCounts'
import { usePackWishlistCounts } from '../hooks/usePackWishlistCounts'
import ProgressBar from '../components/ProgressBar'
import { SEARCH_DEBOUNCE_MS } from '../constants/config'
import LoadingScreen from '../components/LoadingScreen'

export default function PacksListPage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const ownedCounts = usePackOwnedCounts(user?.id ?? '')
  const wishlistCounts = usePackWishlistCounts(user?.id ?? '')

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchQuery])

  const { packs, loading } = usePacks(debouncedSearch)

  return (
    <div className="bg-white min-h-screen py-10 px-4 font-sans">
      <div className="max-w-4xl mx-auto">

        <Header title="Packs" onSignOut={signOut} />

        <div className="mb-5">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search packs..."
            className="w-full px-4 py-2 text-sm rounded-xl border border-zinc-200 text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors"
          />
        </div>

        {loading ? (
          <LoadingScreen message="Loading packs..." />
        ) : packs.length === 0 ? (
          <p className="text-center text-zinc-400 text-sm py-16">No packs found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {packs.map(pack => {
              const owned = ownedCounts.get(pack.id) ?? 0
              const wishlisted = wishlistCounts.get(pack.id) ?? 0
              return (
                <button
                  key={pack.id}
                  onClick={() => navigate(`/packs/${pack.id}`)}
                  className="group text-left rounded-2xl overflow-hidden border border-zinc-100 hover:border-zinc-300 hover:shadow-md transition-all duration-200"
                >
                  <div className="bg-zinc-500 h-32 flex items-center justify-center overflow-hidden px-6">
                    <img
                      src={pack.image_url}
                      alt={pack.name}
                      loading="lazy"
                      className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>

                  <div className="px-4 py-3">
                    <p className="text-sm font-semibold text-zinc-800 leading-tight truncate">{pack.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[11px] text-zinc-400">
                        {pack.card_count != null ? `${pack.card_count} cards` : '—'}
                      </span>
                      {pack.release_date && (
                        <span className="text-[11px] text-zinc-400">{pack.release_date}</span>
                      )}
                    </div>
                    {user && wishlisted > 0 && (
                      <p className="text-[11px] text-pink-400 mt-1">♡ {wishlisted} wishlisted</p>
                    )}
                    {user && <ProgressBar owned={owned} total={pack.card_count} />}
                  </div>
                </button>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
