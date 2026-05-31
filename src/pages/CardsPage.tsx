import { useState, useEffect, useRef } from 'react'
import { useInfiniteCards } from '../hooks/useInfiniteCards'
import { useAuth } from '../hooks/useAuth'
import Header from '../components/Header'
import { useOwnedCards } from '../hooks/useOwnedCards'
import { useWishlist } from '../hooks/useWishlist'
import { useToast } from '../hooks/useToast'
import PokemonCard from '../components/PokemonCard'
import SelectActionBar from '../components/SelectActionBar'
import CardLightbox from '../components/CardLightbox'
import Toast from '../components/Toast'
import { SEARCH_DEBOUNCE_MS, SCROLL_ROOT_MARGIN } from '../constants/config'
import type { Card } from '../data/cards'

export default function CardsPage() {
  const { user, signOut } = useAuth()
  const { owned, addMultiple } = useOwnedCards(user?.id ?? '')
  const { wishlist, addToWishlist, removeFromWishlist } = useWishlist(user?.id ?? '')
  const { toasts, showToast, removeToast } = useToast()

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [lightboxCard, setLightboxCard] = useState<Card | null>(null)
  const [adding, setAdding] = useState(false)
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchQuery])

  const { cards, loading, reloading, loadingMore, loadMore } = useInfiniteCards({
    activeTab: 'all',
    searchQuery: debouncedSearch,
    selectedPack: null,
    ownedIds: owned,
  })

  const loadMoreRef = useRef(loadMore)
  loadMoreRef.current = loadMore

  const sentinelVisibleRef = useRef(false)

  useEffect(() => {
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        sentinelVisibleRef.current = entry.isIntersecting
        if (entry.isIntersecting) loadMoreRef.current()
      },
      { rootMargin: SCROLL_ROOT_MARGIN }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [sentinel])

  useEffect(() => {
    if (!loading && !reloading && !loadingMore && sentinelVisibleRef.current) {
      loadMoreRef.current()
    }
  }, [loading, reloading, loadingMore])

  function toggleSelected(cardId: string) {
    if (owned.has(cardId)) return
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(cardId)) next.delete(cardId)
      else next.add(cardId)
      if (next.size === 0) setSelectMode(false)
      return next
    })
  }

  function handleCardClick(card: Card) {
    if (selectMode) toggleSelected(card.id)
    else setLightboxCard(card)
  }

  function handleCardLongPress(card: Card) {
    if (owned.has(card.id)) return
    if (!selectMode) setSelectMode(true)
    toggleSelected(card.id)
  }

  async function handleAdd() {
    if (selected.size === 0) return
    setAdding(true)
    const ids = [...selected]
    const ok = await addMultiple(ids)
    if (ok) {
      const wishlisted = ids.filter(id => wishlist.has(id))
      if (wishlisted.length) await removeFromWishlist(wishlisted)
    }
    showToast(`${ids.length} card${ids.length > 1 ? 's' : ''} added to binder ✓`)
    setSelected(new Set())
    setSelectMode(false)
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
    setSelected(new Set())
    setSelectMode(false)
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
            onCancel={() => { setSelected(new Set()); setSelectMode(false) }}
            onWishlist={handleAddToWishlist}
            onAddToBinder={handleAdd}
          />
        )}

        {loading || reloading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 border-zinc-300 border-t-zinc-600 animate-spin" />
          </div>
        ) : cards.length === 0 ? (
          <p className="text-center text-zinc-400 text-sm py-16">No cards found.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {cards.map(card => (
              <PokemonCard
                key={card.id}
                card={card}
                isOwned={owned.has(card.id)}
                isSelected={selected.has(card.id)}
                isWishlisted={wishlist.has(card.id)}
                selectMode={selectMode}
                onClick={() => handleCardClick(card)}
                onLongPress={() => handleCardLongPress(card)}
              />
            ))}
          </div>
        )}

        <div ref={setSentinel} className="h-1" />

        {loadingMore && (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 rounded-full border-2 border-zinc-300 border-t-zinc-600 animate-spin" />
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
            await addMultiple([lightboxCard.id])
            showToast('Added to binder ✓')
          } : undefined}
          onToggleWishlist={user ? () =>
            wishlist.has(lightboxCard.id)
              ? removeFromWishlist([lightboxCard.id])
              : addToWishlist([lightboxCard.id])
          : undefined}
        />
      )}

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
