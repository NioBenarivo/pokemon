// ─────────────────────────────────────────────────────────────
// hooks/useOwnedCards.ts
//
// Tracks which cards the logged-in user has added to their binder.
//
// The database has an "owned_cards" table with rows like:
//   { user_id: "abc-123", card_id: 42 }
//
// This hook loads all those card IDs into a Set so the UI can
// instantly check "does the user own card #42?" with owned.has(42).
//
// What it gives you:
//   owned         — a Set<number> of card IDs the user owns
//                   e.g. Set { 3, 7, 42 }
//   addMultiple   — adds an array of card IDs to the binder
//   removeMultiple — removes an array of card IDs from the binder
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useOwnedCards(userId: string) {

  // A Set is used instead of an array because Set.has() is O(1) — instant.
  // With an array you'd have to loop through every element each time.
  //
  // Example: owned.has(42) → true (the user owns card #42)
  const [owned, setOwned] = useState<Set<number>>(new Set())


  // ── On mount: load all owned card IDs from the database ─────────────────
  useEffect(() => {
    if (!userId) return  // not logged in yet — do nothing

    async function fetchOwned() {
      const { data, error } = await supabase
        .from('owned_cards')
        .select('card_id')     // we only need the card ID, not all columns
        .eq('user_id', userId) // only this user's cards

      if (error) {
        console.error('Failed to fetch owned cards:', error.message)
        return
      }

      // data looks like: [{ card_id: 3 }, { card_id: 7 }, { card_id: 42 }]
      // We convert it to a Set of plain numbers: Set { 3, 7, 42 }
      if (data) setOwned(new Set(data.map((r: { card_id: number }) => r.card_id)))
    }

    fetchOwned()
  }, [userId]) // re-runs if the logged-in user changes (e.g. after sign-in)


  // ── addMultiple ──────────────────────────────────────────────────────────
  //
  // Inserts multiple rows into owned_cards at once.
  //
  // Example:
  //   await addMultiple([3, 7, 42])
  //   → inserts { user_id, card_id: 3 }, { user_id, card_id: 7 }, etc.
  //
  // "upsert" means: insert if the row doesn't exist, skip if it already does.
  // { onConflict: 'user_id,card_id' } tells Supabase which columns to check
  // for uniqueness — prevents duplicate rows if the user somehow adds twice.
  async function addMultiple(cardIds: number[]) {
    if (cardIds.length === 0) return

    const rows = cardIds.map(card_id => ({ user_id: userId, card_id }))

    const { error } = await supabase
      .from('owned_cards')
      .upsert(rows, { onConflict: 'user_id,card_id' })

    if (error) {
      console.error('Failed to add cards:', error.message)
    }

    if (!error) {
      // Update local state so the UI reflects the change immediately,
      // without needing to re-fetch from the database.
      setOwned(prev => new Set([...prev, ...cardIds]))
    }
  }


  // ── removeMultiple ───────────────────────────────────────────────────────
  //
  // Removes multiple card IDs from owned_cards in one database call.
  //
  // Notice the order here: we update the UI state FIRST, then do the
  // database delete. This is called "optimistic update" — the UI feels
  // instant, and if the database fails, we roll back (re-add the IDs).
  async function removeMultiple(cardIds: number[]) {
    if (cardIds.length === 0) return

    // Step 1: Remove from local state immediately so the UI updates instantly
    setOwned(prev => {
      const next = new Set(prev)
      cardIds.forEach(id => next.delete(id))
      return next
    })

    // Step 2: Delete from the database
    const { error } = await supabase
      .from('owned_cards')
      .delete()
      .eq('user_id', userId)
      .in('card_id', cardIds)  // delete all rows where card_id is in this list

    if (error) {
      // Step 3 (only on failure): Roll back the optimistic update
      console.error('Failed to remove cards:', error.message)
      setOwned(prev => new Set([...prev, ...cardIds]))
    }
  }

  return { owned, addMultiple, removeMultiple }
}
