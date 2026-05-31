import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePackCards } from '../hooks/usePackCards'
import { useAuth } from '../hooks/useAuth'
import { useOwnedCards } from '../hooks/useOwnedCards'
import { useWishlist } from '../hooks/useWishlist'
import { useToast } from '../hooks/useToast'
import CardGrid from '../components/CardGrid'
import { addToBinder } from '../utils/cardActions'
import SelectActionBar from '../components/SelectActionBar'
import CardLightbox from '../components/CardLightbox'
import Toast from '../components/Toast'
import LoadingScreen from '../components/LoadingScreen'
import ProgressBar from '../components/ProgressBar'
import { useCardSelection } from '../hooks/useCardSelection'

export default function PackDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { owned, addMultiple } = useOwnedCards(user?.id ?? '')
  const { wishlist, addToWishlist, removeFromWishlist } = useWishlist(user?.id ?? '')
  const { toasts, showToast, removeToast } = useToast()

  const { pack, cards, loading } = usePackCards(Number(id))

  const { selected, selectMode, lightboxCard, setLightboxCard, clearSelection, handleCardClick, handleCardLongPress } = useCardSelection(owned)
  const [adding, setAdding] = useState(false)

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
    clearSelection()
    setAdding(false)
  }

  const ownedCount = cards.filter(c => owned.has(c.id)).length
  const wishlistedCount = cards.filter(c => wishlist.has(c.id)).length

  if (loading) return <LoadingScreen message="Loading pack..." />

  return (
    <div className="bg-white min-h-screen py-10 px-4 font-sans">
      <div className="max-w-4xl mx-auto">

        {/* Back button */}
        <button
          onClick={() => navigate('/packs')}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-700 transition-colors mb-6"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          All Packs
        </button>

        {/* Pack header */}
        {pack && (
          <div className="flex items-center gap-5 mb-8 p-5 bg-zinc-500 rounded-2xl">
            <img
              src={pack.image_url}
              alt={pack.name}
              className="h-20 object-contain"
            />
            <div>
              <h1 className="text-xl font-bold text-white leading-tight">{pack.name}</h1>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-sm text-white/70">
                  {pack.card_count != null ? `${pack.card_count} cards` : `${cards.length} cards`}
                </span>
                {pack.release_date && (
                  <>
                    <span className="text-white/30">·</span>
                    <span className="text-sm text-white/70">{pack.release_date}</span>
                  </>
                )}
              </div>
              {user && wishlistedCount > 0 && (
                <p className="text-[11px] text-pink-300 mt-1.5">♡ {wishlistedCount} wishlisted</p>
              )}
              {user && <ProgressBar owned={ownedCount} total={pack.card_count ?? cards.length} />}
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
          <p className="text-center text-zinc-400 text-sm py-16">No cards found for this pack.</p>
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
          onAddToBinder={user ? () => addToBinder(lightboxCard.id, addMultiple, wishlist, removeFromWishlist, showToast) : undefined}
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
