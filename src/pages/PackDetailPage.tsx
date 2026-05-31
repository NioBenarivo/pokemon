import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePackCards } from '../hooks/usePackCards'
import { useAuth } from '../hooks/useAuth'
import { useOwnedCards } from '../hooks/useOwnedCards'
import { useWishlist } from '../hooks/useWishlist'
import { useToast } from '../hooks/useToast'
import PokemonCard from '../components/PokemonCard'
import CardLightbox from '../components/CardLightbox'
import Toast from '../components/Toast'
import LoadingScreen from '../components/LoadingScreen'
import ProgressBar from '../components/ProgressBar'
import type { Card } from '../data/cards'

export default function PackDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { owned, addMultiple } = useOwnedCards(user?.id ?? '')
  const { wishlist, removeFromWishlist } = useWishlist(user?.id ?? '')
  const { toasts, showToast, removeToast } = useToast()

  const { pack, cards, loading } = usePackCards(Number(id))

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

  const ownedCount = cards.filter(c => owned.has(c.id)).length

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
              {user && <ProgressBar owned={ownedCount} total={pack.card_count ?? cards.length} />}
            </div>
          </div>
        )}

        {/* Action bar */}
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
                onClick={handleAdd}
                disabled={adding}
                className="text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-700 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                {adding ? 'Adding...' : 'Add to Binder'}
              </button>
            </div>
          </div>
        )}

        {/* Cards grid */}
        {cards.length === 0 ? (
          <p className="text-center text-zinc-400 text-sm py-16">No cards found for this pack.</p>
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
