import { useEffect } from 'react'
import type { Card } from '../data/cards'

interface Props {
  card: Card
  onClose: () => void
  isOwned?: boolean
  isWishlisted?: boolean
  onAddToBinder?: () => void
  onToggleWishlist?: () => void
}

export default function CardLightbox({
  card,
  onClose,
  isOwned,
  isWishlisted,
  onAddToBinder,
  onToggleWishlist,
}: Props) {

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const showActions = onAddToBinder !== undefined || onToggleWishlist !== undefined

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <img
        src={card.image_url}
        alt={card.name}
        className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      />

      <div
        className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-3 px-4"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-white text-sm">
          <span className="font-semibold">{card.name}</span>
          <span className="text-white/30 mx-2">·</span>
          <span className="text-white/50">{card.pack}</span>
        </p>

        {showActions && (
          <div className="flex gap-3">
            {onToggleWishlist !== undefined && !isOwned && (
              <button
                onClick={onToggleWishlist}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors
                  ${isWishlisted
                    ? 'bg-pink-500 text-white hover:bg-pink-600'
                    : 'bg-white/15 text-white hover:bg-white/25'
                  }`}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill={isWishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {isWishlisted ? 'Wishlisted' : 'Wishlist'}
              </button>
            )}

            {onAddToBinder !== undefined && (
              <button
                onClick={isOwned ? undefined : onAddToBinder}
                disabled={isOwned}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors
                  ${isOwned
                    ? 'bg-white/10 text-white/40 cursor-default'
                    : 'bg-white/15 text-white hover:bg-white/25'
                  }`}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                  {isOwned
                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    : <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  }
                </svg>
                {isOwned ? 'In Binder' : 'Add to Binder'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
