import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  DndContext, DragOverlay, closestCenter,
  PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { useAuth } from '../hooks/useAuth'
import { useOwnedCards, MAX_BINDER } from '../hooks/useOwnedCards'
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

const SECTION_SIZE = 18 // 6 cols × 3 rows
const VISIBLE_STEP = SECTION_SIZE

// ── Binder layout helpers ─────────────────────────────────────────────────────

function buildSections(cards: (Card | null)[]): (Card | null)[][] {
  if (cards.length === 0) return []
  const sectionCount = Math.ceil(cards.length / SECTION_SIZE)
  return Array.from({ length: sectionCount }, (_, s) =>
    Array.from({ length: SECTION_SIZE }, (_, i) => cards[s * SECTION_SIZE + i] ?? null)
  )
}

function SectionDivider() {
  return <div className="border-t-2 border-gray-200 my-6" />
}

function VerticalDivider() {
  return <div className="mx-3 w-px bg-gray-300 self-stretch shrink-0" />
}

// ── Slot components ───────────────────────────────────────────────────────────

function PlaceholderSlot({ slotIndex }: { slotIndex: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${slotIndex}` })
  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg overflow-hidden border-2 border-dashed transition-colors ${
        isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-100'
      }`}
    >
      <div style={{ paddingBottom: '140%' }} />
    </div>
  )
}

interface CardSlotProps {
  card: Card
  slotIndex: number
  isOwned: boolean
  isSelected: boolean
  selectMode: boolean
  isDraggingAny: boolean
  onClick: () => void
  onLongPress: () => void
}

