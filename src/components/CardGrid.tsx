import { type Card, CARDS_PER_PAGE } from '../data/cards'
import PokemonCard from './PokemonCard'
import EmptySlot from './EmptySlot'

interface Props {
  pageCards: Card[]
  owned: Set<number>
  selected: Set<number>
  activeTab: 'all' | 'binder'
  searchQuery: string
  selectedPack: string | null
  hasCards: boolean
  onToggle: (cardId: number) => void
}

export default function CardGrid({
  pageCards,
  owned,
  selected,
  activeTab,
  searchQuery,
  selectedPack,
  hasCards,
  onToggle,
}: Props) {
  return (
    <div className="bg-zinc-50 rounded-2xl p-5 border border-zinc-200">
      {!hasCards ? (
        <p className="text-center text-zinc-400 text-sm py-10">
          {searchQuery || selectedPack
            ? 'No cards match your search.'
            : activeTab === 'binder'
            ? 'Your binder is empty. Go to All Cards to add some!'
            : 'No cards found.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 min-[376px]:grid-cols-2 sm:grid-cols-3 gap-3.5">
          {Array.from({ length: CARDS_PER_PAGE }, (_, i) => {
            const card = pageCards[i]
            if (!card) return <EmptySlot key={`empty-${i}`} />
            return (
              <PokemonCard
                key={card.id}
                card={card}
                isOwned={owned.has(card.id)}
                isSelected={selected.has(card.id)}
                onToggle={() => onToggle(card.id)}
                readOnly={activeTab === 'binder'}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
