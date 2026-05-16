// ─────────────────────────────────────────────────────────────
// hooks/useInfiniteCards.ts
//
// The most complex hook in the app. It handles:
//   • Fetching cards from Supabase in pages of 12 (infinite scroll)
//   • Filtering by tab (All Cards / My Binder), search query, and pack
//   • Cancelling stale requests when filters change quickly
//   • Caching results in memory so switching filters feels instant
//
// ── How infinite scroll works ────────────────────────────────
// Instead of loading all 500+ cards at once, we load 12 at a time.
// When the user scrolls near the bottom, App.tsx triggers loadMore()
// which fetches the next 12 and appends them to the list.
//
// ── The two kinds of state ───────────────────────────────────
// useState  → causes a re-render when changed. Used for values the UI
//             needs to display (cards list, loading flags, etc.)
//
// useRef    → persists a value between renders WITHOUT causing a re-render.
//             Used for control logic (offset tracking, guard flags, etc.)
//             Reading a ref always gives you the current value — no stale
//             closures, unlike state.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Card } from '../data/cards'
import { PAGE_SIZE } from '../constants/config'


// The filter values this hook accepts as input from App.tsx
interface Filters {
  activeTab: 'all' | 'binder'
  searchQuery: string
  selectedPack: string | null
  ownedIds: Set<number>  // which card IDs the user owns
}


// What each cache entry stores so we can restore a previous filter state
interface CacheEntry {
  cards: Card[]   // all cards loaded so far for this filter combo
  hasMore: boolean // whether there are more pages to load
  offset: number  // where the next page would start
}

