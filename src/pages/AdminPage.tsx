// ─────────────────────────────────────────────────────────────
// pages/AdminPage.tsx
//
// The admin panel — only shown to users with role = 'admin'.
// Lets admins create, edit, and delete cards from the database.
//
// This page manages three UI layers:
//   1. The main table   — CardTable lists all cards
//   2. Create/Edit modal — CardFormModal (opens when editing or adding)
//   3. Delete confirmation dialog — inline JSX (opens when deleting)
//
// The modal state uses a three-value trick to distinguish two cases:
//   modalCard = undefined  → modal is closed  (isModalOpen = false)
//   modalCard = null       → create mode      (new card, empty form)
//   modalCard = { ... }   → edit mode         (existing card, pre-filled form)
//
// Search filtering is done client-side (no database query) because
// the admin already has all cards loaded into memory via useAdminCards.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react'
import { LOADING, TOAST, DELETE_DIALOG } from '../constants/strings'
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

  // Three-value state for the modal:
  //   undefined = closed, null = create mode, Card = edit mode
  const [modalCard, setModalCard] = useState<Card | null | undefined>(undefined)

  const [deleteTarget, setDeleteTarget] = useState<Card | null>(null)  // card queued for deletion
  const [deleting, setDeleting] = useState(false)                       // true while delete is in progress
  const [deleteError, setDeleteError] = useState<string | null>(null)  // error message from failed delete

  if (loading) return <LoadingScreen message={LOADING.CARDS} />

  // modalCard !== undefined means the modal should be shown
  const isModalOpen = modalCard !== undefined

  // Client-side search: filter the already-loaded cards array in memory.
  // Checks both name and pack so you can search "Genetic Apex" to find all cards in that set.
  const query = search.trim().toLowerCase()
  const filteredCards = query
    ? cards.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.pack.toLowerCase().includes(query)
      )
    : cards

  // Called by CardFormModal when the Save button is clicked.
  // Decides whether to create or update based on whether modalCard has an id.
  async function handleSave(input: Parameters<typeof createCard>[0]) {
    const error = modalCard
      ? await updateCard(modalCard.id, input)  // edit mode: update existing
      : await createCard(input)                 // create mode: insert new

    if (!error) {
      showToast(modalCard ? TOAST.CARD_UPDATED : TOAST.CARD_CREATED)
    }
    return error  // returned to CardFormModal so it can show an error message
  }

  // Called when the admin clicks "Delete" in the confirmation dialog.
  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const error = await deleteCard(deleteTarget.id)
    setDeleting(false)

    if (error) {
      // Show inline error inside the dialog so the admin knows what went wrong
      setDeleteError((error as { message?: string }).message ?? DELETE_DIALOG.ERROR_FALLBACK)
    } else {
      showToast(TOAST.CARD_DELETED)
      setDeleteTarget(null)  // closes the confirmation dialog
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
            <h2 className="text-zinc-900 font-bold text-lg mb-2">{DELETE_DIALOG.TITLE}</h2>
            <p className="text-zinc-500 text-sm mb-1">
              <span className="font-medium text-zinc-800">{deleteTarget.name}</span> {DELETE_DIALOG.BODY}
            </p>
            <p className="text-zinc-400 text-xs mb-5">{DELETE_DIALOG.WARNING}</p>
            {deleteError && <p className="text-red-500 text-xs mb-3">{deleteError}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
              >
                {DELETE_DIALOG.CANCEL}
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deleting ? DELETE_DIALOG.CONFIRMING : DELETE_DIALOG.CONFIRM}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
