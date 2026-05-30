// ─────────────────────────────────────────────────────────────
// components/PokemonCard.tsx
//
// Renders a single Pokemon card in the grid.
//
// There are two visual modes controlled by the "readOnly" prop:
//
//   readOnly = false (default) — "All Cards" tab
//     Shows a card with a label footer (name + pack + owned status badge).
//     Border color changes to green (owned) or blue (selected).
//
//   readOnly = true — "My Binder" tab
//     Cleaner card-only view with a hover overlay showing name/pack.
//     Selection badge turns red (for removal) instead of blue.
//
// Interaction model:
//   Short tap/click → open the lightbox (full-screen view)
//   Long press (hold 500ms) → enter select mode and toggle this card
//
// The long-press is implemented manually using pointer events + a timer
// because there's no native "long press" event in the browser.
// ─────────────────────────────────────────────────────────────

import type { Card } from '../data/cards'
import { useState, useRef } from 'react'
import CheckIcon from './CheckIcon'
import { LONG_PRESS_MS } from '../constants/config'
import { CARD } from '../constants/strings'

interface Props {
  card: Card
  isOwned: boolean        // true if this card is in the user's binder
  isSelected?: boolean    // true if the user has tapped this card in select mode
  selectMode?: boolean    // true if any card is currently selected (selection is active)
  onClick?: () => void    // fires on short tap
  onLongPress?: () => void // fires after holding for 500ms
  readOnly?: boolean      // true on the Binder tab — changes the visual layout
}