export function useInfiniteCards({ activeTab, searchQuery, selectedPack, ownedIds }: Filters) {

  // ── UI state (these trigger re-renders when they change) ─────────────────
  const [cards, setCards] = useState<Card[]>([])       // cards shown in the grid
  const [packs, setPacks] = useState<string[]>([])     // available packs for the dropdown
  const [dbTotal, setDbTotal] = useState(0)            // total cards in the database (for StatsBar)
  const [loading, setLoading] = useState(true)         // true on first load (full-screen spinner)
  const [reloading, setReloading] = useState(false)    // true when filters change (grid spinner)
  const [loadingMore, setLoadingMore] = useState(false) // true when fetching the next page
  const [hasMore, setHasMore] = useState(false)        // whether there are more pages to load


  // ── Control refs (these do NOT trigger re-renders) ───────────────────────

  // Tracks what row offset to start from for the next page fetch.
  // Example: after loading page 1 (rows 0–11), offsetRef = 12.
  //          after loading page 2 (rows 12–23), offsetRef = 24.
  const offsetRef = useRef(0)

  // A guard flag — true while a loadMore fetch is in progress.
  // Prevents double-fetching if the user scrolls fast.
  const busyRef = useRef(false)

  // A "generation counter" that increments every time filters change.
  // Used to discard stale responses. See "cancelling stale requests" below.
  const genRef = useRef(0)

  // Whether the component has finished its first fetch.
  // Used to decide: show full-screen spinner (first load) or grid spinner (filter change).
  const hasMounted = useRef(false)

  // A ref copy of the cards array. loadMore() reads this instead of the
  // state value because state inside a callback can be stale (old snapshot).
  // Refs always give the current value.
  const cardsRef = useRef<Card[]>([])

  // In-memory cache for card results, keyed by the filter combo string.
  // Example key: "all|pikachu|Genetic Apex|"
  // Example value: { cards: [...], hasMore: true, offset: 24 }
  const pageCache = useRef<Map<string, CacheEntry>>(new Map())

  // In-memory cache for pack list results, keyed by tab + owned IDs.
  // Separate from pageCache because pack options change less often.
  const packsCache = useRef<Map<string, string[]>>(new Map())


  // ── ownedKey: convert Set to a stable string ─────────────────────────────
  //
  // React can't compare Sets — it doesn't know if Set {3,7} changed to Set {3,7,42}.
  // So we turn the Set into a sorted comma-separated string: "3,7" or "3,7,42".
  // This string CAN be used as a useEffect dependency and as a cache key.
  //
  // We only do this for the binder tab because "All Cards" doesn't filter by owned.
  const ownedKey = activeTab === 'binder'
    ? [...ownedIds].sort((a, b) => a - b).join(',')
    : ''


  // ── fetchTotal: count all cards in the database ──────────────────────────
  //
  // This is for the "18 / 120 collected" display in StatsBar.
  // { count: 'exact', head: true } means: don't return any rows,
  // just give us the total count. This is very fast.
  async function fetchTotal() {
    const { count, error } = await supabase
      .from('cards')
      .select('*', { count: 'exact', head: true })
    if (error) { console.error('Failed to fetch card count:', error.message); return }
    setDbTotal(count ?? 0)
  }

  // Run fetchTotal once when the hook first mounts.
  // Also exported so App.tsx can call it after adding/removing cards.
  useEffect(() => {
    fetchTotal()
  }, [])


  // ── Effect 2: fetch pack names for the filter dropdown ───────────────────
  //
  // This only re-runs when the tab changes or the binder contents change.
  // It does NOT re-run when search or selectedPack changes — the available
  // packs don't depend on which pack you've already filtered to.
  //
  // Example result for "All Cards" tab: ["Genetic Apex", "Promo-A", "Space-Time Smackdown"]
  // Example result for "My Binder" tab: only packs the user actually owns cards from
  useEffect(() => {
    // Edge case: binder tab but user owns nothing — no packs to show
    if (activeTab === 'binder' && ownedIds.size === 0) {
      setPacks([])
      return
    }

    // Check the cache first
    const key = `${activeTab}|${ownedKey}`
    const cached = packsCache.current.get(key)
    if (cached) {
      setPacks(cached)
      return
    }

    // Cache miss: fetch distinct pack names from the database
    let q = supabase.from('cards').select('pack')
    if (activeTab === 'binder') q = q.in('id', [...ownedIds])  // only owned cards' packs

    q.then(({ data, error }) => {
      if (error) { console.error('Failed to fetch packs:', error.message); return }

      // data looks like: [{ pack: "Genetic Apex" }, { pack: "Genetic Apex" }, { pack: "Promo-A" }]
      // We deduplicate with new Set(...) and sort alphabetically
      const unique = [...new Set((data ?? []).map(r => r.pack))].sort()
      packsCache.current.set(key, unique)
      setPacks(unique)
    })
  }, [activeTab, ownedKey])


  // ── buildQuery: construct a Supabase query with current filters applied ───
  //
  // "from" is the row offset (0 = page 1, 12 = page 2, 24 = page 3, ...)
  //
  // .range(from, from + PAGE_SIZE - 1) is SQL LIMIT/OFFSET:
  //   range(0, 11)  → rows 0 to 11  (first 12 cards)
  //   range(12, 23) → rows 12 to 23 (next 12 cards)
  //
  // .ilike('name', '%pikachu%') is case-insensitive SQL LIKE search.
  // The % wildcards mean "anything before or after the search term".
  function buildQuery(from: number) {
    let q = supabase
      .from('cards')
      .select('*', { count: 'exact' })
      .order('id')
      .range(from, from + PAGE_SIZE - 1)

    if (activeTab === 'binder') q = q.in('id', [...ownedIds])  // only owned card IDs
    if (searchQuery) q = q.ilike('name', `%${searchQuery}%`)   // name contains search term
    if (selectedPack) q = q.eq('pack', selectedPack)           // exact pack match

    return q
  }


  // ── Effect 3: reset and fetch page 1 when any filter changes ─────────────
  //
  // Runs every time the tab, search, pack filter, or binder contents change.
  // It resets the card list to empty and fetches the first page fresh.
  // Before hitting the database, it checks the in-memory cache.
  useEffect(() => {

    // Edge case: binder is empty — show empty state immediately
    if (activeTab === 'binder' && ownedIds.size === 0) {
      cardsRef.current = []
      setCards([])
      setHasMore(false)
      setLoading(false)
      setReloading(false)
      hasMounted.current = true
      return
    }

    // Build a cache key from all active filters.
    // Example: "binder|pikachu|Genetic Apex|3,7,42"
    const key = `${activeTab}|${searchQuery}|${selectedPack ?? ''}|${ownedKey}`

    // ── Cache hit: restore previous result instantly ────────────────────
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

    // ── Cache miss: fetch from Supabase ────────────────────────────────

    // Increment the generation counter BEFORE the async fetch starts.
    // If another filter change fires before this fetch completes,
    // genRef.current will be higher, and this response will be discarded.
    const gen = ++genRef.current

    // Reset all control state for the new fetch
    offsetRef.current = 0
    busyRef.current = false
    cardsRef.current = []
    setCards([])
    setHasMore(false)

    // First load → full screen spinner. Filter change → grid spinner.
    if (!hasMounted.current) {
      setLoading(true)
    } else {
      setReloading(true)
    }

    buildQuery(0).then(({ data, error }) => {

      // ── Stale response check ───────────────────────────────────────
      // If the user changed filters while this request was in-flight,
      // genRef.current will be higher than our captured gen value.
      // Discard this response to avoid overwriting the newer result.
      if (gen !== genRef.current) return

      if (error) {
        console.error('Failed to fetch cards:', error.message)
        setLoading(false)
        setReloading(false)
        return
      }

      const fetched = (data ?? []) as Card[]

      // If we got exactly PAGE_SIZE cards back, there might be more.
      // If we got fewer, we've reached the end.
      const more = fetched.length === PAGE_SIZE
      const offset = fetched.length  // next fetch starts here

      // Update both the ref and state
      cardsRef.current = fetched
      setCards(fetched)
      setHasMore(more)
      offsetRef.current = offset

      // Save to cache so next time this filter combo is visited it's instant
      pageCache.current.set(key, { cards: fetched, hasMore: more, offset })

      setLoading(false)
      setReloading(false)
      hasMounted.current = true
    })
  }, [activeTab, searchQuery, selectedPack, ownedKey])


  // ── loadMore: fetch and append the next page ──────────────────────────────
  //
  // Called by App.tsx when the IntersectionObserver sees the bottom sentinel
  // div scroll into view.
  //
  // useCallback prevents this function from being recreated on every render.
  // Without it, App.tsx's useEffect (which depends on loadMore) would re-run
  // every render and re-attach the IntersectionObserver repeatedly.
  const loadMore = useCallback(async () => {

    // Guard: don't fetch if we're already fetching or there's nothing left
    if (busyRef.current || !hasMore) return

    const gen = genRef.current  // capture current generation
    busyRef.current = true
    setLoadingMore(true)

    // Fetch the next page starting from the current offset
    const { data, error } = await buildQuery(offsetRef.current)

    if (error) {
      console.error('Failed to load more cards:', error.message)
      busyRef.current = false
      setLoadingMore(false)
      return
    }

    // Discard if filters changed while this was loading
    if (gen !== genRef.current) {
      busyRef.current = false
      setLoadingMore(false)
      return
    }

    const fetched = (data ?? []) as Card[]

    // Append new cards to existing ones using the ref (not state, which
    // would be stale inside this async callback)
    const updated = [...cardsRef.current, ...fetched]
    const more = fetched.length === PAGE_SIZE
    const newOffset = offsetRef.current + fetched.length

    // Update both ref and state
    cardsRef.current = updated
    setCards(updated)
    setHasMore(more)
    offsetRef.current = newOffset

    // Update the cache entry to include the newly loaded cards
    const key = `${activeTab}|${searchQuery}|${selectedPack ?? ''}|${ownedKey}`
    pageCache.current.set(key, { cards: updated, hasMore: more, offset: newOffset })

    busyRef.current = false
    setLoadingMore(false)
  }, [hasMore, activeTab, searchQuery, selectedPack, ownedKey])

  return { cards, packs, dbTotal, loading, reloading, loadingMore, hasMore, loadMore, fetchTotal }
}
