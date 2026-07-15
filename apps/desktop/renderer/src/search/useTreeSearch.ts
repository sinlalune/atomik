import { useEffect, useState } from 'react'
import type { SearchResult } from '../../../shared/ipc-contract'

/**
 * Debounced search-box state for a tree panel (owner feedback on MVP-001:
 * every mode gets a search bar over its own perimeter). The caller decides
 * WHAT is searched by supplying the channel call; an empty query means
 * "show the tree again" (results === null).
 */
export function useTreeSearch(
  search: (query: string) => Promise<SearchResult[]>
): {
  query: string
  setQuery: (query: string) => void
  results: SearchResult[] | null
} {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[] | null>(null)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length === 0) {
      setResults(null)
      return
    }
    // latest-wins: a slower older scan must never overwrite a newer
    // one's results (the cleanup marks the in-flight request stale
    // when the query moves on)
    let stale = false
    const timer = window.setTimeout(() => {
      search(trimmed).then(
        (found) => {
          if (!stale) setResults(found)
        },
        () => {
          if (!stale) setResults([])
        }
      )
    }, 250)
    return () => {
      stale = true
      window.clearTimeout(timer)
    }
  }, [query, search])

  return { query, setQuery, results }
}
