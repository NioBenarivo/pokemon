import { useState, useEffect } from 'react'
import { useInfiniteCards } from '../hooks/useInfiniteCards'
import { useAuth } from '../hooks/useAuth'
import { useOwnedCards } from '../hooks/useOwnedCards'
import { useToast } from '../hooks/useToast'
import CardLightbox from '../components/CardLightbox'
import Toast from '../components/Toast'
import ProgressBar from '../components/ProgressBar'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'
import { useSearchDebounce } from '../hooks/useSearchDebounce'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import { useCardSelection } from '../hooks/useCardSelection'
import Spinner from '../components/Spinner'
import CardGrid from '../components/CardGrid'

export default function BinderPage() {
  const { user, signOut } = useAuth()
  const { owned, loading: ownedLoading, removeMultiple } = useOwnedCards(user?.id ?? '')
  const { toasts, showToast, removeToast } = useToast()

  const { searchQuery, setSearchQuery, debouncedSearch } = useSearchDebounce()
  const [selectedPack, setSelectedPack] = useState<string | null>(null)
  const { selected, selectMode, lightboxCard, setLightboxCard, clearSelection, handleCardClick, handleCardLongPress } = useCardSelection()
  const [removing, setRemoving] = useState(false)

const { cards, packs, loading, reloading, loadingMore, loadMore } = useInfiniteCards({
    activeTab: 'binder',
    searchQuery: debouncedSearch,
    selectedPack,
    ownedIds: owned,
  })

  const [selectedPackTotal, setSelectedPackTotal] = useState<number | null>(null)
  const [selectedPackOwned, setSelectedPackOwned] = useState(0)
  const ownedKey = [...owned].sort().join(',')

  useEffect(() => {
    if (!selectedPack || owned.size === 0) {
      setSelectedPackTotal(null)
      setSelectedPackOwned(0)
      return
    }

    let cancelled = false

    Promise.all([
      supabase.from('packs').select('card_count').eq('name', selectedPack).single(),
      supabase
        .from('scraped_cards')
        .select('*', { count: 'exact', head: true })
        .eq('pack', selectedPack)
        .in('id', [...owned]),
    ]).then(([packRes, ownedRes]) => {
      if (cancelled) return
      setSelectedPackTotal(packRes.data?.card_count ?? null)
      setSelectedPackOwned(ownedRes.count ?? 0)
    })

    return () => { cancelled = true }
  }, [selectedPack, ownedKey])

  const { setSentinel } = useInfiniteScroll({ loadMore, loading, reloading, loadingMore })

async function handleRemove() {
    if (selected.size === 0) return
    setRemoving(true)
    await removeMultiple([...selected])
    showToast(`${selected.size} card${selected.size > 1 ? 's' : ''} removed from binder`)
    clearSelection()
    setRemoving(false)
  }

  const username = user?.email?.split('@')[0] ?? 'Trainer'

  return (
    <div className="bg-white min-h-screen py-10 px-4 font-sans">
      <div className="max-w-4xl mx-auto">

        <Header title="My Binder" subtitle={`${username} · ${owned.size} cards`} onSignOut={signOut} />

        {/* Search + Pack filter */}
        <div className="flex flex-wrap gap-2 mb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search your cards..."
            className="flex-1 min-w-[160px] px-4 py-2 text-sm rounded-xl border border-zinc-200 text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors"
          />
          {packs.length > 0 && (
            <select
              value={selectedPack ?? ''}
              onChange={e => setSelectedPack(e.target.value || null)}
              className="appearance-none px-4 py-2 text-sm rounded-xl border border-zinc-200 text-zinc-600 focus:outline-none focus:border-zinc-400 transition-colors bg-white"
            >
              <option value="">All packs</option>
              {packs.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
        </div>

        {selectedPack && selectedPackTotal && (
          <div className="mb-5">
            <ProgressBar owned={selectedPackOwned} total={selectedPackTotal} />
          </div>
        )}

        {/* Action bar */}
        {selectMode && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 bg-white rounded-2xl shadow-xl border border-zinc-100 whitespace-nowrap">
            <span className="text-sm text-zinc-500 pr-1">
              {selected.size} selected
            </span>
            <button
              onClick={clearSelection}
              className="text-xs text-zinc-400 hover:text-zinc-700 px-3 py-1.5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRemove}
              disabled={removing}
              className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              {removing ? 'Removing...' : 'Remove from Binder'}
            </button>
          </div>
        )}

        {/* Grid */}
        {ownedLoading || loading || reloading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-zinc-400 text-sm">
              {debouncedSearch || selectedPack
                ? 'No cards match your search.'
                : "Your binder is empty. Browse Pokémon or Cards to add some!"}
            </p>
          </div>
        ) : (
          <CardGrid
            cards={cards}
            owned={owned}
            selected={selected}
            selectMode={selectMode}
            removeMode
            onCardClick={handleCardClick}
            onCardLongPress={handleCardLongPress}
          />
        )}

        <div ref={setSentinel} className="h-1" />

        {loadingMore && (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        )}

      </div>

      {lightboxCard && (
        <CardLightbox
          card={lightboxCard}
          onClose={() => setLightboxCard(null)}
          isOwned={owned.has(lightboxCard.id)}
        />
      )}

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
