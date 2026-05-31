export interface Card {
  id: string
  name: string
  pack: string
  image_url: string
  pokemon_id: number
  pack_id: number | null
}

export interface Pokemon {
  id: number
  name: string
  image_url: string
}

export interface Pack {
  id: number
  name: string
  image_url: string
  card_count: number | null
  release_date: string | null
}
