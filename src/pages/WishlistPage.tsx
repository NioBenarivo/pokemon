import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import Header from '../components/Header'
import { useOwnedCards } from '../hooks/useOwnedCards'
import { useWishlist } from '../hooks/useWishlist'
import { useToast } from '../hooks/useToast'
import CardLightbox from '../components/CardLightbox'
import Toast from '../components/Toast'
import { useSearchDebounce } from '../hooks/useSearchDebounce'
import { useCardSelection } from '../hooks/useCardSelection'
import { useInfiniteWishlistCards } from '../hooks/useInfiniteWishlistCards'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import Spinner from '../components/Spinner'
import CardGrid from '../components/CardGrid'

export default function WishlistPage() {
  const { user, signOut } = useAuth()
  const { owned, addMultiple } = useOwnedCards(user?.id ?? '')
  const { wishlist, loading: wishlistLoading, removeFromWishlist } = useWishlist(user?.id ?? '')
  const { toasts, showToast, removeToast } = useToast()

  const { searchQuery, setSearchQuery, debouncedSearch } = useSearchDebounce()
  const [selectedPack, setSelectedPack] = useState<string | null>(null)
  const { selected, selectMode, lightboxCard, setLightboxCard, clearSelection, handleCardClick, handleCardLongPress } = useCardSelection()
  const [acting, setActing] = useState(false)

  const { cards, packs, loading, reloading, loadingMore, loadMore } = useInfiniteWishlistCards({
    wishlistIds: wishlist,
    searchQuery: debouncedSearch,
    selectedPack,
  })

  const { setSentinel } = useInfiniteScroll({ loadMore, loading, reloading, loadingMore })

  async function handleAddToBinder() {
    if (selected.size === 0) return
    setActing(true)
    const ids = [...selected]
    const ok = await addMultiple(ids)
    if (ok) await removeFromWishlist(ids)
    showToast(`${ids.length} card${ids.length > 1 ? 's' : ''} added to binder ✓`)
    clearSelection()
    setActing(false)
  }

  async function handleRemoveFromWishlist() {
    if (selected.size === 0) return
    setActing(true)
    await removeFromWishlist([...selected])
    showToast(`${selected.size} card${selected.size > 1 ? 's' : ''} removed from wishlist`)
    clearSelection()
    setActing(false)
  }

  return (
    <div className="bg-white min-h-screen py-10 px-4 font-sans">
      <div className="max-w-4xl mx-auto">

        <Header
          title="Wishlist"
          subtitle={selectedPack ? `${cards.length} card${cards.length !== 1 ? 's' : ''} in ${selectedPack}` : `${wishlist.size} cards`}
          onSignOut={signOut}
        />

        <div className="flex flex-wrap gap-2 mb-5">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search wishlist..."
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
              onClick={handleRemoveFromWishlist}
              disabled={acting}
              className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              {acting ? 'Removing...' : 'Remove'}
            </button>
            <button
              onClick={handleAddToBinder}
              disabled={acting}
              className="text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-700 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              {acting ? 'Adding...' : 'Add to Binder'}
            </button>
          </div>
        )}

        {wishlistLoading || loading || reloading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : wishlist.size === 0 ? (
          <p className="text-center text-zinc-400 text-sm py-16">
            Your wishlist is empty. Browse cards or Pokémon to add some!
          </p>
        ) : cards.length === 0 ? (
          <p className="text-center text-zinc-400 text-sm py-16">No cards match your search.</p>
        ) : (
          <CardGrid
            cards={cards}
            owned={owned}
            selected={selected}
            selectMode={selectMode}
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
          isOwned={user ? owned.has(lightboxCard.id) : undefined}
          isWishlisted={user ? wishlist.has(lightboxCard.id) : undefined}
          onAddToBinder={user ? async () => {
            const ok = await addMultiple([lightboxCard.id])
            if (ok) await removeFromWishlist([lightboxCard.id])
            showToast('Added to binder ✓')
          } : undefined}
          onToggleWishlist={user ? () => removeFromWishlist([lightboxCard.id]) : undefined}
        />
      )}

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
