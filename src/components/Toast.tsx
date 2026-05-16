// ─────────────────────────────────────────────────────────────
// components/Toast.tsx
//
// Renders pop-up notification messages at the bottom of the screen.
//
// There are two pieces here:
//   Toast     — the container that holds all active toasts
//   ToastItem — a single notification that auto-dismisses after 3 seconds
//
// The toast data and logic live in useToast.ts (the hook).
// This file is purely the visual rendering.
//
// Example usage in App.tsx:
//   <Toast toasts={toasts} onRemove={removeToast} />
//
// How a toast appears and disappears:
//   1. showToast("3 cards added ✓") is called
//   2. useToast adds a ToastMessage to the toasts array
//   3. Toast renders a new ToastItem for it
//   4. ToastItem starts a 3-second timer
//   5. Timer fires → onRemove(id) → useToast removes it from the array
//   6. Toast re-renders with the item gone
// ─────────────────────────────────────────────────────────────

import { useEffect } from 'react'
import { TOAST_DURATION_MS } from '../constants/config'


// The shape of a single toast message.
// Exported so useToast.ts can reference this same type.
export interface ToastMessage {
  id: number               // unique identifier, auto-incremented by useToast
  message: string          // the text to display
  type: 'success' | 'error' // controls the color (dark grey vs red)
}

interface Props {
  toasts: ToastMessage[]
  onRemove: (id: number) => void  // called when a toast's timer expires
}


// The outer container — fixed to the bottom-center of the screen.
// Renders one ToastItem per active toast message.
export default function Toast({ toasts, onRemove }: Props) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}


// A single toast notification.
// Handles its own auto-dismiss timer so each toast is independent.
function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: number) => void }) {

  useEffect(() => {
    // Start a 3-second countdown when this item appears.
    // When the timer fires, tell the parent to remove this toast.
    const t = setTimeout(() => onRemove(toast.id), TOAST_DURATION_MS)

    // Cleanup: if this component is removed before 3 seconds
    // (e.g. user manually dismissed it), cancel the timer to prevent
    // calling onRemove on an already-removed toast.
    return () => clearTimeout(t)
  }, [toast.id]) // only re-run if the toast ID changes (it won't — this mounts once)

  return (
    <div
      className={[
        'px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium text-white',
        'animate-fade-in-up',                                       // slides up from below
        toast.type === 'success' ? 'bg-zinc-800' : 'bg-red-500',   // dark grey or red
      ].join(' ')}
    >
      {toast.message}
    </div>
  )
}