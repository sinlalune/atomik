# ADR-015: Wikimedia grounding is a bounded client-tool loop, transient first

Status: accepted
Date: 2026-08-17

## Context

CP-MVP-010 made chat able to retrieve from the owner's vault and report whether
that vault is `covered`, `thin`, or `empty`. CP-MVP-011 adds the next rung for
public background knowledge. That rung crosses two trust boundaries at once:

- remote Wikimedia content enters the application; and
- a model may request another operation after its first response.

The obvious shortcuts all break an existing contract. A renderer-side fetch
would widen IPC into a network primitive (13). Provider-native web search would
bypass Atomik's source, privacy, citation, and trace rules (28/29/33). Silently
capturing everything consulted would turn transient relevance into canonical
knowledge (04/30). Treating every provider's tool payload as the application
contract would fork the harness once per vendor (15).

The owner's CP-MVP-011 opening confirmation accepted a narrower package:
Wikipedia, Wikidata, Commons P18, and Wiktionary; `search_vault` and
`search_wiki`; transient by default; explicit Save as source; no generic web
search, dump, crawl, or automatic persistence.

## Decision

### One fixed-host Wikimedia seat

All Wikimedia I/O lives in one main-process seat with injected transport,
clock, cancellation, and user agent. The caller supplies project, language and
query — never a URL. Host construction is an allowlisted pure function:

```text
Wikipedia   <language>.wikipedia.org
Wiktionary  <language>.wiktionary.org
Wikidata    www.wikidata.org
Commons     commons.wikimedia.org
```

Wikipedia and Wiktionary pages use MediaWiki Core REST under
`/w/rest.php/v1`; Wikidata and Commons use the Action API under `/w/api.php`.
Raw HTML is parsed and bounded in main. The renderer receives typed plain text,
provenance and attributed media, never a generic fetch door.

The product budgets are code constants. They are not claims about Wikimedia's
current server limits. A 429 remains authoritative, `Retry-After` is honoured
within the operation's wall budget, and concurrency stays deliberately low.

### One provider-neutral client-tool protocol

The model sees two read-only tools:

```text
search_vault  bounded lexical/graph ContextPacket search
search_wiki   bounded Wikimedia search with an explicit language and corpus
```

Each provider adapter translates its native payload into the same
discriminated union. Main then validates the call against the allowlist and
hard budgets, executes it, labels its result untrusted, and gives the result
back to that adapter. Provider-native web/search tools are never enabled.

Adapter capability is fail-closed. Every adapter is `unsupported` until it has
recorded request/response fixtures and implements both halves of its native
tool exchange. An unsupported adapter keeps CP-MVP-010's deterministic vault
pre-pass and exposes the limitation; it never receives a pretend tool prompt.

The loop is bounded by total calls, depth, argument size, per-call and total
result text, result bytes, wall time, cancellation, and Wikimedia network
requests. Parallel provider calls are initially disabled even when a provider
offers them: deterministic sequential accounting is easier to inspect and
cancel. Every tool call receives a child ActionTrace whose parent generation
id exists before the first provider turn; neither query nor result content is
recorded in telemetry.

### Transient projection before files

Wikipedia extracts, Wiktionary etymology, Wikidata entities/relations, and
Commons media are live evidence objects. They may appear in a chat turn and in
a disposable graph augmentation, but they are not vault nodes and never enter
the canonical graph index merely because a model consulted them.

External citations extend the existing citation map with a source kind and
canonical URL. Citation establishes where a statement came from, not that the
statement is true. Commons images are illustration with a creator, licence and
source page; absence of meaningful attribution withholds the image.

Only the explicit **Save as source** gesture promotes a consulted result. That
gesture previews an ordinary source dossier, deduplicates its canonical URL,
records revision/access/licence data, copies durable media locally, and uses
the existing source/vault write lifecycle with rollback.

### A text budget selects; it does not truncate

Bounding what a page contributes is not optional — a 200 000-character article
cannot enter a prompt. But a positional cut ("the first 6 000 characters") is
an arbitrary answer to a relevance question, and it fails silently: the reader
is told the page was clipped, not that the part they asked about was dropped.

