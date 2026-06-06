import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface Binder {
  id: string
  name: string
  created_at: string
}

export const MAX_BINDERS = 15
const ACTIVE_BINDER_KEY = 'pkm_active_binder_id'

export function getActiveBinder(): string | null {
  return localStorage.getItem(ACTIVE_BINDER_KEY)
}

export function setActiveBinder(id: string) {
  localStorage.setItem(ACTIVE_BINDER_KEY, id)
}

export function useBinders(userId: string) {
  const [binders, setBinders] = useState<Binder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    init()
  }, [userId])

  async function init() {
    setLoading(true)
    const { data, error } = await supabase
      .from('binders')
      .select('id, name, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) { console.error('Failed to fetch binders:', error.message); setLoading(false); return }

    if (!data || data.length === 0) {
      const { data: created, error: createErr } = await supabase
        .from('binders')
        .insert({ user_id: userId, name: 'My Binder' })
        .select('id, name, created_at')
        .single()

      if (createErr || !created) { setLoading(false); return }

      // Migrate existing owned_cards (binder_id = null) to the default binder
      await supabase
        .from('owned_cards')
        .update({ binder_id: created.id })
        .eq('user_id', userId)
        .is('binder_id', null)

      setBinders([created])
      setActiveBinder(created.id)
    } else {
      setBinders(data)
      if (!getActiveBinder()) setActiveBinder(data[0].id)
    }

    setLoading(false)
  }

  async function createBinder(name: string): Promise<Binder | null> {
    const { data, error } = await supabase
      .from('binders')
      .insert({ user_id: userId, name })
      .select('id, name, created_at')
      .single()

    if (error || !data) { console.error('Failed to create binder:', error?.message); return null }
    setBinders(prev => [...prev, data])
    return data
  }

  async function renameBinder(id: string, name: string) {
    setBinders(prev => prev.map(b => b.id === id ? { ...b, name } : b))
    const { error } = await supabase.from('binders').update({ name }).eq('id', id)
    if (error) {
      console.error('Failed to rename binder:', error.message)
      init()
    }
  }

  return { binders, loading, createBinder, renameBinder }
}
