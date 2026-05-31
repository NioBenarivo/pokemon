import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Returns a Map<pack_id, owned_count> for all packs the user has cards from.
 * Paginates through owned_cards joined with scraped_cards to handle large collections.
 */
export function usePackOwnedCounts(userId: string) {
  const [counts, setCounts] = useState<Map<number, number>>(new Map())

  useEffect(() => {
    if (!userId) return

    async function fetchCounts() {
      const map = new Map<number, number>()
      const PAGE = 1000
      let from = 0

      while (true) {
        const { data, error } = await supabase
          .from('owned_cards')
          .select('scraped_cards(pack_id)')
          .eq('user_id', userId)
          .range(from, from + PAGE - 1)

        if (error) { console.error('Failed to fetch owned counts:', error.message); break }
        if (!data?.length) break

        for (const row of data) {
          const packId = (row.scraped_cards as unknown as { pack_id: number | null } | null)?.pack_id
          if (packId != null) map.set(packId, (map.get(packId) ?? 0) + 1)
        }

        if (data.length < PAGE) break
        from += PAGE
      }

      setCounts(map)
    }

    fetchCounts()
  }, [userId])

  return counts
}
