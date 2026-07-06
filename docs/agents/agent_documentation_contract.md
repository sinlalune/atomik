# Agent documentation contract

A coding agent working on Atomik must treat documentation as part of the implementation.

## Required for every core module

- Explain what the module owns.
- Explain why it exists.
- Explain what it must not own.
- Document public contracts and data flow.
- List alternatives considered if the choice is architectural.
- Add tests or fixtures.
- Add an agent checklist.
- Preserve Git-friendly file writes and avoid noisy rewrites.
- For truth-related modules, distinguish durable record state from epistemic support.
- For provider-dependent behavior, record official sources, `checked_at`, assumptions, and recheck triggers.

## Required for boundary changes

Create or update an ADR when changing:

- platform architecture
- project bundle model
- source adapter contract
- source dossier format
- context packet / context pack format
- AI operation contract
- retrieval strategy / context compilation contract
- execution policy / operation budget / ActionTrace contract
- local model or runtime capability/default
- claim / evidence / verification contract
- Truth Lens behavior
- live grounding / provider boundary
- provider privacy, retention, display, or cost policy
- token/work-unit accounting and cost estimation policy
- public knowledge-pack contract
- dictionary / lexicographic / etymology contract
- patch format
- IPC/preload API
- file format
- persistent workspace format
- Git behavior
- security boundary
- future DSL grammar
- future canvas format
- coding path / work ledger / execution-state contract
- dual-plane repository layout
- note lifecycle states
- link proposal behavior

## External-fact discipline

When documentation states a fact that may change—pricing, model availability, model performance, memory/device support, API behavior, law, provider terms, retention, licenses, export formats, platform security recommendations—the same work unit must:

1. Prefer an official primary source.
2. Record the source URL.
3. Record the date checked.
4. State relevant model/account/region/version assumptions.
5. Add a recheck trigger.
6. Avoid converting a dated fact into a timeless architectural guarantee.

## Truth documentation discipline

```text
citation != automatic correctness
human accepted != factually proven
retrieval relevance != epistemic support
model agreement != independent verification
file canonicality != world truth
local execution != zero cost
embedding similarity != sufficient context
```

Material states such as unsupported, disputed, interpretive, normative, stale, or contradicted must not be hidden only in a machine sidecar.

## Final response requirement

When reporting completion, list:

1. Code files changed.
2. Tests added/updated.
3. Documentation files added/updated.
4. Architecture decisions made.
5. Provider facts checked and their dates, when applicable.
6. Deferred risks and unresolved uncertainties.
7. Git/diff hygiene concerns.
8. Retrieval/execution traces or capability evaluations changed, when applicable.
9. Active coding path step and Work Ledger state updated.
