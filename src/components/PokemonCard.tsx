import type { Card } from '../data/cards'
import { useState, useRef } from 'react'
import CheckIcon from './CheckIcon'
import Spinner from './Spinner'
import { LONG_PRESS_MS } from '../constants/config'

interface Props {
  card: Card
  isOwned: boolean
  isSelected?: boolean
  selectMode?: boolean
  onClick?: () => void
  onLongPress?: () => void
  removeMode?: boolean
  isWishlisted?: boolean
}

export default function PokemonCard({
  card, isOwned, isSelected = false, selectMode = false,
  onClick, onLongPress, removeMode = false, isWishlisted = false,
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

  return (
    <div
      {...interactionProps}
      className={[
        'group select-none relative rounded-2xl overflow-hidden transition-all duration-200',
        onClick || onLongPress ? 'cursor-pointer' : 'cursor-default',
        isSelected
          ? (removeMode ? 'ring-2 ring-red-400 ring-offset-2 shadow-lg' : 'ring-2 ring-blue-400 ring-offset-2 shadow-lg')
          : isOwned && !removeMode
          ? 'ring-2 ring-green-400 ring-offset-2 shadow-lg'
          : 'shadow-md hover:shadow-xl',
      ].join(' ')}
    >
      <div className="bg-zinc-100 relative" style={{ paddingBottom: '140%' }}>
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 animate-pulse">
            <Spinner />
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

        {/* Wishlist heart badge */}
        {isWishlisted && !isSelected && (
          <div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow-md">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-white">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
        )}

        {/* Selection / ownership badge */}
        <div
          className={[
            'absolute top-1.5 right-1.5 w-5 h-5 rounded-full',
            'flex items-center justify-center shadow-md',
            'transition-all duration-200',
            isSelected
              ? (removeMode ? 'bg-red-400 opacity-100 scale-100' : 'bg-blue-400 opacity-100 scale-100')
              : isOwned && !removeMode
              ? 'bg-green-400 opacity-100 scale-100'
              : selectMode
              ? 'bg-white/30 border border-white/60 opacity-100 scale-100'
              : 'opacity-0 scale-50',
          ].join(' ')}
        >
          {(isSelected || (isOwned && !removeMode)) && <CheckIcon />}
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
