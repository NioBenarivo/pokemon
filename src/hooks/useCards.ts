// ─────────────────────────────────────────────────────────────
// hooks/useCards.ts
//
// A simple hook that fetches ALL cards from Supabase at once.
//
// NOTE: This is an older, simpler hook kept for reference.
//       The main app uses useInfiniteCards instead, which fetches
//       cards in pages of 12 (better for large collections).
//       This hook is used by the admin page via useAdminCards.
//
// What it does:
//   1. Check localStorage for a cached copy of the cards
//   2. If cached, use that (instant, no network call)
//   3. If not cached, fetch all cards from Supabase and cache the result
//
// What it gives you:
//   cards   — the full array of Card objects
//   loading — true while the fetch is in progress
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getCachedCards, setCachedCards } from '../lib/cardsCache'
import { type Card } from '../data/cards'

export function useCards(userId: string) {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return  // no user logged in — wait

    async function fetchCards() {

      // ── Check localStorage cache first ─────────────────────────────────
      // getCachedCards() returns null if there's no cache or it's expired.
      const cached = getCachedCards()
      if (cached) {
        setCards(cached)
        setLoading(false)
        return  // done — no need to hit the database
      }

      // ── Cache miss: fetch all cards from Supabase ──────────────────────
      // .select('*') means "return all columns" (id, name, pack, image)
      // .order('id') sorts cards by their ID number (1, 2, 3...)
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .order('id')

      if (!error && data) {
        const fetched = data as Card[]
        setCards(fetched)
        setCachedCards(fetched) // save to localStorage for next time
      }

      setLoading(false)
    }

    fetchCards()
  }, [userId]) // re-runs if userId changes

  return { cards, loading }
}
