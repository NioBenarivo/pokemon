import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useWishlist(userId: string) {
  const [wishlist, setWishlist] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }

    async function fetchWishlist() {
      setLoading(true)
      const ids = new Set<string>()
      const PAGE = 1000
      let from = 0

      while (true) {
        const { data, error } = await supabase
          .from('wishlisted_cards')
          .select('card_id')
          .eq('user_id', userId)
          .range(from, from + PAGE - 1)

        if (error) { console.error('Failed to fetch wishlist:', error.message); break }
        if (!data?.length) break
        data.forEach((r: { card_id: string }) => ids.add(r.card_id))
        if (data.length < PAGE) break
        from += PAGE
      }

      setWishlist(ids)
      setLoading(false)
    }

    fetchWishlist()
  }, [userId])

  async function addToWishlist(cardIds: string[]) {
    if (cardIds.length === 0) return
    const rows = cardIds.map(card_id => ({ user_id: userId, card_id }))
    const { error } = await supabase
      .from('wishlisted_cards')
      .upsert(rows, { onConflict: 'user_id,card_id' })

    if (error) { console.error('Failed to add to wishlist:', error.message); return }
    setWishlist(prev => new Set([...prev, ...cardIds]))
  }

  async function removeFromWishlist(cardIds: string[]) {
    if (cardIds.length === 0) return
    setWishlist(prev => {
      const next = new Set(prev)
      cardIds.forEach(id => next.delete(id))
      return next
    })
    const { error } = await supabase
      .from('wishlisted_cards')
      .delete()
      .eq('user_id', userId)
      .in('card_id', cardIds)

    if (error) {
      console.error('Failed to remove from wishlist:', error.message)
      setWishlist(prev => new Set([...prev, ...cardIds]))
    }
  }

  return { wishlist, loading, addToWishlist, removeFromWishlist }
}
