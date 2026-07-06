import type { SearchResult } from '../../../shared/ipc-contract'
import { noteDisplayName } from '../vault/scope'

/**
 * Presentational result list shared by every tree panel's search: one
 * block per file with kind-tagged match excerpts. Selection semantics
 * (guards, tab params) stay with the host via onOpen.
 */
export function SearchResultsList({
  results,
  activePath,
  onOpen
}: {
  results: SearchResult[]
  activePath: string | null
  onOpen: (relPath: string) => void
}): React.JSX.Element {
  return (
    <div className="search-results">
      {results.length === 0 && <p className="search-empty">no matches</p>}
      {results.map((result) => (
        <div key={result.relPath} className="search-result">
          <button
            type="button"
            className={result.relPath === activePath ? 'active' : ''}
            title={result.relPath}
            onClick={() => onOpen(result.relPath)}
          >
            {noteDisplayName(result.name)}
          </button>
          <ul>
            {result.matches.map((match, index) => (
              <li key={index}>
                <span className={`match-kind kind-${match.kind}`}>
                  {match.kind === 'filename'
                    ? 'file'
                    : match.kind === 'heading'
                      ? 'h'
                      : '¶'}
                </span>
                <span className="match-excerpt" title={match.excerpt}>
                  {match.kind === 'filename'
                    ? noteDisplayName(match.excerpt)
                    : match.excerpt}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
