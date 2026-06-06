import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePokemonCards } from '../hooks/usePokemonCards'
import { useAuth } from '../hooks/useAuth'
import { useOwnedCards } from '../hooks/useOwnedCards'
import { useWishlist } from '../hooks/useWishlist'
import { useToast } from '../hooks/useToast'
import CardGrid from '../components/CardGrid'
import { useBinders } from '../hooks/useBinders'
import SelectActionBar from '../components/SelectActionBar'
import BinderPickerModal from '../components/BinderPickerModal'
import CardLightbox from '../components/CardLightbox'
import Toast from '../components/Toast'
import LoadingScreen from '../components/LoadingScreen'
import { useCardSelection } from '../hooks/useCardSelection'

export default function PokemonDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { owned, addMultiple, removeMultiple } = useOwnedCards(user?.id ?? '')
  const { wishlist, addToWishlist, removeFromWishlist } = useWishlist(user?.id ?? '')
  const { toasts, showToast, removeToast } = useToast()

  const { pokemon, cards, loading } = usePokemonCards(Number(id))

  const { binders } = useBinders(user?.id ?? '')
  const { selected, selectMode, lightboxCard, setLightboxCard, clearSelection, handleCardClick, handleCardLongPress } = useCardSelection(owned)
  const [adding, setAdding] = useState(false)
  const [pickerCardIds, setPickerCardIds] = useState<string[] | null>(null)

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

  async function handleRemove() {
    if (selected.size === 0) return
    setAdding(true)
    await removeMultiple([...selected])
    showToast(`${selected.size} card${selected.size > 1 ? 's' : ''} removed from binder`)
    clearSelection()
    setAdding(false)
  }

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
            onCancel={clearSelection}
            onWishlist={handleAddToWishlist}
            onAddToBinder={handleAdd}
          />
        )}

        {/* Cards grid */}
        {cards.length === 0 ? (
          <p className="text-center text-zinc-400 text-sm py-16">
            No cards found.
          </p>
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
