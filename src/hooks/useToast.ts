// ─────────────────────────────────────────────────────────────
// hooks/useToast.ts
//
// Manages the list of pop-up notification messages ("toasts").
//
// A toast is a temporary message that appears on screen and
// disappears after a few seconds — like "3 cards added to binder ✓".
//
// What it gives you:
//   toasts      — the current list of toast messages to display
//   showToast   — call this to add a new toast
//   removeToast — call this to remove a toast (used by the Toast component
//                 when the 3-second timer expires)
//
// Example usage:
//   const { showToast } = useToast()
//   showToast('Card added ✓')           // green success toast
//   showToast('Failed to save', 'error') // red error toast
// ─────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react'
import type { ToastMessage } from '../components/Toast'


// A module-level counter (lives outside the component) that gives each toast
// a unique ID. We can't use the array index because toasts can be removed
// mid-list, which would cause index collisions.
//
// Example: first toast gets id=0, next gets id=1, etc.
// This counter never resets during the session.
let nextId = 0

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])


  // Adds a new toast to the list.
  //
  // useCallback prevents this function from being recreated on every render.
  // This matters when passing showToast as a prop — without useCallback,
  // child components would see a "new" function every render and re-render
  // unnecessarily. The empty [] means the function is created once and reused.
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = nextId++

    // Spread the existing toasts and append the new one at the end.
    // Using the function form of setState (prev => ...) ensures we always
    // read the latest state, not a stale snapshot from a closure.
    setToasts(prev => [...prev, { id, message, type }])
  }, [])


  // Removes a specific toast by its ID.
  // Called by the ToastItem component when its 3-second auto-dismiss timer fires.
  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, showToast, removeToast }
}