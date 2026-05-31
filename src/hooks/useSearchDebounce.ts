import { useState, useEffect } from 'react'
import { SEARCH_DEBOUNCE_MS } from '../constants/config'

export function useSearchDebounce() {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchQuery])

  return { searchQuery, setSearchQuery, debouncedSearch }
}
