// ─────────────────────────────────────────────────────────────
// App.tsx — the root component
//
// This is the entry point of the app. It decides WHAT to show
// based on auth state:
//
//   Still checking auth  → <LoadingScreen>
//   Not logged in        → <LoginPage>
//   Logged in as admin   → <AdminPage>
//   Logged in as user    → the main binder UI (everything below)
//
// All major state for the main binder lives here and is passed
// down to child components as props. This is called "lifting state up"
// — the parent owns the data, children just display or report events.
//
// Infinite scroll:
//   An IntersectionObserver watches an invisible <div> (the "sentinel")
//   placed at the bottom of the card list. When it scrolls into view,
//   loadMore() is called to fetch the next page of cards.
//   This is more efficient than listening to the window scroll event.
// ─────────────────────────────────────────────────────────────

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
import { LOADING, TOAST, APP } from './constants/strings'
import { SEARCH_DEBOUNCE_MS, SCROLL_ROOT_MARGIN } from './constants/config'
import type { Card } from './data/cards'

export default function App() {
  const { user, loading: authLoading, signOut, isAdmin } = useAuth()
  const { owned, addMultiple, removeMultiple } = useOwnedCards(user?.id ?? '')
  const { toasts, showToast, removeToast } = useToast()

  const [activeTab, setActiveTab] = useState<'all' | 'binder'>('all')
  const [selected, setSelected] = useState<Set<number>>(new Set())   // selected card IDs
  const [selectMode, setSelectMode] = useState(false)                 // is selection active?
  const [lightboxCard, setLightboxCard] = useState<Card | null>(null) // open card or null
  const [adding, setAdding] = useState(false)                         // add/remove in progress?
  const [searchQuery, setSearchQuery] = useState('')                  // raw search text (instant)
  const [debouncedSearch, setDebouncedSearch] = useState('')          // delayed search (sent to DB)
  const [selectedPack, setSelectedPack] = useState<string | null>(null)

  // ── Search debounce ──────────────────────────────────────────────────────
  //
  // searchQuery updates on every keystroke (instant, for the input value).
  // debouncedSearch only updates 350ms after the user stops typing.
  //
  // Why? Without the delay, every keystroke fires a new database query.
  // Typing "pikachu" (7 chars) would fire 7 queries. With the debounce,
  // only 1 query fires — after the user pauses.
  //
  // How it works: each keystroke clears the previous timer and starts a
  // new 350ms one. The cleanup function (`return () => clearTimeout(t)`)
  // cancels the timer if the user types again before it fires.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchQuery])

  // Pass debouncedSearch (not searchQuery) to the hook so queries
  // only fire after the user pauses typing.
  const { cards, packs, dbTotal, loading, reloading, loadingMore, loadMore, fetchTotal } = useInfiniteCards({
    activeTab,
    searchQuery: debouncedSearch,
    selectedPack,
    ownedIds: owned,
  })

  // Sentinel div ref — use state so the effect re-runs when it mounts
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null)
  // ── Infinite scroll via IntersectionObserver ────────────────────────────
  //
  // loadMoreRef is a ref that always holds the latest loadMore function.
  // We need this because useEffect captures a snapshot of variables —
  // if we put loadMore directly in the observer callback, it would be stale.
  // By storing it in a ref, the observer always calls the current version.
  const loadMoreRef = useRef(loadMore)
  loadMoreRef.current = loadMore  // update the ref on every render

  useEffect(() => {
    if (!sentinel) return  // sentinel div not mounted yet

    // IntersectionObserver fires when the observed element enters/exits the viewport.
    // rootMargin: '300px' means it fires 300px BEFORE the sentinel reaches the bottom
    // of the screen — giving us a head start on fetching the next page.
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMoreRef.current() },
      { rootMargin: SCROLL_ROOT_MARGIN }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()  // cleanup when sentinel unmounts
  }, [sentinel])  // re-run only when the sentinel div element changes


  // ── Guard clauses: decide what to render ────────────────────────────────
  if (authLoading) return <LoadingScreen message={LOADING.AUTH} />
  if (!user) return <LoginPage />
  if (isAdmin) return <AdminPage onSignOut={signOut} />
  if (loading) return <LoadingScreen message={LOADING.CARDS} />

  // Derive the display name from the email. "ash@pokemon-binder.app" → "ash"
  const username = user.email?.split('@')[0] ?? APP.DEFAULT_USERNAME


  // ── Event handlers ───────────────────────────────────────────────────────

  // Reset all filter/selection state when switching tabs so you don't carry
  // over a search from "All Cards" into "My Binder".
  function handleTabChange(tab: 'all' | 'binder') {
    setActiveTab(tab)
    setSelected(new Set())
    setSelectMode(false)
    setSearchQuery('')
    setSelectedPack(null)
  }

  // Toggle a card in/out of the selection set.
  // Owned cards on the "All Cards" tab can't be re-selected (they're already in the binder).
  function toggleSelected(cardId: number) {
    if (activeTab === 'all' && owned.has(cardId)) return  // skip already-owned cards
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(cardId)) next.delete(cardId)
      else next.add(cardId)
      if (next.size === 0) setSelectMode(false)  // auto-exit select mode when nothing is selected
      return next
    })
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelected(new Set())
  }

  // Short tap on a card:
  //   In select mode → toggle the card's selection
  //   Otherwise      → open the lightbox
  function handleCardClick(card: Card) {
    if (selectMode) {
      toggleSelected(card.id)
    } else {
      setLightboxCard(card)
    }
  }

  // Long press on a card: enter select mode and select this card.
  // Owned cards on the "All Cards" tab are skipped (can't re-add them).
  function handleCardLongPress(card: Card) {
    if (activeTab === 'all' && owned.has(card.id)) return
    if (!selectMode) setSelectMode(true)
    toggleSelected(card.id)
  }

  // Add all selected cards to the binder, then reset selection.
  // fetchTotal() re-counts all owned cards so StatsBar stays accurate.
  async function handleAddToBinder() {
    if (selected.size === 0) return
    setAdding(true)
    await addMultiple([...selected])
    await fetchTotal()
    showToast(TOAST.cardsAdded(selected.size))
    setSelected(new Set())
    setSelectMode(false)
    setAdding(false)
  }

  // Remove all selected cards from the binder, then reset selection.
  async function handleRemoveFromBinder() {
    if (selected.size === 0) return
    setAdding(true)
    await removeMultiple([...selected])
    await fetchTotal()
    showToast(TOAST.cardsRemoved(selected.size))
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
