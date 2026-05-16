import { useState } from 'react'
import { type Card } from '../data/cards'
import { useAdminCards } from '../hooks/useAdminCards'
import CardTable from '../components/admin/CardTable'
import CardFormModal from '../components/admin/CardFormModal'
import AdminHeader from '../components/admin/AdminHeader'
import AdminToolbar from '../components/admin/AdminToolbar'
import LoadingScreen from '../components/LoadingScreen'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'

interface Props {
  onSignOut: () => void
}

export default function AdminPage({ onSignOut }: Props) {
  const { cards, loading, createCard, updateCard, deleteCard } = useAdminCards()
  const { toasts, showToast, removeToast } = useToast()

  const [search, setSearch] = useState('')
  const [modalCard, setModalCard] = useState<Card | null | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<Card | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  if (loading) return <LoadingScreen message="Loading cards..." />

  const isModalOpen = modalCard !== undefined
  const query = search.trim().toLowerCase()
  const filteredCards = query
    ? cards.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.pack.toLowerCase().includes(query)
      )
    : cards

  async function handleSave(input: Parameters<typeof createCard>[0]) {
    const error = modalCard
      ? await updateCard(modalCard.id, input)
      : await createCard(input)
  
    if (!error) {
      showToast(modalCard ? 'Card updated ✓' : 'Card created ✓')
    }
    return error
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const error = await deleteCard(deleteTarget.id)
    setDeleting(false)
    if (error) {
      setDeleteError((error as { message?: string }).message ?? 'Failed to delete.')
    } else {
      showToast('Card deleted')
      setDeleteTarget(null)
    }
  }

  return (
    <div className="bg-white min-h-screen py-10 px-4 font-sans">
      <div className="max-w-5xl mx-auto">

        <AdminHeader onSignOut={onSignOut} />

        <AdminToolbar
          search={search}
          onSearchChange={setSearch}
          totalCount={cards.length}
          filteredCount={filteredCards.length}
          onNewCard={() => setModalCard(null)}
        />

        <CardTable
          cards={filteredCards}
          onEdit={card => setModalCard(card)}
          onDelete={card => { setDeleteTarget(card); setDeleteError(null) }}
        />

      </div>

      {/* Create / Edit modal */}
      {isModalOpen && (
        <CardFormModal
          card={modalCard ?? null}
          onSave={handleSave}
          onClose={() => setModalCard(undefined)}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-zinc-900 font-bold text-lg mb-2">Delete card?</h2>
            <p className="text-zinc-500 text-sm mb-1">
              <span className="font-medium text-zinc-800">{deleteTarget.name}</span> will be permanently removed.
            </p>
            <p className="text-zinc-400 text-xs mb-5">This will also remove it from all users' binders.</p>
            {deleteError && <p className="text-red-500 text-xs mb-3">{deleteError}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