So the budget is spent by the lexical scorer the vault already uses (BM25 over
`retrieval-core`), scoring an article's sections against the query, with the
lead always kept and capped. What was read and what was left out is reported
with the result. This stays inside 33's evaluated lexical baseline; semantic
selection would need embeddings, which are a separately evaluated M9 rung.

### The audit record names identities, never the fetched prose

A run's agent trace is durable and lives in the vault beside the transcript it
explains (`chats/<day>/<slug>-traces/turn-NN.md`, linked from the answer's
heading). It is a different artifact from `.atomik/usage/private/actions.jsonl`,
which stays content-free telemetry: an audit that cannot name the query the
model wrote or the revision it read audits nothing.

It covers EVERY answered turn, including one that called no tool: an audit
trail with holes is worse than none, and the turn that found nothing is often
the one worth reading.

The line it does not cross is the PUBLIC prose. Article extracts, packet excerpts and
the untrusted `content` a tool result carries are NEVER written to the trace —
recording them would create a durable copy of public material as a side effect
of consultation, which is precisely the promotion **Save as source** exists to
make deliberately, with licence and revision.

A vault packet excerpt is the opposite case and the line falls the other way:
it is the user's own note, quoted from a file already in this vault, so the
trace keeps it — it is the only way to answer "what did it read of mine?"
after the session ended. So the trace records what was ASKED (tool arguments),
what was READ (URL, revision, licence, path, stage), the vault text actually
sent, and every FIGURE — and no fetched public prose.

## Consequences

- An answer produced through tools can be audited after the session that
  produced it is gone, without consultation quietly becoming persistence.
- The renderer and provider adapters cannot turn Wikimedia support into
  arbitrary network access.
- The model chooses whether and what to search, while main retains authority
  over allowed verbs, budgets, cancellation and data classification.
- A new provider needs only a native tool-message codec; tool execution,
  validation, citations, traces and persistence remain shared.
- Multilingual access is explicit. A malformed language cannot become an
  attacker-chosen host.
- Live results remain reproducible enough to inspect because page/revision,
  canonical URL, access time and licence travel with the excerpt.
- Wikidata stays a bounded projection over an allowlisted property vocabulary,
  not a shadow database or an imposed ontology.
- The conservative defaults cost recall: ambiguous entities remain multiple
  candidates; unknown Wiktionary status stays unknown; unattributed Commons
  media is not shown.
- Live API drift is expected. CI uses dated fixtures and contract tests; a
  separate opt-in probe refreshes facts without making the test suite depend
  on Wikimedia availability.

## Alternatives considered

- **Renderer-side Wikimedia fetch** — rejected: hostile content and caller URLs
  would cross the trusted UI boundary, contrary to 13.
- **Provider-native web search** — rejected: it bypasses Atomik's allowlist,
  attribution, privacy mode, citation map, budgets and ActionTrace semantics.
- **A textual “please call this JSON tool” prompt** — rejected: no native stop
  reason or call id, weak schema adherence, and output/tool ambiguity.
- **Automatic search whenever coverage is thin** — rejected: `thin` is useful
  context for the model and user, not consent to make a network request.
- **Persist every consulted page** — rejected: relevance during one turn does
  not make material part of the owner's knowledge base.
- **Wikidata dump, SPARQL mirror, Kiwix/ZIM or SQLite subset** — deferred until
  live-seat evaluation supplies a measured reason for an offline rung.
- **Media hotlinks in durable notes** — rejected: durability and licensing
  require a local asset plus its attribution record.

## Migration / rollback

The live objects and external graph augmentation are disposable. Removing the
seat or deleting its caches loses no authored knowledge. Saved dossiers are
ordinary files and remain readable if live grounding is disabled. An adapter
can be rolled back to `unsupported` without changing the renderer contract;
the deterministic CP-MVP-010 path continues to work.

## Links

- `docs/research/wikimedia-live-api-snapshot-2026-08-17.md`
- `docs/bedrock/29_29-verification-grounding-router.md`
- `docs/bedrock/30_30-public-knowledge-dictionary.md`
- `docs/bedrock/33_33-retrieval-local-execution-cost.md`
- ADR-004/005/006/007/008/011/013
- `atomik-project/coding-paths/CP-MVP-011.md`

