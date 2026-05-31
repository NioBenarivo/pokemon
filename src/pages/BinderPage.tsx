import { useState, useEffect, useRef } from 'react'
import { useInfiniteCards } from '../hooks/useInfiniteCards'
import { useAuth } from '../hooks/useAuth'
import { useOwnedCards } from '../hooks/useOwnedCards'
import { useToast } from '../hooks/useToast'
import PokemonCard from '../components/PokemonCard'
import CardLightbox from '../components/CardLightbox'
import Toast from '../components/Toast'
import ProgressBar from '../components/ProgressBar'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'
import { SEARCH_DEBOUNCE_MS, SCROLL_ROOT_MARGIN } from '../constants/config'
import type { Card } from '../data/cards'

export default function BinderPage() {
  const { user, signOut } = useAuth()
  const { owned, removeMultiple } = useOwnedCards(user?.id ?? '')
  const { toasts, showToast, removeToast } = useToast()

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedPack, setSelectedPack] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [lightboxCard, setLightboxCard] = useState<Card | null>(null)
  const [removing, setRemoving] = useState(false)
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchQuery])

  const { cards, packs, loading, reloading, loadingMore, loadMore } = useInfiniteCards({
    activeTab: 'binder',
    searchQuery: debouncedSearch,
    selectedPack,
    ownedIds: owned,
  })

  const [selectedPackTotal, setSelectedPackTotal] = useState<number | null>(null)
  const [selectedPackOwned, setSelectedPackOwned] = useState(0)
  const ownedKey = [...owned].sort().join(',')

  useEffect(() => {
    if (!selectedPack || owned.size === 0) {
      setSelectedPackTotal(null)
      setSelectedPackOwned(0)
      return
    }

    let cancelled = false

    Promise.all([
      supabase.from('packs').select('card_count').eq('name', selectedPack).single(),
      supabase
        .from('scraped_cards')
        .select('*', { count: 'exact', head: true })
        .eq('pack', selectedPack)
        .in('id', [...owned]),
    ]).then(([packRes, ownedRes]) => {
      if (cancelled) return
      setSelectedPackTotal(packRes.data?.card_count ?? null)
      setSelectedPackOwned(ownedRes.count ?? 0)
    })

    return () => { cancelled = true }
  }, [selectedPack, ownedKey])

  const loadMoreRef = useRef(loadMore)
  loadMoreRef.current = loadMore

  const sentinelVisibleRef = useRef(false)

  useEffect(() => {
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        sentinelVisibleRef.current = entry.isIntersecting
        if (entry.isIntersecting) loadMoreRef.current()
      },
      { rootMargin: SCROLL_ROOT_MARGIN }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [sentinel])

  useEffect(() => {
    if (!loading && !reloading && !loadingMore && sentinelVisibleRef.current) {
      loadMoreRef.current()
    }
  }, [loading, reloading, loadingMore])

  function toggleSelected(cardId: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(cardId)) next.delete(cardId)
      else next.add(cardId)
      if (next.size === 0) setSelectMode(false)
      return next
    })
  }

  function handleCardClick(card: Card) {
    if (selectMode) toggleSelected(card.id)
    else setLightboxCard(card)
  }

  function handleCardLongPress(card: Card) {
    if (!selectMode) setSelectMode(true)
    toggleSelected(card.id)
  }

  async function handleRemove() {
    if (selected.size === 0) return
    setRemoving(true)
    await removeMultiple([...selected])
    showToast(`${selected.size} card${selected.size > 1 ? 's' : ''} removed from binder`)
    setSelected(new Set())
    setSelectMode(false)
    setRemoving(false)
  }

  const username = user?.email?.split('@')[0] ?? 'Trainer'

  return (
    <div className="bg-white min-h-screen py-10 px-4 font-sans">
      <div className="max-w-4xl mx-auto">

        <Header title="My Binder" subtitle={`${username} · ${owned.size} cards`} onSignOut={signOut} />

        {/* Search + Pack filter */}
        <div className="flex flex-wrap gap-2 mb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search your cards..."
            className="flex-1 min-w-[160px] px-4 py-2 text-sm rounded-xl border border-zinc-200 text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors"
          />
          {packs.length > 0 && (
            <select
              value={selectedPack ?? ''}
              onChange={e => setSelectedPack(e.target.value || null)}
              className="appearance-none px-4 py-2 text-sm rounded-xl border border-zinc-200 text-zinc-600 focus:outline-none focus:border-zinc-400 transition-colors bg-white"
            >
              <option value="">All packs</option>
              {packs.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
        </div>

        {selectedPack && selectedPackTotal && (
          <div className="mb-5">
            <ProgressBar owned={selectedPackOwned} total={selectedPackTotal} />
          </div>
        )}

        {/* Action bar */}
        {selectMode && (
          <div className="flex items-center justify-between mb-4 px-4 py-3 bg-zinc-50 rounded-xl">
            <span className="text-sm text-zinc-600">
              {selected.size} card{selected.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setSelected(new Set()); setSelectMode(false) }}
                className="text-xs text-zinc-400 hover:text-zinc-700 px-3 py-1.5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRemove}
                disabled={removing}
                className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                {removing ? 'Removing...' : 'Remove from Binder'}
              </button>
            </div>
          </div>
        )}

        {/* Grid */}
        {loading || reloading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 border-zinc-300 border-t-zinc-600 animate-spin" />
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-zinc-400 text-sm">
              {debouncedSearch || selectedPack
                ? 'No cards match your search.'
                : "Your binder is empty. Browse Pokémon or Cards to add some!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {cards.map(card => (
              <PokemonCard
                key={card.id}
                card={card}
                isOwned={true}
                isSelected={selected.has(card.id)}
                selectMode={selectMode}
                onClick={() => handleCardClick(card)}
                onLongPress={() => handleCardLongPress(card)}
                readOnly
                removeMode
              />
            ))}
          </div>
        )}

        <div ref={setSentinel} className="h-1" />

        {loadingMore && (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 rounded-full border-2 border-zinc-300 border-t-zinc-600 animate-spin" />
          </div>
        )}

      </div>

      {lightboxCard && (
        <CardLightbox
          card={lightboxCard}
          onClose={() => setLightboxCard(null)}
          isOwned={owned.has(lightboxCard.id)}
        />
      )}

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
