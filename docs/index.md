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

OKF, [bedrock 26](bedrock/26_26-okf-agent-context.md): a meaningful folder carries
`index.md` (what is inside and why it matters) and `log.md` (recent meaningful
changes in that scope). **Every folder listed above now carries both** (CP-OPS-002
S05c); `log.md` at this level covers the plane as a whole. Each folder log was
seeded from that folder's real Git history, and is appended newest-first in the
work unit that makes the change.

**A shared log is one file per entry.** That is the only amendment the convention
has taken, and it was made for CONCURRENCY, not for size: when several paths append
to one log they collide, so `atomik-project/log.md` was frozen and the journal moved
to `atomik-project/log/YYYY-MM-DD-<path-id>.md`. Two paths writing two files never
conflict. Nothing was ever decided against folder logs, and a folder that needs one
gets it in that shape.

*(Correction, 2026-08-24: an earlier version of this paragraph declared "no
per-folder `log.md`" as a decision. No such decision was ever taken — the agent
wrote doctrine on its own authority, which `AGENTS.md` forbids. Retracted; the OKF
guideline above stands.)*

Rules: durable decisions live here or in `adr/`; provisional thinking lives in `../atomik-project/brainstorm/`; every core change updates its documentation in the same work unit (15, 17).
