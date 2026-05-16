import { useState, useEffect, useRef } from 'react'
import Tabs from './components/Tabs'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'
import LoadingScreen from './components/LoadingScreen'
import Header from './components/Header'
import StatsBar from './components/StatsBar'
import SearchFilter from './components/SearchFilter'
import ActionBar from './components/ActionBar'
import CardGrid from './components/CardGrid'
import CardLightbox from './components/CardLightbox'
import Footer from './components/Footer'
import { useAuth } from './hooks/useAuth'
import { useInfiniteCards } from './hooks/useInfiniteCards'
import { useOwnedCards } from './hooks/useOwnedCards'
import Toast from './components/Toast'
import { useToast } from './hooks/useToast'
import type { Card } from './data/cards'

export default function App() {
  const { user, loading: authLoading, signOut, isAdmin } = useAuth()
  const { owned, addMultiple, removeMultiple } = useOwnedCards(user?.id ?? '')
  const { toasts, showToast, removeToast } = useToast()

  const [activeTab, setActiveTab] = useState<'all' | 'binder'>('all')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [lightboxCard, setLightboxCard] = useState<Card | null>(null)
  const [adding, setAdding] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedPack, setSelectedPack] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 350)
    return () => clearTimeout(t)
  }, [searchQuery])

  const { cards, packs, dbTotal, loading, reloading, loadingMore, loadMore, fetchTotal } = useInfiniteCards({
    activeTab,
    searchQuery: debouncedSearch,
    selectedPack,
    ownedIds: owned,
  })

  // Sentinel div ref — use state so the effect re-runs when it mounts
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null)
  const loadMoreRef = useRef(loadMore)
  loadMoreRef.current = loadMore

  useEffect(() => {
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMoreRef.current() },
      { rootMargin: '300px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [sentinel])

  if (authLoading) return <LoadingScreen message="Loading..." />
  if (!user) return <LoginPage />
  if (isAdmin) return <AdminPage onSignOut={signOut} />
  if (loading) return <LoadingScreen message="Loading cards..." />

  const username = user.email?.split('@')[0] ?? 'Trainer'

  function handleTabChange(tab: 'all' | 'binder') {
    setActiveTab(tab)
    setSelected(new Set())
    setSelectMode(false)
    setSearchQuery('')
    setSelectedPack(null)
  }

  function toggleSelected(cardId: number) {
    if (activeTab === 'all' && owned.has(cardId)) return
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(cardId)) next.delete(cardId)
      else next.add(cardId)
      if (next.size === 0) setSelectMode(false)
      return next
    })
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelected(new Set())
  }

  function handleCardClick(card: Card) {
    if (selectMode) {
      toggleSelected(card.id)
    } else {
      setLightboxCard(card)
    }
  }

  function handleCardLongPress(card: Card) {
    if (activeTab === 'all' && owned.has(card.id)) return
    if (!selectMode) setSelectMode(true)
    toggleSelected(card.id)
  }

  async function handleAddToBinder() {
    if (selected.size === 0) return
    setAdding(true)
    await addMultiple([...selected])
    await fetchTotal()
    showToast(`${selected.size} card${selected.size > 1 ? 's' : ''} added to binder ✓`)
    setSelected(new Set())
    setSelectMode(false)
    setAdding(false)
  }

  async function handleRemoveFromBinder() {
    if (selected.size === 0) return
    setAdding(true)
    await removeMultiple([...selected])
    await fetchTotal()
    showToast(`${selected.size} card${selected.size > 1 ? 's' : ''} removed from binder`)
    setSelected(new Set())
    setSelectMode(false)
    setAdding(false)
  }

  return (
    <div className="bg-white min-h-screen py-10 px-4 font-sans">
      <div className="max-w-4xl mx-auto">

        <Header username={username} onSignOut={signOut} />

        <StatsBar ownedCount={owned.size} totalCount={dbTotal} />

        <Tabs active={activeTab} binderCount={owned.size} onChange={handleTabChange} />

        <SearchFilter
          searchQuery={searchQuery}
          onSearchChange={value => setSearchQuery(value)}
          availablePacks={packs}
          selectedPack={selectedPack}
          onPackChange={pack => setSelectedPack(pack)}
        />

        <ActionBar
          selectedCount={selected.size}
          activeTab={activeTab}
          adding={adding}
          selectMode={selectMode}
          onAdd={handleAddToBinder}
          onRemove={handleRemoveFromBinder}
          onCancel={exitSelectMode}
        />

        <CardGrid
          cards={cards}
          owned={owned}
          selected={selected}
          activeTab={activeTab}
          selectMode={selectMode}
          reloading={reloading}
          searchQuery={debouncedSearch}
          selectedPack={selectedPack}
          onCardClick={handleCardClick}
          onCardLongPress={handleCardLongPress}
        />

        <div ref={setSentinel} className="h-1" />

        {loadingMore && (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 rounded-full border-2 border-zinc-300 border-t-zinc-600 animate-spin" />
          </div>
        )}

        <Footer activeTab={activeTab} selectedCount={selected.size} />

      </div>

      {lightboxCard && (
        <CardLightbox card={lightboxCard} onClose={() => setLightboxCard(null)} />
      )}

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
