import type { Card } from '../data/cards'
import { R2_BASE } from '../data/cards'

interface Props {
  card: Card
  isOwned: boolean
  onToggle: () => void
}

export default function PokemonCard({ card, isOwned, onToggle }: Props) {
  return (
    <div
      onClick={onToggle}
      className="cursor-pointer group select-none"
      title="Click to toggle owned"
    >
      <div
        className={[
          'flex flex-col rounded-xl overflow-hidden transition-all duration-200',
          isOwned
            ? 'border-2 border-green-400'
            : 'border border-zinc-200 hover:border-zinc-300',
        ].join(' ')}
      >
        {/* Image */}
        <div
          className="bg-zinc-50 relative overflow-hidden"
          style={{ paddingBottom: '80%' }}
        >
          <img
            src={`${R2_BASE}/${card.image}`}
            alt={card.name}
            loading="lazy"
            className={[
              'absolute inset-0 w-full h-full object-contain p-3',
              'transition-transform duration-300 group-hover:scale-105 drop-shadow-lg',
              isOwned ? 'opacity-100' : 'opacity-60',
            ].join(' ')}
          />
          {isOwned && (
            <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-green-400 rounded-full flex items-center justify-center shadow-md">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-2.5 h-2.5"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          )}
        </div>

        {/* Info */}
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
                isOwned
                  ? 'bg-green-50 text-green-600 border border-green-200'
                  : 'bg-zinc-50 text-zinc-400 border border-zinc-200',
              ].join(' ')}
            >
              {isOwned ? '✓ Owned' : 'Wishlist'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
