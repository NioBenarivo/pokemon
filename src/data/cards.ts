export interface Card {
  id: number
  name: string
  pack: string
  image: string
}

export const CARDS_PER_PAGE = 9

export const R2_BASE = import.meta.env.VITE_R2_BASE_URL as string
