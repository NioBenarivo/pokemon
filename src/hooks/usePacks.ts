import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Pack } from '../data/cards'

export function usePacks(searchQuery: string) {
  const [packs, setPacks] = useState<Pack[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)

    let q = supabase
      .from('packs')
      .select('*')

    if (searchQuery) q = q.ilike('name', `%${searchQuery}%`)

    q.then(({ data, error }) => {
      if (error) { console.error('Failed to fetch packs:', error.message); setLoading(false); return }

      const sorted = ((data ?? []) as Pack[]).sort((a, b) => {
        const parse = (d: string | null) => d ? new Date(d.replace('.', '')) : new Date(0)
        return parse(b.release_date) .getTime() - parse(a.release_date).getTime()
      })

      setPacks(sorted)
      setLoading(false)
    })
  }, [searchQuery])

  return { packs, loading }
}
