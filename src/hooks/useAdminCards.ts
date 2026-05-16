// ─────────────────────────────────────────────────────────────
// hooks/useAdminCards.ts
//
// Handles all CRUD (Create, Read, Update, Delete) operations
// for cards in the admin panel.
//
// It keeps a local copy of all cards in state so the table
// updates instantly after any operation — without re-fetching
// the entire list from the database each time.
//
// After every mutation it also calls clearCardsCache() so that
// regular users get fresh data on their next visit.
//
// What it gives you:
//   cards       — full list of all Card objects
//   loading     — true while the initial fetch is running
//   createCard  — insert a new card into the database
//   updateCard  — edit an existing card
//   deleteCard  — remove a card permanently
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { type Card } from '../data/cards'
import { clearCardsCache } from '../lib/cardsCache'


// CardInput is the Card type but WITHOUT the "id" field.
// When creating a new card, we don't know the ID yet — the database
// auto-generates it. So we accept everything except id.
//
// Omit<Card, 'id'> is a TypeScript utility that means:
//   "take the Card type and remove the 'id' field"
//   → { name: string, pack: string, image: string }
export type CardInput = Omit<Card, 'id'>

export function useAdminCards() {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)


  // Fetch all cards when the admin page first loads
  useEffect(() => {
    fetchAll()
  }, [])


  // ── fetchAll ─────────────────────────────────────────────────────────────
  // Loads all cards from the database, ordered by ID.
  // Also used to refresh the list after failed operations.
  async function fetchAll() {
    setLoading(true)
    const { data } = await supabase.from('cards').select('*').order('id', { ascending: false })
    if (data) setCards(data as Card[])
    setLoading(false)
  }


  // ── createCard ───────────────────────────────────────────────────────────
  //
  // Inserts a new card into the database.
  //
  // .insert(input)  — sends the new card data to Supabase
  // .select()       — tells Supabase to return the inserted row
  // .single()       — because we inserted 1 row, expect exactly 1 back
  //
  // The returned row includes the auto-generated "id" from the database.
  // We append it to local state so the table shows it immediately.
  //
  // Returns the error object (or null) so the caller can show an error message.
  async function createCard(input: CardInput) {
    const { data, error } = await supabase.from('cards').insert(input).select().single()

    if (!error && data) {
      setCards(prev => [data as Card, ...prev])  // add to end of list
      clearCardsCache()                           // invalidate the user-facing cache
    }

    return error
  }


  // ── updateCard ───────────────────────────────────────────────────────────
  //
  // Updates an existing card identified by its ID.
  //
  // .update(input)  — the new field values to write
  // .eq('id', id)   — the WHERE clause: only update the row where id matches
  //
  // After success, we patch local state by mapping over the cards and
  // replacing just the one that changed. This avoids a full re-fetch.
  async function updateCard(id: number, input: CardInput) {
    const { error } = await supabase.from('cards').update(input).eq('id', id)

    if (!error) {
      // Replace the old card object with the updated one
      setCards(prev => prev.map(c => c.id === id ? { id, ...input } : c))
      clearCardsCache()
    }

    return error
  }


  // ── deleteCard ───────────────────────────────────────────────────────────
  //
  // Permanently deletes a card from the database.
  // This also removes the card from every user's binder
  // (Supabase foreign key cascade handles that automatically).
  //
  // After success, we filter the card out of local state.
  async function deleteCard(id: number) {
    const { error } = await supabase.from('cards').delete().eq('id', id)

    if (!error) {
      setCards(prev => prev.filter(c => c.id !== id))  // remove from list
      clearCardsCache()
    }

    return error
  }

  return { cards, loading, createCard, updateCard, deleteCard }
}
