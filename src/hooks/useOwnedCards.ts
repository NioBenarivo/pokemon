import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useOwnedCards(userId: string) {
  const [owned, setOwned] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!userId) return

    async function fetchOwned() {
      const { data } = await supabase
        .from('owned_cards')
        .select('card_id')
        .eq('user_id', userId)

      if (data) setOwned(new Set(data.map((r: { card_id: number }) => r.card_id)))
    }

    fetchOwned()
  }, [userId])

  async function toggleOwned(cardId: number) {
    const isCurrentlyOwned = owned.has(cardId)

    setOwned(prev => {
      const next = new Set(prev)
      if (next.has(cardId)) next.delete(cardId)
      else next.add(cardId)
      return next
    })

    const { error } = isCurrentlyOwned
      ? await supabase.from('owned_cards').delete().eq('user_id', userId).eq('card_id', cardId)
      : await supabase.from('owned_cards').insert({ user_id: userId, card_id: cardId })

    if (error) {
      setOwned(prev => {
        const next = new Set(prev)
        if (isCurrentlyOwned) next.add(cardId)
        else next.delete(cardId)
        return next
      })
    }
  }

  async function addMultiple(cardIds: number[]) {
    if (cardIds.length === 0) return

    const rows = cardIds.map(card_id => ({ user_id: userId, card_id }))
    const { error } = await supabase
      .from('owned_cards')
      .upsert(rows, { onConflict: 'user_id,card_id' })

    if (!error) {
      setOwned(prev => new Set([...prev, ...cardIds]))
    }
  }

  async function removeMultiple(cardIds: number[]) {
    if (cardIds.length === 0) return

    setOwned(prev => {
      const next = new Set(prev)
      cardIds.forEach(id => next.delete(id))
      return next
    })

    const { error } = await supabase
      .from('owned_cards')
      .delete()
      .eq('user_id', userId)
      .in('card_id', cardIds)

    if (error) {
      setOwned(prev => new Set([...prev, ...cardIds]))
    }
  }

  return { owned, toggleOwned, addMultiple, removeMultiple }
}
