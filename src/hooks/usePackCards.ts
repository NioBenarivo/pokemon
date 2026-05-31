import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Card, Pack } from '../data/cards'

const PAGE_SIZE = 1000

async function fetchAllCards(packId: number): Promise<Card[]> {
  const all: Card[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('scraped_cards')
      .select('*')
      .eq('pack_id', packId)
      .order('name')
      .range(from, from + PAGE_SIZE - 1)

    if (error) { console.error('Failed to fetch pack cards:', error.message); break }
    const rows = (data ?? []) as Card[]
    all.push(...rows)
    if (rows.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return all
}

export function usePackCards(packId: number) {
  const [pack, setPack] = useState<Pack | null>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!packId || isNaN(packId)) { setLoading(false); return }
    setLoading(true)

    Promise.all([
      supabase.from('packs').select('*').eq('id', packId).single(),
      fetchAllCards(packId),
    ]).then(([packRes, cards]) => {
      if (packRes.error) console.error('Failed to fetch pack:', packRes.error.message)
      else setPack(packRes.data as Pack)
      setCards(cards)
      setLoading(false)
    })
  }, [packId])

  return { pack, cards, loading }
}