function CardSlot({ card, slotIndex, isOwned, isSelected, selectMode, isDraggingAny, onClick, onLongPress }: CardSlotProps) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `slot-${slotIndex}` })
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({ id: card.id })

  function setRef(el: HTMLElement | null) {
    setDropRef(el)
    setDragRef(el)
  }

  return (
    <div
      ref={setRef}
      className={[
        'relative',
        isDragging ? 'opacity-0' : '',
        isOver && isDraggingAny && !isDragging ? 'ring-2 ring-blue-400 ring-offset-1 rounded-lg' : '',
      ].join(' ')}
    >
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
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BinderPage() {
  const { id: binderId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { owned, slots, loading: ownedLoading, removeMultiple, moveCard } =
    useOwnedCards(user?.id ?? '', binderId)
  const { toasts, showToast, removeToast } = useToast()
  const { searchQuery, setSearchQuery, debouncedSearch } = useSearchDebounce()
  const { selected, selectMode, lightboxCard, setLightboxCard, clearSelection, handleCardClick, handleCardLongPress } =
    useCardSelection()

  const [binderName, setBinderName] = useState('My Binder')
  const [selectedPack, setSelectedPack] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)
  const [activeCard, setActiveCard] = useState<Card | null>(null)

  // ── Unfiltered mode: slots → card details cache ───────────────────────────
  const isFiltered = !!(debouncedSearch || selectedPack)
  const [visibleCount, setVisibleCount] = useState(VISIBLE_STEP)
  const [cardMap, setCardMap] = useState<Map<string, Card>>(new Map())
  const [unfilteredLoadingMore, setUnfilteredLoadingMore] = useState(false)

  // Always show up to MAX_BINDER slots, regardless of how many cards the binder has
  const visibleSlots = isFiltered ? [] : slots.slice(0, visibleCount)
  const hasMoreUnfiltered = !isFiltered && visibleCount < MAX_BINDER

  const visibleCardIds = visibleSlots.filter((s): s is string => s !== null)

  useEffect(() => {
    if (isFiltered || visibleCardIds.length === 0) return
    const toFetch = visibleCardIds.filter(id => !cardMap.has(id))
    if (toFetch.length === 0) return
    supabase.from('scraped_cards').select('*').in('id', toFetch).then(({ data }) => {
      setCardMap(prev => {
        const next = new Map(prev)
        ;(data ?? []).forEach((c: Card) => next.set(c.id, c))
        return next
      })
      setUnfilteredLoadingMore(false)
    })
  }, [visibleCardIds.join(','), isFiltered])

  useEffect(() => {
    setVisibleCount(VISIBLE_STEP)
    setCardMap(new Map())
    setUnfilteredLoadingMore(false)
  }, [binderId])

  // Map each visible slot position to Card | null
  const visibleSlotCards: (Card | null)[] = visibleSlots.map(id =>
    id ? (cardMap.get(id) ?? null) : null
  )

  const unfilteredLoading = ownedLoading || (
    owned.size > 0 &&
    visibleCardIds.length > 0 &&
    !visibleCardIds.some(id => cardMap.has(id))
  )

  const loadMoreUnfiltered = useCallback(() => {
    if (hasMoreUnfiltered) {
      setVisibleCount(c => c + VISIBLE_STEP)
      setUnfilteredLoadingMore(true)
    }
  }, [hasMoreUnfiltered])

  // ── Filtered mode: useInfiniteCards ──────────────────────────────────────
  const { cards: filteredCards, packs, loading: filteredLoading, reloading, loadingMore, loadMore } =
    useInfiniteCards({ activeTab: 'binder', searchQuery: debouncedSearch, selectedPack, ownedIds: owned })

  const { setSentinel } = useInfiniteScroll({
    loadMore: isFiltered ? loadMore : loadMoreUnfiltered,
    loading: isFiltered ? filteredLoading : unfilteredLoading,
    reloading: isFiltered ? reloading : false,
    loadingMore: isFiltered ? loadingMore : unfilteredLoadingMore,
  })

  const cards = isFiltered ? filteredCards : []
  const loading = isFiltered ? (filteredLoading || reloading) : unfilteredLoading

  // Fetch binder name
  useEffect(() => {
    if (!binderId) return
    supabase.from('binders').select('name').eq('id', binderId).single()
      .then(({ data }) => { if (data) setBinderName(data.name) })
  }, [binderId])

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
  )

  function handleDragStart(event: DragStartEvent) {
    const card = cardMap.get(event.active.id as string)
    if (card) setActiveCard(card)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveCard(null)
    if (!over) return

    const overId = over.id as string
    if (!overId.startsWith('slot-')) return
    const toSlot = parseInt(overId.slice(5), 10)

    await moveCard(active.id as string, toSlot)
  }

  const isDragging = activeCard !== null
  const isEmpty = !ownedLoading && owned.size === 0
  const noResults = !loading && owned.size > 0 && cards.length === 0 && isFiltered

  // ── Section rendering ─────────────────────────────────────────────────────

  function renderFilteredSections() {
    const sections = buildSections(filteredCards)
    return sections.map((section, sIdx) => (
      <div key={sIdx}>
        {sIdx > 0 && <SectionDivider />}
        <div className="flex items-stretch">
          <div className="flex-1 grid grid-cols-3 gap-2">
            {section.slice(0, 9).map((card, i) =>
              card ? (
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
              ) : (
                <PlaceholderSlot key={`f-s${sIdx}-l${i}`} slotIndex={sIdx * SECTION_SIZE + i} />
              )
            )}
          </div>
          <VerticalDivider />
          <div className="flex-1 grid grid-cols-3 gap-2">
            {section.slice(9).map((card, i) =>
              card ? (
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
              ) : (
                <PlaceholderSlot key={`f-s${sIdx}-r${i}`} slotIndex={sIdx * SECTION_SIZE + 9 + i} />
              )
            )}
          </div>
        </div>
      </div>
    ))
  }

  function renderSlotSections() {
    const sections = buildSections(visibleSlotCards)
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {sections.map((section, sIdx) => (
          <div key={sIdx}>
            {sIdx > 0 && <SectionDivider />}
            <div className="flex items-stretch">
              <div className="flex-1 grid grid-cols-3 gap-2">
                {section.slice(0, 9).map((card, i) => {
                  const globalSlot = sIdx * SECTION_SIZE + i
                  return card ? (
                    <CardSlot
                      key={card.id}
                      card={card}
                      slotIndex={globalSlot}
                      isOwned={owned.has(card.id)}
                      isSelected={selected.has(card.id)}
                      selectMode={selectMode}
                      isDraggingAny={isDragging}
                      onClick={() => handleCardClick(card)}
                      onLongPress={() => handleCardLongPress(card)}
                    />
                  ) : (
                    <PlaceholderSlot key={`u-s${sIdx}-l${i}`} slotIndex={globalSlot} />
                  )
                })}
              </div>
              <VerticalDivider />
              <div className="flex-1 grid grid-cols-3 gap-2">
                {section.slice(9).map((card, i) => {
                  const globalSlot = sIdx * SECTION_SIZE + 9 + i
                  return card ? (
                    <CardSlot
                      key={card.id}
                      card={card}
                      slotIndex={globalSlot}
                      isOwned={owned.has(card.id)}
                      isSelected={selected.has(card.id)}
                      selectMode={selectMode}
                      isDraggingAny={isDragging}
                      onClick={() => handleCardClick(card)}
                      onLongPress={() => handleCardLongPress(card)}
                    />
                  ) : (
                    <PlaceholderSlot key={`u-s${sIdx}-r${i}`} slotIndex={globalSlot} />
                  )
                })}
              </div>
            </div>
          </div>
        ))}

        <DragOverlay dropAnimation={null}>
          {activeCard && (
            <div className="opacity-90 rotate-2 shadow-2xl">
              <PokemonCard card={activeCard} isOwned isSelected={false} selectMode={false} removeMode />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    )
  }

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
        <div className="flex gap-2 mb-6">
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
          renderFilteredSections()
        ) : (
          renderSlotSections()
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
