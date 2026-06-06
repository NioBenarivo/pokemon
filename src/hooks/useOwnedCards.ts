import { useState, useEffect } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import { supabase } from '../lib/supabase'

export function useOwnedCards(userId: string, binderId?: string) {
  const [owned, setOwned] = useState<Set<string>>(new Set())
  const [orderedIds, setOrderedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    fetchOwned()
  }, [userId, binderId])

  async function fetchOwned() {
    setLoading(true)
    let q = supabase.from('owned_cards').select('card_id, position').eq('user_id', userId)
    if (binderId) {
      q = q.eq('binder_id', binderId)
        .order('position', { ascending: true, nullsFirst: false })
        .order('card_id', { ascending: true })
    }

    const { data, error } = await q
    if (error) { console.error('Failed to fetch owned cards:', error.message) }
    if (data) {
      const ids = data.map((r: { card_id: string }) => r.card_id)
      setOwned(new Set(ids))
      if (binderId) setOrderedIds(ids)
    }
    setLoading(false)
  }

  async function addMultiple(cardIds: string[], targetBinderId?: string): Promise<boolean> {
    if (cardIds.length === 0) return true
    const bid = targetBinderId ?? binderId
    if (!bid) return false

    // New cards get positions after the current last position
    const nextPos = orderedIds.length
    const rows = cardIds.map((card_id, i) => ({
      user_id: userId,
      card_id,
      binder_id: bid,
      position: nextPos + i,
    }))
    const { error } = await supabase
      .from('owned_cards')
      .upsert(rows, { onConflict: 'user_id,binder_id,card_id' })

    if (error) { console.error('Failed to add cards:', error.message); return false }

    if (!binderId || binderId === bid) {
      setOwned(prev => new Set([...prev, ...cardIds]))
      setOrderedIds(prev => [...prev, ...cardIds])
    }
    return true
  }

  async function removeMultiple(cardIds: string[]) {
    if (cardIds.length === 0) return
    const removed = new Set(cardIds)

    setOwned(prev => {
      const next = new Set(prev)
      cardIds.forEach(id => next.delete(id))
      return next
    })
    setOrderedIds(prev => prev.filter(id => !removed.has(id)))

    let q = supabase.from('owned_cards').delete().eq('user_id', userId).in('card_id', cardIds)
    if (binderId) q = q.eq('binder_id', binderId)

    const { error } = await q
    if (error) {
      console.error('Failed to remove cards:', error.message)
      fetchOwned()
    }
  }

  async function reorderCards(fromId: string, toId: string) {
    if (!binderId || fromId === toId) return
    const from = orderedIds.indexOf(fromId)
    const to = orderedIds.indexOf(toId)
    if (from === -1 || to === -1) return

    const newOrder = arrayMove(orderedIds, from, to)
    setOrderedIds(newOrder)

    await supabase.from('owned_cards').upsert(
      newOrder.map((card_id, position) => ({ user_id: userId, binder_id: binderId, card_id, position })),
      { onConflict: 'user_id,binder_id,card_id' }
    )
  }

  return { owned, orderedIds, loading, addMultiple, removeMultiple, reorderCards }
}
