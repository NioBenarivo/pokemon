import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useBinders, setActiveBinder, MAX_BINDERS, type Binder } from '../hooks/useBinders'
import Header from '../components/Header'
import Spinner from '../components/Spinner'

export default function BinderListPage() {
  const { user, signOut } = useAuth()
  const { binders, loading, createBinder, renameBinder } = useBinders(user?.id ?? '')
  const navigate = useNavigate()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [creating, setCreating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function openBinder(id: string) {
    setActiveBinder(id)
    navigate(`/binder/${id}`)
  }

  function startRename(e: React.MouseEvent, binder: Binder) {
    e.stopPropagation()
    setEditingId(binder.id)
    setEditName(binder.name)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  async function commitRename(id: string) {
    const trimmed = editName.trim()
    if (trimmed) await renameBinder(id, trimmed)
    setEditingId(null)
  }

  function handleKeyDown(e: React.KeyboardEvent, id: string) {
    if (e.key === 'Enter') commitRename(id)
    if (e.key === 'Escape') setEditingId(null)
  }

  async function handleCreate() {
    if (creating || binders.length >= MAX_BINDERS) return
    setCreating(true)
    const binder = await createBinder('New Binder')
    setCreating(false)
    if (binder) {
      setEditingId(binder.id)
      setEditName('New Binder')
      setTimeout(() => inputRef.current?.select(), 0)
    }
  }

  const username = user?.email?.split('@')[0] ?? 'Trainer'

  if (loading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="bg-white min-h-screen py-10 px-4 font-sans">
      <div className="max-w-4xl mx-auto">
        <Header
          title="My Binders"
          subtitle={`${username} · ${binders.length} / ${MAX_BINDERS}`}
          onSignOut={signOut}
        />

        <div className="grid grid-cols-3 gap-3">
          {binders.map(binder => (
            <BinderTile
              key={binder.id}
              binder={binder}
              isEditing={editingId === binder.id}
              editName={editName}
              inputRef={editingId === binder.id ? inputRef : undefined}
              onTileClick={() => openBinder(binder.id)}
              onNameClick={e => startRename(e, binder)}
              onEditChange={setEditName}
              onEditBlur={() => commitRename(binder.id)}
              onEditKeyDown={e => handleKeyDown(e, binder.id)}
            />
          ))}

          {binders.length < MAX_BINDERS && (
            <AddBinderTile onClick={handleCreate} loading={creating} />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Binder tile ────────────────────────────────────────────────────────────────

interface BinderTileProps {
  binder: Binder
  isEditing: boolean
  editName: string
  inputRef?: React.RefObject<HTMLInputElement | null>
  onTileClick: () => void
  onNameClick: (e: React.MouseEvent) => void
  onEditChange: (v: string) => void
  onEditBlur: () => void
  onEditKeyDown: (e: React.KeyboardEvent) => void
}

function BinderTile({
  binder,
  isEditing,
  editName,
  inputRef,
  onTileClick,
  onNameClick,
  onEditChange,
  onEditBlur,
  onEditKeyDown,
}: BinderTileProps) {
  return (
    <div className="flex flex-col rounded-2xl border border-zinc-200 overflow-hidden shadow-sm hover:shadow-md hover:border-zinc-300 transition-all">
      {/* Cover — the only part that navigates */}
      <button
        onClick={onTileClick}
        className="flex-1 flex flex-col items-center justify-center bg-zinc-50 py-7 gap-2 active:scale-[0.97] transition-transform w-full"
      >
        <BinderIcon />
      </button>

      {/* Name bar — separate from the nav button so keyboard events can't escape */}
      <div
        onClick={onNameClick}
        className="px-3 py-2.5 bg-white border-t border-zinc-100 cursor-pointer"
      >
        {isEditing ? (
          <input
            ref={inputRef}
            value={editName}
            onChange={e => onEditChange(e.target.value)}
            onBlur={onEditBlur}
            onKeyDown={onEditKeyDown}
            onClick={e => e.stopPropagation()}
            maxLength={32}
            className="w-full text-sm font-medium text-zinc-800 bg-transparent outline-none border-b border-zinc-300 pb-0.5"
          />
        ) : (
          <p className="text-sm font-medium text-zinc-700 truncate">{binder.name}</p>
        )}
      </div>
    </div>
  )
}

// ── Add binder tile ────────────────────────────────────────────────────────────

function AddBinderTile({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex flex-col rounded-2xl border-2 border-dashed border-zinc-200 overflow-hidden hover:border-zinc-400 hover:bg-zinc-50 transition-all active:scale-[0.97] disabled:opacity-50"
    >
      {/* Cover */}
      <div className="flex-1 flex items-center justify-center bg-transparent py-7">
        {loading ? (
          <Spinner />
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-8 h-8 text-zinc-400">
            <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" />
            <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
          </svg>
        )}
      </div>

      {/* Name bar — mirrors the binder tile */}
      <div className="px-3 py-2.5 bg-white border-t border-zinc-100">
        <p className="text-sm font-medium text-zinc-400">New Binder</p>
      </div>
    </button>
  )
}

// ── Binder icon SVG ────────────────────────────────────────────────────────────

function BinderIcon() {
  return (
    <svg viewBox="0 0 48 60" fill="none" className="w-12 h-14" xmlns="http://www.w3.org/2000/svg">
      {/* Binder body */}
      <rect x="4" y="2" width="40" height="56" rx="4" fill="#f4f4f5" stroke="#d4d4d8" strokeWidth="2" />
      {/* Spine */}
      <rect x="4" y="2" width="10" height="56" rx="4" fill="#e4e4e7" />
      <rect x="10" y="2" width="2" height="56" fill="#d4d4d8" />
      {/* Ring holes */}
      <circle cx="11" cy="18" r="3" fill="white" stroke="#a1a1aa" strokeWidth="1.5" />
      <circle cx="11" cy="30" r="3" fill="white" stroke="#a1a1aa" strokeWidth="1.5" />
      <circle cx="11" cy="42" r="3" fill="white" stroke="#a1a1aa" strokeWidth="1.5" />
      {/* Lines on cover */}
      <line x1="20" y1="20" x2="38" y2="20" stroke="#d4d4d8" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="27" x2="38" y2="27" stroke="#d4d4d8" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="34" x2="32" y2="34" stroke="#d4d4d8" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
