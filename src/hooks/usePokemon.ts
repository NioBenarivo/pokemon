import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Pokemon } from '../data/cards'

const PAGE_SIZE = 48

export function usePokemon(searchQuery: string) {
  const [pokemon, setPokemon] = useState<Pokemon[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  // Reset and fetch page 1 whenever search changes
  useEffect(() => {
    setLoading(true)
    setPokemon([])
    setOffset(0)
    setHasMore(false)

    let q = supabase
      .from('pokemon')
      .select('*')
      .order('id')
      .range(0, PAGE_SIZE - 1)

    if (searchQuery) q = q.ilike('name', `%${searchQuery}%`)

    q.then(({ data, error }) => {
      if (error) { console.error('Failed to fetch pokemon:', error.message); setLoading(false); return }
      const fetched = (data ?? []) as Pokemon[]
      setPokemon(fetched)
      setHasMore(fetched.length === PAGE_SIZE)
      setOffset(fetched.length)
      setLoading(false)
    })
  }, [searchQuery])

  async function loadMore() {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)

    let q = supabase
      .from('pokemon')
      .select('*')
      .order('id')
      .range(offset, offset + PAGE_SIZE - 1)

    if (searchQuery) q = q.ilike('name', `%${searchQuery}%`)

    const { data, error } = await q
    if (error) { console.error('Failed to load more pokemon:', error.message); setLoadingMore(false); return }

    const fetched = (data ?? []) as Pokemon[]
    setPokemon(prev => [...prev, ...fetched])
    setHasMore(fetched.length === PAGE_SIZE)
    setOffset(prev => prev + fetched.length)
    setLoadingMore(false)
  }

  return { pokemon, loading, loadingMore, hasMore, loadMore }
}