export default function PokemonCard({
  card, isOwned, isSelected = false, selectMode = false,
  onClick, onLongPress, readOnly = false,
}: Props) {

  // Controls whether the card image is visible yet.
  // Images start hidden (opacity-0) and fade in once loaded to avoid
  // a jarring flash of a broken/blank image area.
  const [imageLoaded, setImageLoaded] = useState(false)

  // Holds the setTimeout reference for the long-press timer.
  // We store it in a ref (not state) because changing it shouldn't
  // cause a re-render — it's just a timer ID we need to cancel.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Tracks whether the current press registered as a long press.
  // This is used in handleClick to avoid triggering both long press
  // AND click when the user releases after a long hold.
  const didLongPressRef = useRef(false)


  // ── Long press detection ─────────────────────────────────────────────────

  // Called when the user presses down (finger touch or mouse button)
  function startPress() {
    didLongPressRef.current = false

    // Start a timer — if the user holds for 500ms, fire onLongPress
    timerRef.current = setTimeout(() => {
      didLongPressRef.current = true
      onLongPress?.()  // the ?. means: only call if onLongPress was provided
    }, LONG_PRESS_MS)
  }

  // Called when the user releases, moves away, or the press is cancelled.
  // Clears the timer so a short tap doesn't accidentally trigger long press.
  function cancelPress() {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  // Called when a click fires (after pointerUp).
  // If it was actually a long press, we ignore the click — the long press
  // handler already ran, and we don't want to also open the lightbox.
  function handleClick() {
    if (didLongPressRef.current) {
      didLongPressRef.current = false
      return
    }
    onClick?.()
  }


  // ── Interaction props — shared between both visual modes ─────────────────
  //
  // We use "pointer" events instead of "mouse" or "touch" events because
  // pointer events work on both touch screens and desktop mice with one API.
  //
  // onContextMenu: e.preventDefault() — suppresses the browser's right-click
  // menu on desktop and the "copy/select" popup on mobile long press.
  const interactionProps = {
    onPointerDown: startPress,
    onPointerUp: cancelPress,
    onPointerLeave: cancelPress,   // user dragged the pointer off the card
    onPointerCancel: cancelPress,  // OS cancelled the event (e.g. scroll started)
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onClick: handleClick,
  }

  if (readOnly) {
    return (
      <div
        {...interactionProps}
        className={[
          'group select-none relative rounded-2xl overflow-hidden transition-all duration-200',
          onClick || onLongPress ? 'cursor-pointer' : 'cursor-default',
          isSelected ? 'ring-2 ring-red-400 ring-offset-2 shadow-lg' : 'shadow-md hover:shadow-xl',
        ].join(' ')}
      >
        <div className="bg-zinc-100 relative" style={{ paddingBottom: '140%' }}>
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 animate-pulse">
              <div className="w-6 h-6 rounded-full border-2 border-zinc-300 border-t-zinc-500 animate-spin" />
            </div>
          )}
          <img
            src={card.image_url}
            alt={card.name}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            className={[
              'absolute inset-0 w-full h-full object-contain',
              'transition-all duration-500 group-hover:scale-105',
              !imageLoaded ? 'opacity-0' : 'opacity-100',
            ].join(' ')}
          />

          {/* Selection badge */}
          <div
            className={[
              'absolute top-1.5 right-1.5 w-5 h-5 rounded-full',
              'flex items-center justify-center shadow-md',
              'transition-all duration-200',
              isSelected
                ? 'bg-red-400 opacity-100 scale-100'
                : selectMode
                ? 'bg-white/30 border border-white/60 opacity-100 scale-100'
                : 'opacity-0 scale-50',
            ].join(' ')}
          >
            {isSelected && <CheckIcon />}
          </div>

          {/* Gradient overlay */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pt-8 pb-3 px-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
            <p className="text-white text-xs font-semibold truncate leading-tight">{card.name}</p>
            <p className="text-white/50 text-[10px] truncate mt-0.5">{card.pack}</p>
          </div>
        </div>
      </div>
    )
  }

  const borderColor = isOwned
    ? 'border-green-400'
    : isSelected
    ? 'border-blue-400'
    : 'border-zinc-200 hover:border-zinc-300'

  return (
    <div
      {...interactionProps}
      className="cursor-pointer group select-none"
      title={isOwned ? CARD.TOOLTIP_OWNED : isSelected ? CARD.TOOLTIP_DESELECT : selectMode ? CARD.TOOLTIP_SELECT : CARD.TOOLTIP_HOLD}
    >
      <div
        className={[
          'flex flex-col rounded-xl overflow-hidden border-2 transition-colors duration-300',
          borderColor,
        ].join(' ')}
      >
        <div className="bg-zinc-100 relative overflow-hidden" style={{ paddingBottom: '80%' }}>
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 animate-pulse">
              <div className="w-6 h-6 rounded-full border-2 border-zinc-300 border-t-zinc-500 animate-spin" />
            </div>
          )}
          <img
            src={card.image_url}
            alt={card.name}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            className={[
              'absolute inset-0 w-full h-full object-contain p-3 drop-shadow-lg',
              'transition-all duration-500 group-hover:scale-105',
              !imageLoaded ? 'opacity-0' : 'opacity-100',
            ].join(' ')}
          />

          {/* Selection / ownership badge */}
          <div
            className={[
              'absolute top-1.5 right-1.5 w-5 h-5 rounded-full',
              'flex items-center justify-center shadow-md',
              'transition-all duration-200',
              isOwned
                ? 'bg-green-400 opacity-100 scale-100'
                : isSelected
                ? 'bg-blue-400 opacity-100 scale-100'
                : selectMode
                ? 'bg-white border border-zinc-300 opacity-100 scale-100'
                : 'opacity-0 scale-50',
            ].join(' ')}
          >
            {(isOwned || isSelected) && <CheckIcon />}
          </div>
        </div>

        <div className="bg-white px-2.5 py-2">
          <p className="text-zinc-800 font-semibold text-[11px] leading-tight truncate mb-1.5">
            {card.name}
          </p>
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] leading-none bg-zinc-100 border border-zinc-200 text-zinc-500 px-1.5 py-1 rounded-full truncate max-w-[58%]">
              {card.pack}
            </span>
            <span
              className={[
                'text-[9px] leading-none font-medium px-1.5 py-1 rounded-full whitespace-nowrap',
                'transition-colors duration-300',
                isOwned
                  ? 'bg-green-50 text-green-600 border border-green-200'
                  : isSelected
                  ? 'bg-blue-50 text-blue-600 border border-blue-200'
                  : 'bg-zinc-50 text-zinc-400 border border-zinc-200',
              ].join(' ')}
            >
              {isOwned ? CARD.OWNED : isSelected ? CARD.SELECTED : CARD.NOT_OWNED}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
