import { useState, useEffect } from 'react'
import PokemonCard from './components/PokemonCard'
import Pagination from './components/Pagination'
import Tabs from './components/Tabs'
import LoginPage from './pages/LoginPage'
import { type Card, CARDS_PER_PAGE } from './data/cards'
import { supabase } from './lib/supabase'
import { getCachedCards, setCachedCards } from './lib/cardsCache'
import { useAuth } from './hooks/useAuth'
import { useOwnedCards } from './hooks/useOwnedCards'

function EmptySlot() {
  return (
    <div
      className="rounded-xl border-2 border-dashed border-zinc-200"
      style={{ paddingBottom: 'calc(80% + 52px)' }}
    />
  )
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="bg-white min-h-screen flex items-center justify-center">
      <p className="text-zinc-400 text-sm tracking-wide">{message}</p>
    </div>
  )
}

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { owned, addMultiple, removeMultiple } = useOwnedCards(user?.id ?? '')

  const [cards, setCards] = useState<Card[]>([])
  const [cardsLoading, setCardsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTab, setActiveTab] = useState<'all' | 'binder'>('all')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [adding, setAdding] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPack, setSelectedPack] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    async function fetchCards() {
      const cached = getCachedCards()
      if (cached) {
        setCards(cached)
        setCardsLoading(false)
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
      setCardsLoading(false)
    }

    fetchCards()
  }, [user])

  if (authLoading) return <LoadingScreen message="Loading..." />
  if (!user) return <LoginPage />
  if (cardsLoading) return <LoadingScreen message="Loading cards..." />

  const username = user.email?.split('@')[0] ?? 'Trainer'

  function handleTabChange(tab: 'all' | 'binder') {
    setActiveTab(tab)
    setCurrentPage(1)
    setSelected(new Set())
    setSearchQuery('')
    setSelectedPack(null)
  }

  function toggleSelected(cardId: number) {
    if (activeTab === 'all' && owned.has(cardId)) return
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(cardId)) next.delete(cardId)
      else next.add(cardId)
      return next
    })
  }

  async function handleAddToBinder() {
    if (selected.size === 0) return
    setAdding(true)
    await addMultiple([...selected])
    setSelected(new Set())
    setAdding(false)
  }

  async function handleRemoveFromBinder() {
    if (selected.size === 0) return
    setAdding(true)
    await removeMultiple([...selected])
    setSelected(new Set())
    setAdding(false)
  }

  const tabCards = activeTab === 'binder'
    ? cards.filter(c => owned.has(c.id))
    : cards

  const availablePacks = [...new Set(tabCards.map(c => c.pack))].sort()

  const displayCards = tabCards
    .filter(c => !selectedPack || c.pack === selectedPack)
    .filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const totalPages = Math.ceil(displayCards.length / CARDS_PER_PAGE)
  const startIdx = (currentPage - 1) * CARDS_PER_PAGE
  const pageCards = displayCards.slice(startIdx, startIdx + CARDS_PER_PAGE)

  return (
    <div className="bg-white min-h-screen py-10 px-4 font-sans">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <header className="text-center mb-7 relative">
          <p className="text-zinc-400 text-xs uppercase tracking-widest mb-1">Collection</p>
          <h1 className="text-zinc-900 text-2xl font-bold tracking-tight">
            Pokémon Wishlist Binder
          </h1>
          <p className="text-zinc-400 text-xs mt-1">{username}'s binder</p>
          <button
            onClick={signOut}
            className="absolute right-0 top-0 text-xs text-zinc-400
                       hover:text-zinc-700 transition-colors duration-150"
          >
            Sign out
          </button>
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

        {/* Tabs */}
        <Tabs
          active={activeTab}
          binderCount={owned.size}
          onChange={handleTabChange}
        />

        {/* Search + Pack filter */}
        <div className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
              placeholder="Search cards..."
              className="w-full pl-8 pr-8 py-2 text-sm rounded-lg border border-zinc-200 text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setCurrentPage(1) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-3.5 h-3.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {availablePacks.length > 1 && (
            <select
              value={selectedPack ?? ''}
              onChange={e => { setSelectedPack(e.target.value || null); setCurrentPage(1) }}
              className="py-2 px-3 text-sm rounded-lg border border-zinc-200 text-zinc-700 bg-white focus:outline-none focus:border-zinc-400 transition-colors appearance-none cursor-pointer shrink-0"
            >
              <option value="">All packs</option>
              {availablePacks.map(pack => (
                <option key={pack} value={pack}>{pack}</option>
              ))}
            </select>
          )}
        </div>

        {/* Action bar — shown when cards are selected in either tab */}
        {selected.size > 0 && (
          <div className={`flex items-center justify-between border rounded-xl px-4 py-3 mb-4 ${
            activeTab === 'all' ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'
          }`}>
            <p className={`text-sm font-medium ${activeTab === 'all' ? 'text-blue-700' : 'text-red-700'}`}>
              {selected.size} card{selected.size !== 1 ? 's' : ''} selected
            </p>
            <button
              onClick={activeTab === 'all' ? handleAddToBinder : handleRemoveFromBinder}
              disabled={adding}
              className={`text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors duration-150 ${
                activeTab === 'all' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {adding
                ? activeTab === 'all' ? 'Adding...' : 'Removing...'
                : activeTab === 'all' ? 'Add to Binder' : 'Remove from Binder'}
            </button>
          </div>
        )}

        {/* Card grid */}
        <div className="bg-zinc-50 rounded-2xl p-5 border border-zinc-200">
          {displayCards.length === 0 ? (
            <p className="text-center text-zinc-400 text-sm py-10">
              {searchQuery || selectedPack
                ? 'No cards match your search.'
                : activeTab === 'binder'
                ? 'Your binder is empty. Go to All Cards to add some!'
                : 'No cards found.'}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3.5">
              {Array.from({ length: CARDS_PER_PAGE }, (_, i) => {
                const card = pageCards[i]
                if (!card) return <EmptySlot key={`empty-${i}`} />
                return (
                  <PokemonCard
                    key={card.id}
                    card={card}
                    isOwned={owned.has(card.id)}
                    isSelected={selected.has(card.id)}
                    onToggle={() => toggleSelected(card.id)}
                    readOnly={activeTab === 'binder'}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {displayCards.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPrev={() => setCurrentPage(p => Math.max(1, p - 1))}
            onNext={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            onGoToPage={setCurrentPage}
          />
        )}

        {activeTab === 'all' && selected.size === 0 && (
          <p className="text-center text-zinc-400 text-xs mt-5 tracking-wide">
            Click cards to select, then tap Add to Binder
          </p>
        )}

      </div>
    </div>
  )
}
