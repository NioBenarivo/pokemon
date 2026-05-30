// ─────────────────────────────────────────────────────────────
// components/CardLightbox.tsx
//
// A full-screen overlay that shows a single card image large.
// Opens when the user taps a card (short tap, not long press).
//
// How to close it:
//   • Tap anywhere on the dark background
//   • Press the X button in the top-right corner
//   • Press the Escape key (keyboard)
//
// The image is displayed with max-h-[85vh] so it always fits on screen
// regardless of the card's original dimensions.
// ─────────────────────────────────────────────────────────────

import { useEffect } from 'react'
import type { Card } from '../data/cards'

interface Props {
  card: Card       // the card to display
  onClose: () => void  // called when the user dismisses the lightbox
}

export default function CardLightbox({ card, onClose }: Props) {

  // Attach a keyboard listener so pressing Escape closes the lightbox.
  // We use useEffect because we need to attach to the global window object,
  // which can only be done after the component mounts (not during render).
  //
  // The cleanup function removes the listener when the lightbox closes,
  // so the handler doesn't keep running in the background.
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
        src={card.image_url}
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
