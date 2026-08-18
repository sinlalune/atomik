import type {
  ConsultedMaterial,
  ConsultedSource
} from '../../../shared/chat-citations'

/**
 * What an answer consulted outside the vault (CP-MVP-011 S07b).
 *
 * The owner's bench verdict on S07a was that the lookup happened invisibly:
 * tokens spent, Wikipedia's authority borrowed, and no way to check it. This
 * block is the answer to that — every consulted page named, with the exact
 * revision that was read and when.
 *
 * It is deliberately NOT a citation marker. Markers bind a sentence to a
 * source and arrive with the model's own text; this names what was READ,
 * whether or not the model chose to cite it. An answer that consulted three
 * pages and cited none is exactly the case worth showing.
 */

const KIND_LABELS: Record<ConsultedSource['kind'], string> = {
  'wikipedia-article': 'article',
  'wikidata-entity': 'entity',
  'wiktionary-etymology': 'etymology'
}

function revisionLabel(source: ConsultedSource): string {
  if (source.revision === null) return 'revision not exposed'
  // A bare number is a revision id; anything else is already a timestamp.
  return /^\d+$/.test(source.revision)
    ? `rev ${source.revision}`
    : `as of ${source.revision.slice(0, 10)}`
}

export function ConsultedBlock({
  material,
  onCopy,
  onOpenNote
}: {
  material: ConsultedMaterial
  onCopy: (value: string) => void
  onOpenNote: (path: string) => void
}): React.JSX.Element {
  return (
    <section className="chat-consulted" aria-label="Consulted sources">
      {/* S07e: the image LEADS. It is the most legible thing an augmented
          answer produced, and trailing the source list made it read as an
          afterthought — the owner's words: "would want it first and well
          presented". Attribution rides with it, never in a tooltip: a credit
          one hover away is a credit not given. */}
      {material.media.length > 0 && (
        <ul className="chat-consulted-media">
          {material.media.map((item) => (
            <li key={item.url}>
              <img
                src={item.thumbnailUrl}
                alt={item.title}
                loading="lazy"
                {...(item.width > 0 && item.height > 0
                  ? { width: item.width, height: item.height }
                  : {})}
              />
              <span className="chat-consulted-credit">
                <span className="chat-consulted-file">{item.title}</span>
                {item.creator} · {item.license.name}
              </span>
            </li>
          ))}
        </ul>
      )}

      {material.warnings.length > 0 && (
        <ul className="chat-consulted-warnings">
          {material.warnings.map((warning) => (
            <li key={`${warning.kind}:${warning.message}`}>
              <span className="chat-consulted-warn-kind">{warning.kind}</span>
              {warning.message}
            </li>
          ))}
        </ul>
      )}

      {/* A note the model asked for by calling search_vault. The pre-pass
          packet rides the QUESTION and opens from its pill; this retrieval
          happened mid-answer and had no surface at all until S07c. */}
      {material.notes.length > 0 && (
        <ul className="chat-consulted-list">
          {material.notes.map((note) => (
            <li key={note.path}>
              <span className="chat-consulted-kind kind-vault">vault</span>
              <button
                type="button"
                className="chat-consulted-note"
                title={`${note.path}${note.reason ? ` — ${note.reason}` : ''}`}
                onClick={() => onOpenNote(note.path)}
              >
                {note.title}
              </button>
              <span className="chat-consulted-meta">
                {note.stage} · ~{note.tokens} tok
              </span>
            </li>
          ))}
        </ul>
      )}

      <ul className="chat-consulted-list">
        {material.sources.map((source) => (
          <li key={source.url}>
            {/* The citation number the model was given, so the block and the
                chips in the prose read as one list rather than two. */}
            {source.number !== undefined && (
              <span className="chat-consulted-number">[{source.number}]</span>
            )}
            <span className={`chat-consulted-kind kind-${source.kind}`}>
              {KIND_LABELS[source.kind]}
            </span>
            <span className="chat-consulted-title">{source.title}</span>
            <span className="chat-consulted-meta">
              {source.project} · {source.language} · {revisionLabel(source)}
            </span>
            {/* No in-app navigation yet: opening a live remote page is the
                web-source lifecycle's job, and that arrives with save-as-source
                (S08). Until then the URL is copyable rather than pretending. */}
            <button
              type="button"
              className="chat-consulted-url"
              title={`Copy ${source.url}`}
              aria-label={`Copy the URL of ${source.title}`}
              onClick={() => onCopy(source.url)}
            >
              copy link
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
