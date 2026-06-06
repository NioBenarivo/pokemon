import { useState } from 'react'
import { useInfiniteCards } from '../hooks/useInfiniteCards'
import { useAuth } from '../hooks/useAuth'
import Header from '../components/Header'
import { useOwnedCards } from '../hooks/useOwnedCards'
import { useWishlist } from '../hooks/useWishlist'
import { useToast } from '../hooks/useToast'
import SelectActionBar from '../components/SelectActionBar'
import CardLightbox from '../components/CardLightbox'
import Toast from '../components/Toast'
import { useSearchDebounce } from '../hooks/useSearchDebounce'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import { useCardSelection } from '../hooks/useCardSelection'
import Spinner from '../components/Spinner'
import CardGrid from '../components/CardGrid'
import { useBinders } from '../hooks/useBinders'
import BinderPickerModal from '../components/BinderPickerModal'
import type { Card } from '../data/cards'

export default function CardsPage() {
  const { user, signOut } = useAuth()
  const { owned, addMultiple } = useOwnedCards(user?.id ?? '')
  const { wishlist, addToWishlist, removeFromWishlist } = useWishlist(user?.id ?? '')
  const { toasts, showToast, removeToast } = useToast()

  const { searchQuery, setSearchQuery, debouncedSearch } = useSearchDebounce()
  const { binders } = useBinders(user?.id ?? '')
  const { selected, selectMode, lightboxCard, setLightboxCard, clearSelection, handleCardClick, handleCardLongPress } = useCardSelection(owned)
  const [adding, setAdding] = useState(false)
  const [pickerCardIds, setPickerCardIds] = useState<string[] | null>(null)
const { cards, loading, reloading, loadingMore, loadMore } = useInfiniteCards({
    activeTab: 'all',
    searchQuery: debouncedSearch,
    selectedPack: null,
    ownedIds: owned,
  })

  const { setSentinel } = useInfiniteScroll({ loadMore, loading, reloading, loadingMore })

  function handleAdd() {
    if (selected.size === 0) return
    setPickerCardIds([...selected])
  }

  async function handleBinderSelected(binderId: string) {
    if (!pickerCardIds) return
    const ids = pickerCardIds
    setPickerCardIds(null)
    setAdding(true)
    const ok = await addMultiple(ids, binderId)
    if (ok) {
      const wishlisted = ids.filter(id => wishlist.has(id))
      if (wishlisted.length) await removeFromWishlist(wishlisted)
    }
    showToast(`${ids.length} card${ids.length > 1 ? 's' : ''} added to binder ✓`)
    clearSelection()
    setAdding(false)
  }

  async function handleAddToWishlist() {
    if (selected.size === 0) return
    setAdding(true)
    const toAdd = [...selected].filter(id => !wishlist.has(id))
    if (toAdd.length > 0) await addToWishlist(toAdd)
    showToast(toAdd.length > 0
      ? `${toAdd.length} card${toAdd.length > 1 ? 's' : ''} added to wishlist ✓`
      : 'Already in wishlist'
    )
    clearSelection()
    setAdding(false)
  }

  return (
    <div className="bg-white min-h-screen py-10 px-4 font-sans">
      <div className="max-w-4xl mx-auto">

        <Header title="All Cards" onSignOut={signOut} />

        <div className="mb-5">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search cards..."
            className="w-full px-4 py-2 text-sm rounded-xl border border-zinc-200 text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors"
          />
        </div>

        {selectMode && (
          <SelectActionBar
            count={selected.size}
            adding={adding}
            onCancel={clearSelection}
            onWishlist={handleAddToWishlist}
            onAddToBinder={handleAdd}
          />
        )}

        {loading || reloading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : cards.length === 0 ? (
          <p className="text-center text-zinc-400 text-sm py-16">No cards found.</p>
        ) : (
          <CardGrid
            cards={cards}
            owned={owned}
            selected={selected}
            selectMode={selectMode}
            wishlist={wishlist}
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
          onAddToBinder={user && !owned.has(lightboxCard.id) ? () => setPickerCardIds([lightboxCard.id]) : undefined}
          onToggleWishlist={user ? () =>
            wishlist.has(lightboxCard.id)
              ? removeFromWishlist([lightboxCard.id])
              : addToWishlist([lightboxCard.id])
          : undefined}
        />
      )}

      <Toast toasts={toasts} onRemove={removeToast} />

      {pickerCardIds && (
        <BinderPickerModal
          binders={binders}
          onSelect={handleBinderSelected}
          onClose={() => setPickerCardIds(null)}
        />
      )}
    </div>
  )
}
