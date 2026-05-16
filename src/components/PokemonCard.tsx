import { useState, useRef } from 'react'
import type { Card } from '../data/cards'
import { R2_BASE } from '../data/cards'

const LONG_PRESS_MS = 500

interface Props {
  card: Card
  isOwned: boolean
  isSelected?: boolean
  selectMode?: boolean
  onClick?: () => void
  onLongPress?: () => void
  readOnly?: boolean
}

export default function PokemonCard({
  card, isOwned, isSelected = false, selectMode = false,
  onClick, onLongPress, readOnly = false,
}: Props) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didLongPressRef = useRef(false)

  function startPress() {
    didLongPressRef.current = false
    timerRef.current = setTimeout(() => {
      didLongPressRef.current = true
      onLongPress?.()
    }, LONG_PRESS_MS)
  }

  function cancelPress() {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  function handleClick() {
    if (didLongPressRef.current) {
      didLongPressRef.current = false
      return
    }
    onClick?.()
  }

  const interactionProps = {
    onPointerDown: startPress,
    onPointerUp: cancelPress,
    onPointerLeave: cancelPress,
    onPointerCancel: cancelPress,
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
            src={`${R2_BASE}/${card.image}`}
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
            {isSelected && (
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
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
      title={isOwned ? 'Already in binder' : isSelected ? 'Click to deselect' : selectMode ? 'Click to select' : 'Hold to select'}
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
            src={`${R2_BASE}/${card.image}`}
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
            {(isOwned || isSelected) && (
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
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
              {isOwned ? '✓ Owned' : isSelected ? '+ Selected' : 'Not owned'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
