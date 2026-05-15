import { useState } from 'react'
import Tabs from './components/Tabs'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'
import LoadingScreen from './components/LoadingScreen'
import Header from './components/Header'
import StatsBar from './components/StatsBar'
import SearchFilter from './components/SearchFilter'
import ActionBar from './components/ActionBar'
import CardGrid from './components/CardGrid'
import Footer from './components/Footer'
import Pagination from './components/Pagination'
import { CARDS_PER_PAGE } from './data/cards'
import { useAuth } from './hooks/useAuth'
import { useCards } from './hooks/useCards'
import { useOwnedCards } from './hooks/useOwnedCards'

export default function App() {
  const { user, loading: authLoading, signOut, isAdmin } = useAuth()
  const { cards, loading: cardsLoading } = useCards(user?.id ?? '')
  const { owned, addMultiple, removeMultiple } = useOwnedCards(user?.id ?? '')

  const [currentPage, setCurrentPage] = useState(1)
  const [activeTab, setActiveTab] = useState<'all' | 'binder'>('all')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [adding, setAdding] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPack, setSelectedPack] = useState<string | null>(null)

  if (authLoading) return <LoadingScreen message="Loading..." />
  if (!user) return <LoginPage />
  if (isAdmin) return <AdminPage onSignOut={signOut} />
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

        <Header username={username} onSignOut={signOut} />

        <StatsBar
          ownedCount={owned.size}
          totalCount={cards.length}
          currentPage={currentPage}
          totalPages={totalPages}
        />

        <Tabs active={activeTab} binderCount={owned.size} onChange={handleTabChange} />

        <SearchFilter
          searchQuery={searchQuery}
          onSearchChange={value => { setSearchQuery(value); setCurrentPage(1) }}
          availablePacks={availablePacks}
          selectedPack={selectedPack}
          onPackChange={pack => { setSelectedPack(pack); setCurrentPage(1) }}
        />

        <ActionBar
          selectedCount={selected.size}
          activeTab={activeTab}
          adding={adding}
          onAdd={handleAddToBinder}
          onRemove={handleRemoveFromBinder}
        />

        <CardGrid
          pageCards={pageCards}
          owned={owned}
          selected={selected}
          activeTab={activeTab}
          searchQuery={searchQuery}
          selectedPack={selectedPack}
          hasCards={displayCards.length > 0}
          onToggle={toggleSelected}
        />

        {displayCards.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPrev={() => setCurrentPage(p => Math.max(1, p - 1))}
            onNext={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            onGoToPage={setCurrentPage}
          />
        )}

        <Footer activeTab={activeTab} selectedCount={selected.size} />

      </div>
    </div>
  )
}
