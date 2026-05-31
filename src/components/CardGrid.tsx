import type { Card } from '../data/cards'
import PokemonCard from './PokemonCard'

interface Props {
  cards: Card[]
  owned: Set<string>
  selected: Set<string>
  selectMode: boolean
  onCardClick: (card: Card) => void
  onCardLongPress: (card: Card) => void
  wishlist?: Set<string>
  removeMode?: boolean
}

export default function CardGrid({
  cards, owned, selected, selectMode,
  onCardClick, onCardLongPress,
  wishlist, removeMode = false,
}: Props) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
      {cards.map(card => (
        <PokemonCard
          key={card.id}
          card={card}
          isOwned={owned.has(card.id)}
          isSelected={selected.has(card.id)}
          isWishlisted={wishlist?.has(card.id)}
          selectMode={selectMode}
          removeMode={removeMode}
          onClick={() => onCardClick(card)}
          onLongPress={() => onCardLongPress(card)}
        />
      ))}
    </div>
  )
}
