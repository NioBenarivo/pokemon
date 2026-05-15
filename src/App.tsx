import { useState, useEffect, useCallback } from 'react'
import PokemonCard from './components/PokemonCard'
import Pagination from './components/Pagination'
import { type Card, CARDS_PER_PAGE } from './data/cards'
import { supabase } from './lib/supabase'
import { getCachedCards, setCachedCards } from './lib/cardsCache'

function loadOwned(): Set<number> {
  try {
    const saved = localStorage.getItem('pokeBinder_v1')
    return saved ? new Set<number>(JSON.parse(saved) as number[]) : new Set<number>()
  } catch {
    return new Set<number>()
  }
}

function EmptySlot() {
  return (
    <div
      className="rounded-xl border-2 border-dashed border-zinc-200"
      style={{ paddingBottom: 'calc(80% + 52px)' }}
    />
  )
}

export default function App() {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [owned, setOwned] = useState<Set<number>>(loadOwned)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    async function fetchCards() {
      const cached = getCachedCards()
      if (cached) {
        setCards(cached)
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .order('id')

      if (!error && data) {
        const fetched = data as Card[]
        setCards(fetched)
        setCachedCards(fetched)
      }
      setLoading(false)
    }

    fetchCards()
  }, [])

  const totalPages = Math.ceil(cards.length / CARDS_PER_PAGE)
  const startIdx = (currentPage - 1) * CARDS_PER_PAGE
  const pageCards = cards.slice(startIdx, startIdx + CARDS_PER_PAGE)

  const toggleOwned = useCallback((cardId: number) => {
    setOwned((prev) => {
      const next = new Set(prev)
      if (next.has(cardId)) next.delete(cardId)
      else next.add(cardId)
      localStorage.setItem('pokeBinder_v1', JSON.stringify([...next]))
      return next
    })
  }, [])

  if (loading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <p className="text-zinc-400 text-sm tracking-wide">Loading cards...</p>
      </div>
    )
  }

  return (
    <div className="bg-white min-h-screen py-10 px-4 font-sans">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <header className="text-center mb-7">
          <p className="text-zinc-400 text-xs uppercase tracking-widest mb-1">Collection</p>
          <h1 className="text-zinc-900 text-2xl font-bold tracking-tight">
            Pokémon Wishlist Binder
          </h1>
        </header>

        {/* Stats bar */}
        <div className="flex items-center justify-between mb-4 px-0.5">
          <p className="text-zinc-500 text-xs">
            <span className="text-zinc-900 font-semibold">{owned.size}</span>
            <span className="text-zinc-300"> / </span>
            <span className="text-zinc-500 font-semibold">{cards.length}</span>
            <span className="text-zinc-400"> collected</span>
          </p>
          <p className="text-zinc-500 text-xs">
            Page{' '}
            <span className="text-zinc-900 font-semibold">{currentPage}</span>
            <span className="text-zinc-300"> of </span>
            <span className="text-zinc-500 font-semibold">{totalPages}</span>
          </p>
        </div>

        {/* Binder page */}
        <div className="bg-zinc-50 rounded-2xl p-5 border border-zinc-200">
          <div className="grid grid-cols-3 gap-3.5">
            {Array.from({ length: CARDS_PER_PAGE }, (_, i) => {
              const card = pageCards[i]
              if (!card) return <EmptySlot key={`empty-${i}`} />
              return (
                <PokemonCard
                  key={card.id}
                  card={card}
                  isOwned={owned.has(card.id)}
                  onToggle={() => toggleOwned(card.id)}
                />
              )
            })}
          </div>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPrev={() => setCurrentPage((p) => Math.max(1, p - 1))}
          onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          onGoToPage={setCurrentPage}
        />

        <p className="text-center text-zinc-400 text-xs mt-5 tracking-wide">
          Click any card to toggle owned status
        </p>

      </div>
    </div>
  )
}
