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
    const timer = window.setTimeout(() => {
      search(trimmed).then(setResults, () => setResults([]))
    }, 250)
    return () => window.clearTimeout(timer)
  }, [query, search])

  return { query, setQuery, results }
}
