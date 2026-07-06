# Atomik documentation

Progressive-disclosure map of the docs plane. The constitution lives in `bedrock/`; start at [00 — orientation](bedrock/00_00-orientation.md), or open [index.html](index.html) for the offline Dev Docs viewer.

- `bedrock/` — pages 00–35, the durable architecture; `bedrock/archive/` holds superseded drafts
- `adr/` — accepted decisions (ADR-001…009)
- `modules/` — module learning notes (contracts), populated during implementation
- `learning/` — beginner-first layer: technologies, concepts, and methodology taught from zero so the owner can take over any brick
- `agents/` — agent documentation contract; first prompt for chat-based sessions
- `contracts/` — machine-readable contract mirrors (JSON)
- `fixtures/` — reference instances and future test data (their internal links are illustrative by design)
- `diagrams/` — figure register and self-contained SVGs projecting the corpus
- `CHANGELOG_v0_4 / v0_5 / v0_6` — release records
- `docs_source.json` · `index.html` — generated Dev Docs artifacts

Rules: durable decisions live here or in `adr/`; provisional thinking lives in `../atomik-project/brainstorm/`; every core change updates its documentation in the same work unit (15, 17).
