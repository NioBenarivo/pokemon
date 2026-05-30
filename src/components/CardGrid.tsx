// ─────────────────────────────────────────────────────────────
// components/CardGrid.tsx
//
// Renders the grid of Pokemon cards. Has three possible states:
//
//   1. Reloading — filters just changed, show a spinner
//   2. Empty     — no cards match the current filters, show a message
//   3. Normal    — render a responsive grid of PokemonCard components
//
// This component is "dumb" — it just displays what it receives.
// All data fetching and state management happens in App.tsx + useInfiniteCards.
//
// The grid is responsive:
//   • 1 column  on phones (< 376px)
//   • 2 columns on small phones (≥ 376px)
//   • 3 columns on tablets/desktop (≥ 640px)
// ─────────────────────────────────────────────────────────────

import { type Card } from '../data/cards'
import PokemonCard from './PokemonCard'
import { CARD_GRID } from '../constants/strings'

interface Props {
  cards: Card[]              // the cards to display
  owned: Set<string>         // card IDs in the user's binder (for the green "owned" badge)
  selected: Set<string>      // card IDs currently selected (for the blue/red selection badge)
  activeTab: 'all' | 'binder'
  selectMode: boolean        // true when any card has been selected
  reloading: boolean         // true when filters just changed and new cards are loading
  searchQuery: string        // used to customize the empty-state message
  selectedPack: string | null // used to customize the empty-state message
  onCardClick: (card: Card) => void       // short tap → open lightbox (or toggle in select mode)
  onCardLongPress: (card: Card) => void   // long press → enter select mode
}

export default function CardGrid({
  cards,
  owned,
  selected,
  activeTab,
  selectMode,
  reloading,
  searchQuery,
  selectedPack,
  onCardClick,
  onCardLongPress,
}: Props) {
  if (reloading) {
    return (
      <div className="bg-zinc-50 rounded-2xl p-5 border border-zinc-200">
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 rounded-full border-2 border-zinc-300 border-t-zinc-600 animate-spin" />
        </div>
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="bg-zinc-50 rounded-2xl p-5 border border-zinc-200">
        <p className="text-center text-zinc-400 text-sm py-10">
          {searchQuery || selectedPack
            ? CARD_GRID.EMPTY_SEARCH
            : activeTab === 'binder'
            ? CARD_GRID.EMPTY_BINDER
            : CARD_GRID.EMPTY_DEFAULT}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-zinc-50 rounded-2xl p-5 border border-zinc-200">
      <div className="grid grid-cols-1 min-[376px]:grid-cols-2 sm:grid-cols-3 gap-3.5">
        {cards.map(card => (
          <PokemonCard
            key={card.id}
            card={card}
            isOwned={owned.has(card.id)}
            isSelected={selected.has(card.id)}
            selectMode={selectMode}
            onClick={() => onCardClick(card)}
            onLongPress={() => onCardLongPress(card)}
            readOnly={activeTab === 'binder'}
          />
        ))}
      </div>
    </div>
  )
}
