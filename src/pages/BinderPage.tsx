import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  DndContext, DragOverlay, closestCenter,
  PointerSensor, KeyboardSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, useSortable, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAuth } from '../hooks/useAuth'
import { useOwnedCards } from '../hooks/useOwnedCards'
import { useToast } from '../hooks/useToast'
import { useInfiniteCards } from '../hooks/useInfiniteCards'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import CardLightbox from '../components/CardLightbox'
import Toast from '../components/Toast'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'
import { useSearchDebounce } from '../hooks/useSearchDebounce'
import { useCardSelection } from '../hooks/useCardSelection'
import PokemonCard from '../components/PokemonCard'
import Spinner from '../components/Spinner'
import type { Card } from '../data/cards'

const VISIBLE_STEP = 20

export default function BinderPage() {
  const { id: binderId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { owned, orderedIds, loading: ownedLoading, removeMultiple, reorderCards } =
    useOwnedCards(user?.id ?? '', binderId)
  const { toasts, showToast, removeToast } = useToast()
  const { searchQuery, setSearchQuery, debouncedSearch } = useSearchDebounce()
  const { selected, selectMode, lightboxCard, setLightboxCard, clearSelection, handleCardClick, handleCardLongPress } =
    useCardSelection()

  const [binderName, setBinderName] = useState('My Binder')
  const [selectedPack, setSelectedPack] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)
  const [activeCard, setActiveCard] = useState<Card | null>(null)

  // ── Unfiltered mode: orderedIds → card details cache ─────────────────────
  const isFiltered = !!(debouncedSearch || selectedPack)
  const [visibleCount, setVisibleCount] = useState(VISIBLE_STEP)
  const [cardMap, setCardMap] = useState<Map<string, Card>>(new Map())

  const visibleIds = isFiltered ? [] : orderedIds.slice(0, visibleCount)
  const hasMoreUnfiltered = !isFiltered && visibleCount < orderedIds.length

  useEffect(() => {
    if (isFiltered || visibleIds.length === 0) return
    const toFetch = visibleIds.filter(id => !cardMap.has(id))
    if (toFetch.length === 0) return
    supabase.from('scraped_cards').select('*').in('id', toFetch).then(({ data }) => {
      setCardMap(prev => {
        const next = new Map(prev)
        ;(data ?? []).forEach((c: Card) => next.set(c.id, c))
        return next
      })
    })
  }, [visibleIds.join(','), isFiltered])

  // Reset visible count when binder changes
  useEffect(() => { setVisibleCount(VISIBLE_STEP); setCardMap(new Map()) }, [binderId])

  const unfilteredCards = visibleIds.map(id => cardMap.get(id)).filter(Boolean) as Card[]
  const unfilteredLoading = ownedLoading || (owned.size > 0 && unfilteredCards.length === 0 && visibleIds.length > 0)

  const loadMoreUnfiltered = useCallback(() => {
    if (hasMoreUnfiltered) setVisibleCount(c => c + VISIBLE_STEP)
  }, [hasMoreUnfiltered])

  // ── Filtered mode: useInfiniteCards ──────────────────────────────────────
  const { cards: filteredCards, packs, loading: filteredLoading, reloading, loadingMore, loadMore } =
    useInfiniteCards({ activeTab: 'binder', searchQuery: debouncedSearch, selectedPack, ownedIds: owned })

  const { setSentinel } = useInfiniteScroll({
    loadMore: isFiltered ? loadMore : loadMoreUnfiltered,
    loading: isFiltered ? filteredLoading : false,
    reloading: isFiltered ? reloading : false,
    loadingMore: isFiltered ? loadingMore : false,
  })

  const cards = isFiltered ? filteredCards : unfilteredCards
  const loading = isFiltered ? (filteredLoading || reloading) : unfilteredLoading

  // Fetch binder name
  useEffect(() => {
    if (!binderId) return
    supabase.from('binders').select('name').eq('id', binderId).single()
      .then(({ data }) => { if (data) setBinderName(data.name) })
  }, [binderId])

  const ownedKey = [...owned].sort().join(',')

  // Packs for unfiltered (derive from cardMap since useInfiniteCards only runs when filtered)
  const unfilteredPacks = isFiltered ? [] : [...new Set([...cardMap.values()].map(c => c.pack))].sort()
  const displayPacks = isFiltered ? packs : unfilteredPacks

  async function handleRemove() {
    if (selected.size === 0) return
    setRemoving(true)
    await removeMultiple([...selected])
    showToast(`${selected.size} card${selected.size > 1 ? 's' : ''} removed from binder`)
    clearSelection()
    setRemoving(false)
  }

  // ── DnD ──────────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragStart(event: DragStartEvent) {
    const card = unfilteredCards.find(c => c.id === event.active.id)
    if (card) setActiveCard(card)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveCard(null)
    if (!over || active.id === over.id) return
    await reorderCards(active.id as string, over.id as string)
  }

  const isDragging = activeCard !== null
  const isEmpty = !ownedLoading && owned.size === 0
  const noResults = !loading && owned.size > 0 && cards.length === 0 && isFiltered

  return (
    <div className="bg-white min-h-screen py-10 px-4 font-sans">
      <div className="max-w-4xl mx-auto">

        <Header
          title={binderName}
          subtitle={`${owned.size} card${owned.size !== 1 ? 's' : ''}`}
          onSignOut={signOut}
          onBack={() => navigate('/binder')}
        />

        {/* Search + pack filter */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search your cards..."
            className="flex-1 min-w-0 px-4 py-2 text-sm rounded-xl border border-zinc-200 text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors"
          />
          {displayPacks.length > 0 && (
            <select
              value={selectedPack ?? ''}
              onChange={e => setSelectedPack(e.target.value || null)}
              className="appearance-none px-4 py-2 text-sm rounded-xl border border-zinc-200 text-zinc-600 focus:outline-none focus:border-zinc-400 transition-colors bg-white max-w-[140px]"
            >
              <option value="">All packs</option>
              {displayPacks.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : isEmpty ? (
          <div className="text-center py-16">
            <p className="text-zinc-400 text-sm">This binder is empty. Browse Pokémon or Cards to add some!</p>
          </div>
        ) : noResults ? (
          <div className="text-center py-16">
            <p className="text-zinc-400 text-sm">No cards match your search.</p>
          </div>
        ) : isFiltered ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {cards.map(card => (
              <PokemonCard
                key={card.id}
                card={card}
                isOwned={owned.has(card.id)}
                isSelected={selected.has(card.id)}
                selectMode={selectMode}
                removeMode
                onClick={() => handleCardClick(card)}
                onLongPress={() => handleCardLongPress(card)}
              />
            ))}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={visibleIds} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {unfilteredCards.map(card => (
                  <SortableCard
                    key={card.id}
                    card={card}
                    isOwned={owned.has(card.id)}
                    isSelected={selected.has(card.id)}
                    selectMode={selectMode}
                    isDraggingAny={isDragging}
                    onClick={() => handleCardClick(card)}
                    onLongPress={() => handleCardLongPress(card)}
                  />
                ))}
              </div>
            </SortableContext>

            <DragOverlay dropAnimation={null}>
              {activeCard && (
                <div className="opacity-90 rotate-2 shadow-2xl">
                  <PokemonCard card={activeCard} isOwned isSelected={false} selectMode={false} removeMode />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}

        <div ref={setSentinel} className="h-1" />
        {loadingMore && (
          <div className="flex justify-center py-6"><Spinner /></div>
        )}

      </div>

      {selectMode && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 bg-white rounded-2xl shadow-xl border border-zinc-100 whitespace-nowrap">
          <span className="text-sm text-zinc-500 pr-1">{selected.size} selected</span>
          <button onClick={clearSelection} className="text-xs text-zinc-400 hover:text-zinc-700 px-3 py-1.5 transition-colors">Cancel</button>
          <button
            onClick={handleRemove}
            disabled={removing}
            className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            {removing ? 'Removing...' : 'Remove from Binder'}
          </button>
        </div>
      )}

      {lightboxCard && (
        <CardLightbox card={lightboxCard} onClose={() => setLightboxCard(null)} isOwned={owned.has(lightboxCard.id)} />
      )}
      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  )
}

// ── Sortable card with drag handle ───────────────────────────────────────────

interface SortableCardProps {
  card: Card
  isOwned: boolean
  isSelected: boolean
  selectMode: boolean
  isDraggingAny: boolean
  onClick: () => void
  onLongPress: () => void
}

function SortableCard({ card, isOwned, isSelected, selectMode, isDraggingAny, onClick, onLongPress }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'opacity-30' : ''}
    >
      <div className="relative">
        <PokemonCard
          card={card}
          isOwned={isOwned}
          isSelected={isSelected}
          selectMode={selectMode}
          removeMode
          onClick={onClick}
          onLongPress={onLongPress}
        />
        {!selectMode && !isDraggingAny && (
          <div
            {...attributes}
            {...listeners}
            onClick={e => e.stopPropagation()}
            className="absolute top-1.5 left-1.5 z-10 p-1 rounded-md bg-black/30 text-white cursor-grab active:cursor-grabbing touch-none"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
              <circle cx="5" cy="4" r="1.2" /><circle cx="11" cy="4" r="1.2" />
              <circle cx="5" cy="8" r="1.2" /><circle cx="11" cy="8" r="1.2" />
              <circle cx="5" cy="12" r="1.2" /><circle cx="11" cy="12" r="1.2" />
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}
