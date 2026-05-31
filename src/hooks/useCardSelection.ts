import { useState } from 'react'
import type { Card } from '../data/cards'

export function useCardSelection(owned?: Set<string>) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [lightboxCard, setLightboxCard] = useState<Card | null>(null)

  function clearSelection() {
    setSelected(new Set())
    setSelectMode(false)
  }

  function toggleSelected(cardId: string) {
    if (owned?.has(cardId)) return
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(cardId)) next.delete(cardId)
      else next.add(cardId)
      if (next.size === 0) setSelectMode(false)
      return next
    })
  }

  function handleCardClick(card: Card) {
    if (selectMode) toggleSelected(card.id)
    else setLightboxCard(card)
  }

  function handleCardLongPress(card: Card) {
    if (owned?.has(card.id)) return
    if (!selectMode) setSelectMode(true)
    toggleSelected(card.id)
  }

  return {
    selected,
    selectMode,
    lightboxCard,
    setLightboxCard,
    clearSelection,
    toggleSelected,
    handleCardClick,
    handleCardLongPress,
  }
}
