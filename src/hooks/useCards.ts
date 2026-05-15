import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getCachedCards, setCachedCards } from '../lib/cardsCache'
import { type Card } from '../data/cards'

export function useCards(userId: string) {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    async function fetchCards() {
      const cached = getCachedCards()
      if (cached) {
        setCards(cached)
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .order('id')

      if (!error && data) {
        const fetched = data as Card[]
        setCards(fetched)
        setCachedCards(fetched)
      }
      setLoading(false)
    }

    fetchCards()
  }, [userId])

  return { cards, loading }
}
