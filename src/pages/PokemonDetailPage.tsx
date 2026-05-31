import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePokemonCards } from '../hooks/usePokemonCards'
import { useAuth } from '../hooks/useAuth'
import { useOwnedCards } from '../hooks/useOwnedCards'
import { useWishlist } from '../hooks/useWishlist'
import { useToast } from '../hooks/useToast'
import PokemonCard from '../components/PokemonCard'
import SelectActionBar from '../components/SelectActionBar'
import CardLightbox from '../components/CardLightbox'
import Toast from '../components/Toast'
import LoadingScreen from '../components/LoadingScreen'
import type { Card } from '../data/cards'

export default function PokemonDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { owned, addMultiple, removeMultiple } = useOwnedCards(user?.id ?? '')
  const { wishlist, addToWishlist, removeFromWishlist } = useWishlist(user?.id ?? '')
  const { toasts, showToast, removeToast } = useToast()

  const { pokemon, cards, loading } = usePokemonCards(Number(id))

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [lightboxCard, setLightboxCard] = useState<Card | null>(null)
  const [adding, setAdding] = useState(false)
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
    await addToWishlist([...selected])
    showToast(`${selected.size} card${selected.size > 1 ? 's' : ''} added to wishlist ✓`)
    setSelected(new Set())
    setSelectMode(false)
    setAdding(false)
  }

  async function handleRemove() {
    if (selected.size === 0) return
    setAdding(true)
    await removeMultiple([...selected])
    showToast(`${selected.size} card${selected.size > 1 ? 's' : ''} removed from binder`)
    setSelected(new Set())
    setSelectMode(false)
    setAdding(false)
  }

  const displayedCards = cards
  const ownedCount = cards.filter(c => owned.has(c.id)).length

  if (loading) return <LoadingScreen message="Loading cards..." />

  return (
    <div className="bg-white min-h-screen py-10 px-4 font-sans">
      <div className="max-w-4xl mx-auto">

        {/* Back button */}
        <button
          onClick={() => navigate('/pokemon')}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-700 transition-colors mb-6"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          All Pokémon
        </button>

        {/* Pokemon header */}
        {pokemon && (
          <div className="flex items-center gap-4 mb-6">
            <img
              src={pokemon.image_url}
              alt={pokemon.name}
              className="w-16 h-16 object-contain"
            />
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">{pokemon.name}</h1>
              <p className="text-sm text-zinc-400">
                {cards.length} cards · {ownedCount} owned
              </p>
            </div>
          </div>
        )}


        {selectMode && (
          <SelectActionBar
            count={selected.size}
            adding={adding}
            onCancel={() => { setSelected(new Set()); setSelectMode(false) }}
            onWishlist={handleAddToWishlist}
            onAddToBinder={handleAdd}
          />
        )}

        {/* Cards grid */}
        {displayedCards.length === 0 ? (
          <p className="text-center text-zinc-400 text-sm py-16">
            No cards found.
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {displayedCards.map(card => (
              <PokemonCard
                key={card.id}
                card={card}
                isOwned={owned.has(card.id)}
                isSelected={selected.has(card.id)}
                isWishlisted={wishlist.has(card.id)}
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
        <CardLightbox card={lightboxCard} onClose={() => setLightboxCard(null)} />
      )}

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
