import { type Card } from '../data/cards'
import PokemonCard from './PokemonCard'

interface Props {
  cards: Card[]
  owned: Set<number>
  selected: Set<number>
  activeTab: 'all' | 'binder'
  selectMode: boolean
  reloading: boolean
  searchQuery: string
  selectedPack: string | null
  onCardClick: (card: Card) => void
  onCardLongPress: (card: Card) => void
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
            ? 'No cards match your search.'
            : activeTab === 'binder'
            ? 'Your binder is empty. Go to All Cards to add some!'
            : 'No cards found.'}
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
