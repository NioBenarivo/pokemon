import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Card } from '../data/cards'
import { PAGE_SIZE } from '../constants/config'

interface Filters {
  wishlistIds: Set<string>
  searchQuery: string
  selectedPack: string | null
}

interface CacheEntry {
  cards: Card[]
  hasMore: boolean
  offset: number
}

export function useInfiniteWishlistCards({ wishlistIds, searchQuery, selectedPack }: Filters) {
  const [cards, setCards] = useState<Card[]>([])
  const [packs, setPacks] = useState<string[]>([])
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

  const wishlistKey = [...wishlistIds].sort().join(',')

  useEffect(() => {
    if (wishlistIds.size === 0) { setPacks([]); return }

    const cached = packsCache.current.get(wishlistKey)
    if (cached) { setPacks(cached); return }

    supabase
      .from('scraped_cards')
      .select('pack')
      .in('id', [...wishlistIds])
      .then(({ data }) => {
        const unique = [...new Set((data ?? []).map(r => r.pack))].sort()
        packsCache.current.set(wishlistKey, unique)
        setPacks(unique)
      })
  }, [wishlistKey])

  function buildQuery(from: number) {
    let q = supabase
      .from('scraped_cards')
      .select('*', { count: 'exact' })
      .in('id', [...wishlistIds])
      .order('name')
      .range(from, from + PAGE_SIZE - 1)

    if (searchQuery) q = q.ilike('name', `%${searchQuery}%`)
    if (selectedPack) q = q.eq('pack', selectedPack)

    return q
  }

  useEffect(() => {
    if (wishlistIds.size === 0) {
      cardsRef.current = []
      setCards([])
      setHasMore(false)
      setLoading(false)
      setReloading(false)
      hasMounted.current = true
      return
    }

    const key = `${wishlistKey}|${searchQuery}|${selectedPack ?? ''}`

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

    buildQuery(0).then(({ data, error }) => {
      if (gen !== genRef.current) return

      if (error) {
        console.error('Failed to fetch wishlist cards:', error.message)
        setLoading(false)
        setReloading(false)
        return
      }

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
  }, [wishlistKey, searchQuery, selectedPack])

  const loadMore = useCallback(async () => {
    if (busyRef.current || !hasMore) return

    const gen = genRef.current
    busyRef.current = true
    setLoadingMore(true)

    const { data, error } = await buildQuery(offsetRef.current)

    if (error) {
      console.error('Failed to load more wishlist cards:', error.message)
      busyRef.current = false
      setLoadingMore(false)
      return
    }

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

    const key = `${wishlistKey}|${searchQuery}|${selectedPack ?? ''}`
    pageCache.current.set(key, { cards: updated, hasMore: more, offset: newOffset })

    busyRef.current = false
    setLoadingMore(false)
  }, [hasMore, wishlistKey, searchQuery, selectedPack])

  return { cards, packs, loading, reloading, loadingMore, hasMore, loadMore }
}
