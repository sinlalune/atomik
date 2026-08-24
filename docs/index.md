# Atomik documentation

Progressive-disclosure map of the docs plane. The constitution lives in `bedrock/`; start at [00 — orientation](bedrock/00_00-orientation.md), or open [index.html](index.html) for the offline Dev Docs viewer.

- `bedrock/` — pages 00–36, the durable architecture; start at [bedrock/index.md](bedrock/index.md); `bedrock/archive/` holds superseded drafts
- `adr/` — accepted decision records, indexed at [adr/index.md](adr/index.md); numbers are stable and may be reserved by parallel paths
- `modules/` — module notes (contracts) per area, indexed at [modules/index.md](modules/index.md), populated during implementation
- `research/` — dated external evidence and investigation records; volatile facts carry a checked-at date and recheck triggers
- `cairn/` — the working protocol explained for people outside this repo: what the files are, who owns which, and how parallel paths merge (`ADR-012`, `atomik-project/coding-paths/paths.md`)
- `learning/` — beginner-first layer: technologies, concepts, and methodology taught from zero so the owner can take over any brick
- `agents/` — agent documentation contract; first prompt for chat-based sessions
- `contracts/` — machine-readable contract mirrors (JSON)
- `fixtures/` — reference instances and future test data (their internal links are illustrative by design)
- `diagrams/` — figure register and self-contained SVGs projecting the corpus
- `CHANGELOG_v0_4 / v0_5 / v0_6` — release records
- `docs_source.json` · `index.html` — generated Dev Docs artifacts

Every meaningful folder here carries an `index.md`; **none carries a per-folder
`log.md`, and that is a decision, not an omission** (2026-08-24, CP-OPS-002 S05b).
Bedrock 26 offers both conventions — a map and a recency feed. The map is stable
and single-writer, so it is worth having everywhere. A per-folder log is neither:
it is append-only and every path touching that folder would append to the same
file, which is exactly the collision that got `atomik-project/log.md` frozen and
replaced by one file per entry. Recency is already answered twice — by Git history
and by the per-path journal — so a third answer could only drift from the other
two. `docs/log.md` predates this and is retained as an archive.

Rules: durable decisions live here or in `adr/`; provisional thinking lives in `../atomik-project/brainstorm/`; every core change updates its documentation in the same work unit (15, 17).
