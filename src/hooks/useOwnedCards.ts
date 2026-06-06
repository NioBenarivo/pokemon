import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export const MAX_BINDER = 540

export function useOwnedCards(userId: string, binderId?: string) {
  const [owned, setOwned] = useState<Set<string>>(new Set())
  const [slots, setSlots] = useState<(string | null)[]>(Array(MAX_BINDER).fill(null))
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
      if (binderId) {
        const newSlots: (string | null)[] = Array(MAX_BINDER).fill(null)
        data.forEach((r: { card_id: string; position: number }) => {
          if (r.position >= 0 && r.position < MAX_BINDER) {
            newSlots[r.position] = r.card_id
          }
        })
        setSlots(newSlots)
      }
    }
    setLoading(false)
  }

  async function addMultiple(cardIds: string[], targetBinderId?: string): Promise<true | 'full' | 'error'> {
    if (cardIds.length === 0) return true
    const bid = targetBinderId ?? binderId
    if (!bid) return 'error'

    let rows: { user_id: string; card_id: string; binder_id: string; position: number }[]

    if (bid === binderId) {
      // Current binder — fill into the first available empty slots
      const insertions: { card_id: string; position: number }[] = []
      let si = 0
      for (const card_id of cardIds) {
        while (si < MAX_BINDER && slots[si] !== null) si++
        if (si >= MAX_BINDER) break
        insertions.push({ card_id, position: si++ })
      }
      if (insertions.length === 0) return 'full'
      rows = insertions.map(({ card_id, position }) => ({
        user_id: userId, card_id, binder_id: bid, position,
      }))
    } else {
      // Different binder — append after the current highest position
      const { data: existing } = await supabase
        .from('owned_cards')
        .select('position')
        .eq('user_id', userId)
        .eq('binder_id', bid)
        .order('position', { ascending: false })
        .limit(1)
      const nextPos = existing && existing.length > 0 ? existing[0].position + 1 : 0
      if (nextPos >= MAX_BINDER) return 'full'
      const fitCount = Math.min(cardIds.length, MAX_BINDER - nextPos)
      rows = cardIds.slice(0, fitCount).map((card_id, i) => ({
        user_id: userId, card_id, binder_id: bid, position: nextPos + i,
      }))
    }

    const { error } = await supabase
      .from('owned_cards')
      .upsert(rows, { onConflict: 'user_id,binder_id,card_id' })

    if (error) { console.error('Failed to add cards:', error.message); return 'error' }

    setOwned(prev => new Set([...prev, ...rows.map(r => r.card_id)]))
    if (bid === binderId) {
      setSlots(prev => {
        const next = [...prev]
        rows.forEach(r => { next[r.position] = r.card_id })
        return next
      })
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
    setSlots(prev => prev.map(id => (id && removed.has(id)) ? null : id))

    let q = supabase.from('owned_cards').delete().eq('user_id', userId).in('card_id', cardIds)
    if (binderId) q = q.eq('binder_id', binderId)

    const { error } = await q
    if (error) {
      console.error('Failed to remove cards:', error.message)
      fetchOwned()
    }
  }

  // Moves a card to a target slot; if that slot is occupied the two cards swap.
  async function moveCard(cardId: string, toSlot: number) {
    if (!binderId || toSlot < 0 || toSlot >= MAX_BINDER) return
    const fromSlot = slots.indexOf(cardId)
    if (fromSlot === -1 || fromSlot === toSlot) return

    const displaced = slots[toSlot]

    setSlots(prev => {
      const next = [...prev]
      next[toSlot] = cardId
      next[fromSlot] = displaced
      return next
    })

    const updates: { user_id: string; binder_id: string; card_id: string; position: number }[] = [
      { user_id: userId, binder_id: binderId, card_id: cardId, position: toSlot },
    ]
    if (displaced) {
      updates.push({ user_id: userId, binder_id: binderId, card_id: displaced, position: fromSlot })
    }

    await supabase.from('owned_cards').upsert(updates, { onConflict: 'user_id,binder_id,card_id' })
  }

  return { owned, slots, loading, addMultiple, removeMultiple, moveCard }
}
