import { useState, useEffect, useRef } from 'react'
import { SCROLL_ROOT_MARGIN } from '../constants/config'

interface Props {
  loadMore: () => void
  loading: boolean
  reloading: boolean
  loadingMore: boolean
}

export function useInfiniteScroll({ loadMore, loading, reloading, loadingMore }: Props) {
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null)

  const loadMoreRef = useRef(loadMore)
  loadMoreRef.current = loadMore

  const sentinelVisibleRef = useRef(false)

  useEffect(() => {
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        sentinelVisibleRef.current = entry.isIntersecting
        if (entry.isIntersecting) loadMoreRef.current()
      },
      { rootMargin: SCROLL_ROOT_MARGIN }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [sentinel])

  useEffect(() => {
    if (!loading && !reloading && !loadingMore && sentinelVisibleRef.current) {
      loadMoreRef.current()
    }
  }, [loading, reloading, loadingMore])

  return { setSentinel }
}
