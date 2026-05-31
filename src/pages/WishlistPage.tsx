import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import Header from '../components/Header'
import { useOwnedCards } from '../hooks/useOwnedCards'
import { useWishlist } from '../hooks/useWishlist'
import { useToast } from '../hooks/useToast'
import PokemonCard from '../components/PokemonCard'
import CardLightbox from '../components/CardLightbox'
import Toast from '../components/Toast'
import { supabase } from '../lib/supabase'
import { SEARCH_DEBOUNCE_MS } from '../constants/config'
import type { Card } from '../data/cards'

export default function WishlistPage() {
  const { user, signOut } = useAuth()
  const { owned, addMultiple } = useOwnedCards(user?.id ?? '')
  const { wishlist, removeFromWishlist } = useWishlist(user?.id ?? '')
  const { toasts, showToast, removeToast } = useToast()

  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [lightboxCard, setLightboxCard] = useState<Card | null>(null)
  const [acting, setActing] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchQuery])

  const wishlistKey = [...wishlist].sort().join(',')

  // Fetch only the wishlisted cards directly by ID — no infinite scroll needed
  useEffect(() => {
    if (wishlist.size === 0) { setCards([]); return }

    setLoading(true)
    let q = supabase
      .from('scraped_cards')
      .select('*')
      .in('id', [...wishlist])
      .order('name')

    if (debouncedSearch) q = q.ilike('name', `%${debouncedSearch}%`)

    q.then(({ data, error }) => {
      if (error) { console.error('Failed to fetch wishlist cards:', error.message); setLoading(false); return }
      setCards((data ?? []) as Card[])
      setLoading(false)
    })
  }, [wishlistKey, debouncedSearch])

  function toggleSelected(cardId: string) {
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
    if (!selectMode) setSelectMode(true)
    toggleSelected(card.id)
  }

  async function handleAddToBinder() {
    if (selected.size === 0) return
    setActing(true)
    const ids = [...selected]
    const ok = await addMultiple(ids)
    if (ok) await removeFromWishlist(ids)
    showToast(`${ids.length} card${ids.length > 1 ? 's' : ''} added to binder ✓`)
    setSelected(new Set())
    setSelectMode(false)
    setActing(false)
  }

  async function handleRemoveFromWishlist() {
    if (selected.size === 0) return
    setActing(true)
    await removeFromWishlist([...selected])
    showToast(`${selected.size} card${selected.size > 1 ? 's' : ''} removed from wishlist`)
    setSelected(new Set())
    setSelectMode(false)
    setActing(false)
  }

  return (
    <div className="bg-white min-h-screen py-10 px-4 font-sans">
      <div className="max-w-4xl mx-auto">

        <Header title="Wishlist" subtitle={`${wishlist.size} cards`} onSignOut={signOut} />

        <div className="mb-5">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search wishlist..."
            className="w-full px-4 py-2 text-sm rounded-xl border border-zinc-200 text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors"
          />
        </div>

        {selectMode && (
          <div className="flex items-center justify-between mb-4 px-4 py-3 bg-zinc-50 rounded-xl">
            <span className="text-sm text-zinc-600">
              {selected.size} card{selected.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setSelected(new Set()); setSelectMode(false) }}
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
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 border-zinc-300 border-t-zinc-600 animate-spin" />
          </div>
        ) : wishlist.size === 0 ? (
          <p className="text-center text-zinc-400 text-sm py-16">
            Your wishlist is empty. Browse cards or Pokémon to add some!
          </p>
        ) : cards.length === 0 ? (
          <p className="text-center text-zinc-400 text-sm py-16">No cards match your search.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {cards.map(card => (
              <PokemonCard
                key={card.id}
                card={card}
                isOwned={owned.has(card.id)}
                isSelected={selected.has(card.id)}
                selectMode={selectMode}
                onClick={() => handleCardClick(card)}
                onLongPress={() => handleCardLongPress(card)}
                readOnly
              />
            ))}
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
          onToggleWishlist={user ? () => removeFromWishlist([lightboxCard.id]) : undefined}
        />
      )}

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
