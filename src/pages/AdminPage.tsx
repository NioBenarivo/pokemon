import { useState } from 'react'
import { type Card } from '../data/cards'
import { useAdminCards } from '../hooks/useAdminCards'
import CardTable from '../components/admin/CardTable'
import CardFormModal from '../components/admin/CardFormModal'
import LoadingScreen from '../components/LoadingScreen'

interface Props {
  onSignOut: () => void
}

export default function AdminPage({ onSignOut }: Props) {
  const { cards, loading, createCard, updateCard, deleteCard } = useAdminCards()
  const [modalCard, setModalCard] = useState<Card | null | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<Card | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  if (loading) return <LoadingScreen message="Loading cards..." />

  const isModalOpen = modalCard !== undefined

  async function handleSave(input: Parameters<typeof createCard>[0]) {
    if (modalCard) return updateCard(modalCard.id, input)
    return createCard(input)
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const error = await deleteCard(deleteTarget.id)
    setDeleting(false)
    if (error) {
      setDeleteError((error as { message?: string }).message ?? 'Failed to delete.')
    } else {
      setDeleteTarget(null)
    }
  }

  return (
    <div className="bg-white min-h-screen py-10 px-4 font-sans">
      <div className="max-w-5xl mx-auto">

        <header className="flex items-center justify-between mb-8">
          <div>
            <p className="text-zinc-400 text-xs uppercase tracking-widest mb-1">Admin</p>
            <h1 className="text-zinc-900 text-2xl font-bold tracking-tight">Card Management</h1>
          </div>
          <button
            onClick={onSignOut}
            className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            Sign out
          </button>
        </header>

        <div className="flex items-center justify-between mb-4">
          <p className="text-zinc-500 text-sm">
            <span className="text-zinc-900 font-semibold">{cards.length}</span> cards total
          </p>
          <button
            onClick={() => setModalCard(null)}
            className="text-sm font-semibold text-white bg-zinc-900 px-4 py-2 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            + New Card
          </button>
        </div>

        <CardTable
          cards={cards}
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
    </div>
  )
}
