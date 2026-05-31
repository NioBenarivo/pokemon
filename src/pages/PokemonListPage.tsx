import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePokemon } from '../hooks/usePokemon'
import { useAuth } from '../hooks/useAuth'
import { SEARCH_DEBOUNCE_MS, SCROLL_ROOT_MARGIN } from '../constants/config'
import LoadingScreen from '../components/LoadingScreen'
import Spinner from '../components/Spinner'
import Header from '../components/Header'

export default function PokemonListPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchQuery])

  const { pokemon, loading, loadingMore, hasMore, loadMore } = usePokemon(debouncedSearch)

  const loadMoreRef = useRef(loadMore)
  loadMoreRef.current = loadMore

  useEffect(() => {
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMoreRef.current() },
      { rootMargin: SCROLL_ROOT_MARGIN }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [sentinel])

  const username = user?.email?.split('@')[0] ?? 'Trainer'

  return (
    <div className="bg-white min-h-screen py-10 px-4 font-sans">
      <div className="max-w-4xl mx-auto">

        <Header title="Pokédex" subtitle={`Hi, ${username}`} onSignOut={signOut} />

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search Pokémon..."
            className="w-full px-4 py-2 text-sm rounded-xl border border-zinc-200 text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors"
          />
        </div>

        {/* Grid */}
        {loading ? (
          <LoadingScreen message="Loading Pokémon..." />
        ) : pokemon.length === 0 ? (
          <p className="text-center text-zinc-400 text-sm py-16">No Pokémon found.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {pokemon.map(p => (
              <button
                key={p.id}
                onClick={() => navigate(`/pokemon/${p.id}`)}
                className="group flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-zinc-50 transition-colors"
              >
                <div className="w-full aspect-square bg-zinc-100 rounded-xl overflow-hidden flex items-center justify-center">
                  <img
                    src={p.image_url}
                    alt={p.name}
                    loading="lazy"
                    className="w-full h-full object-contain p-1 group-hover:scale-110 transition-transform duration-200"
                  />
                </div>
                <span className="text-[11px] font-medium text-zinc-700 text-center leading-tight truncate w-full">
                  {p.name}
                </span>
                <span className="text-[9px] text-zinc-400 font-mono">#{String(p.id).padStart(4, '0')}</span>
              </button>
            ))}
          </div>
        )}

        <div ref={setSentinel} className="h-1" />

        {loadingMore && (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        )}

      </div>
    </div>
  )
}
