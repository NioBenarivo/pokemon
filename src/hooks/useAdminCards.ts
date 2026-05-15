import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { type Card } from '../data/cards'

export type CardInput = Omit<Card, 'id'>

export function useAdminCards() {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    const { data } = await supabase.from('cards').select('*').order('id')
    if (data) setCards(data as Card[])
    setLoading(false)
  }

  async function createCard(input: CardInput) {
    const { data, error } = await supabase.from('cards').insert(input).select().single()
    if (!error && data) setCards(prev => [...prev, data as Card])
    return error
  }

  async function updateCard(id: number, input: CardInput) {
    const { error } = await supabase.from('cards').update(input).eq('id', id)
    if (!error) setCards(prev => prev.map(c => c.id === id ? { id, ...input } : c))
    return error
  }

  async function deleteCard(id: number) {
    const { error } = await supabase.from('cards').delete().eq('id', id)
    if (!error) setCards(prev => prev.filter(c => c.id !== id))
    return error
  }

  return { cards, loading, createCard, updateCard, deleteCard }
}
