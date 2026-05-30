export interface Card {
  id: string        // text PK e.g. "581-101"
  name: string
  pack: string
  image_url: string // full URL e.g. https://cards.zapokebinder.com/pkm-cards/581-101.jpg
  pokemon_id: number
}

export interface Pokemon {
  id: number
  name: string
  image_url: string
}

// Used by the admin upload flow to build a full image_url from a worker path
export const R2_BASE = import.meta.env.VITE_R2_BASE_URL as string
