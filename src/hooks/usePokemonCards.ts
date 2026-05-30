import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Card, Pokemon } from '../data/cards'

export function usePokemonCards(pokemonId: number) {
  const [pokemon, setPokemon] = useState<Pokemon | null>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!pokemonId) return
    setLoading(true)

    Promise.all([
      supabase.from('pokemon').select('*').eq('id', pokemonId).single(),
      supabase.from('scraped_cards').select('*').eq('pokemon_id', pokemonId).order('name'),
    ]).then(([pokemonRes, cardsRes]) => {
      if (pokemonRes.error) console.error('Failed to fetch pokemon:', pokemonRes.error.message)
      else setPokemon(pokemonRes.data as Pokemon)

      if (cardsRes.error) console.error('Failed to fetch cards:', cardsRes.error.message)
      else setCards((cardsRes.data ?? []) as Card[])

      setLoading(false)
    })
  }, [pokemonId])

  return { pokemon, cards, loading }
}
