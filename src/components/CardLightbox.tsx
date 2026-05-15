import { useEffect } from 'react'
import type { Card } from '../data/cards'
import { R2_BASE } from '../data/cards'

interface Props {
  card: Card
  onClose: () => void
}

export default function CardLightbox({ card, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

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
        src={`${R2_BASE}/${card.image}`}
        alt={card.name}
        className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      />

      <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
        <p className="text-white font-semibold text-sm">{card.name}</p>
        <p className="text-white/50 text-xs mt-0.5">{card.pack}</p>
      </div>
    </div>
  )
}
