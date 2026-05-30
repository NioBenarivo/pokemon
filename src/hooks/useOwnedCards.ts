import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useOwnedCards(userId: string) {
  const [owned, setOwned] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!userId) return

    async function fetchOwned() {
      const { data, error } = await supabase
        .from('owned_cards')
        .select('card_id')
        .eq('user_id', userId)

      if (error) { console.error('Failed to fetch owned cards:', error.message); return }
      if (data) setOwned(new Set(data.map((r: { card_id: string }) => r.card_id)))
    }

    fetchOwned()
  }, [userId])

  async function addMultiple(cardIds: string[]) {
    if (cardIds.length === 0) return
    const rows = cardIds.map(card_id => ({ user_id: userId, card_id }))
    const { error } = await supabase
      .from('owned_cards')
      .upsert(rows, { onConflict: 'user_id,card_id' })

    if (error) { console.error('Failed to add cards:', error.message); return }
    setOwned(prev => new Set([...prev, ...cardIds]))
  }

  async function removeMultiple(cardIds: string[]) {
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
      console.error('Failed to remove cards:', error.message)
      setOwned(prev => new Set([...prev, ...cardIds]))
    }
  }

  return { owned, addMultiple, removeMultiple }
}
