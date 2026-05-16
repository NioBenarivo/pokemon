import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Card } from '../data/cards'

const PAGE_SIZE = 12

interface Filters {
  activeTab: 'all' | 'binder'
  searchQuery: string
  selectedPack: string | null
  ownedIds: Set<number>
}

interface CacheEntry {
  cards: Card[]
  hasMore: boolean
  offset: number
}

export function useInfiniteCards({ activeTab, searchQuery, selectedPack, ownedIds }: Filters) {
  const [cards, setCards] = useState<Card[]>([])
  const [packs, setPacks] = useState<string[]>([])
  const [dbTotal, setDbTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [reloading, setReloading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  const offsetRef = useRef(0)
  const busyRef = useRef(false)
  const genRef = useRef(0)
  const hasMounted = useRef(false)
  const cardsRef = useRef<Card[]>([])
  const pageCache = useRef<Map<string, CacheEntry>>(new Map())
  const packsCache = useRef<Map<string, string[]>>(new Map())

  // Stable key for owned IDs — only relevant for binder tab
  const ownedKey = activeTab === 'binder'
    ? [...ownedIds].sort((a, b) => a - b).join(',')
    : ''

  // Fetch total card count once
  useEffect(() => {
    supabase
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .then(({ count }) => setDbTotal(count ?? 0))
  }, [])

  // Fetch available packs for the filter dropdown
  useEffect(() => {
    if (activeTab === 'binder' && ownedIds.size === 0) {
      setPacks([])
      return
    }

    const key = `${activeTab}|${ownedKey}`
    const cached = packsCache.current.get(key)
    if (cached) {
      setPacks(cached)
      return
    }

    let q = supabase.from('cards').select('pack')
    if (activeTab === 'binder') q = q.in('id', [...ownedIds])
    q.then(({ data }) => {
      const unique = [...new Set((data ?? []).map(r => r.pack))].sort()
      packsCache.current.set(key, unique)
      setPacks(unique)
    })
  }, [activeTab, ownedKey])

  function buildQuery(from: number) {
    let q = supabase
      .from('cards')
      .select('*', { count: 'exact' })
      .order('id')
      .range(from, from + PAGE_SIZE - 1)
    if (activeTab === 'binder') q = q.in('id', [...ownedIds])
    if (searchQuery) q = q.ilike('name', `%${searchQuery}%`)
    if (selectedPack) q = q.eq('pack', selectedPack)
    return q
  }

  // Reset and fetch first page when filters change
  useEffect(() => {
    if (activeTab === 'binder' && ownedIds.size === 0) {
      cardsRef.current = []
      setCards([])
      setHasMore(false)
      setLoading(false)
      setReloading(false)
      hasMounted.current = true
      return
    }

    const key = `${activeTab}|${searchQuery}|${selectedPack ?? ''}|${ownedKey}`
    const cached = pageCache.current.get(key)

    if (cached) {
      cardsRef.current = cached.cards
      setCards(cached.cards)
      setHasMore(cached.hasMore)
      offsetRef.current = cached.offset
      setLoading(false)
      setReloading(false)
      hasMounted.current = true
      return
    }

    const gen = ++genRef.current
    offsetRef.current = 0
    busyRef.current = false
    cardsRef.current = []
    setCards([])
    setHasMore(false)

    if (!hasMounted.current) {
      setLoading(true)
    } else {
      setReloading(true)
    }

    buildQuery(0).then(({ data }) => {
      if (gen !== genRef.current) return
      const fetched = (data ?? []) as Card[]
      const more = fetched.length === PAGE_SIZE
      const offset = fetched.length
      cardsRef.current = fetched
      setCards(fetched)
      setHasMore(more)
      offsetRef.current = offset
      pageCache.current.set(key, { cards: fetched, hasMore: more, offset })
      setLoading(false)
      setReloading(false)
      hasMounted.current = true
    })
  }, [activeTab, searchQuery, selectedPack, ownedKey])

  const loadMore = useCallback(async () => {
    if (busyRef.current || !hasMore) return
    const gen = genRef.current
    busyRef.current = true
    setLoadingMore(true)

    const { data } = await buildQuery(offsetRef.current)
    if (gen !== genRef.current) {
      busyRef.current = false
      setLoadingMore(false)
      return
    }

    const fetched = (data ?? []) as Card[]
    const updated = [...cardsRef.current, ...fetched]
    const more = fetched.length === PAGE_SIZE
    const newOffset = offsetRef.current + fetched.length

    cardsRef.current = updated
    setCards(updated)
    setHasMore(more)
    offsetRef.current = newOffset

    const key = `${activeTab}|${searchQuery}|${selectedPack ?? ''}|${ownedKey}`
    pageCache.current.set(key, { cards: updated, hasMore: more, offset: newOffset })

    busyRef.current = false
    setLoadingMore(false)
  }, [hasMore, activeTab, searchQuery, selectedPack, ownedKey])

  return { cards, packs, dbTotal, loading, reloading, loadingMore, hasMore, loadMore }
}
