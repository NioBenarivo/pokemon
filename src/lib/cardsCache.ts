import type { Card } from '../data/cards'

const CACHE_KEY = 'pokeBinder_cards_v1'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

interface Cache {
  cards: Card[]
  cachedAt: number
}

export function getCachedCards(): Card[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { cards, cachedAt }: Cache = JSON.parse(raw)
    if (Date.now() - cachedAt > CACHE_TTL_MS) return null
    return cards
  } catch {
    return null
  }
}

export function setCachedCards(cards: Card[]): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ cards, cachedAt: Date.now() }))
}

export function clearCardsCache(): void {
  localStorage.removeItem(CACHE_KEY)
}
