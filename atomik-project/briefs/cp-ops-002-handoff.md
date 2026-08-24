---
type: Atomik Brief
title: Handoff — CP-OPS-002 S05b complete, ready for S06
timestamp: 2026-08-24T00:00:00Z
atomik:
  path: CP-OPS-002
  branch: path/cp-ops-002
  completed_step: S05b
---

# Resume CP-OPS-002 here

## Repository state

- Worktree `../4tom1k-cp-ops-002` (this checkout), branch `path/cp-ops-002`
  tracking `origin/path/cp-ops-002`. `node_modules` is symlinked from the main
  checkout.
- Registered at `base_commit: 7aa3b1d` by the trunk commit `df875e6` before this
  branch existed; `dd6e76a` is S00.
- Gates at S05b: `npm run cairn-check` OK with one advisory — no coherence audit
  for this head, expected until the pre-merge audit. Validator suite
  `npm run cairn-check:test` 65/65.
- `typecheck` / `test` / `build` are not run for this step and their verdicts are
  not claimed: this path writes protocol tooling and doctrine only, and touched
  no product code.

## What the completed step changed

**S05** closed audit finding F5: five indexes (`docs/bedrock`, `docs/adr`,
`docs/modules`, `atomik-project/sessions`, `atomik-project/audits`), frontmatter on
all 16 ADRs, and `adrFrontmatterErrors()` — blocking, corpus-scoped, requiring the
frontmatter status to agree with the document's own `Status:` line.

**S05b** answered three owner questions from that report:

- **The opening check is BLOCKING now.** F2 repaired the closing gate and left its
  twin a convention, so a path could be registered, branched and worked with no
  recorded acceptance at all. `openingFromSessions()` mirrors the closing gate,
  scoped to a path file in the diff declaring `running`; eleven opening notes were
  backfilled with `path:` + `ceremony: opening`. Seven tests.
- **`LEGACY_UNDECLARED_OPENINGS`** — CP-MVP-011 and CP-MVP-012 only. Both have a
  real opening note that predates the schema, on branches this checkout must not
  write. Advisory, with the two keys they need in the message; the set drains when
  they merge. **If either path rebases onto this trunk before adding those keys, it
  sees an advisory, never a failed build.**
- **Five more indexes** (`docs/cairn`, `research`, `contracts`, `fixtures`,
  `agents`). On folder logs, both plane indexes now state the OKF guideline
  (bedrock 26: a meaningful folder carries `index.md` and `log.md`) and the one
  amendment it has taken here — a SHARED log is one file per entry, made for
  concurrency, not size. **Retracted the same day**: the first version declared
  "no per-folder `log.md`" as a decision. Nobody took that decision; the agent
  wrote doctrine on its own authority. Both files carry a dated correction line.

## Next action

**S06 — retire the drifted page** (closes F6). `docs/cairn/index.html` still teaches
the rejected integrator model at ten sites. Rewrite it against ADR-012, or replace
it with a generated view of the specification, and give both HTML pages a dated
status banner naming the ADR they render — the page drifted silently because
nothing on it claimed a vintage. `workflow.html` is clean and byte-identical to
master; it needs the banner, not a rewrite.

## Blockers and decisions still open

- None. Nothing in this path waits on host configuration any more: **owner ruling
  9 (2026-08-24)** rescoped S06b from "configure branch protection" to "declare
  the enforcement tier"
  ([note](../sessions/2026-08-24-cp-ops-002-s06b-rescope.md)). Its deliverables
  live in S07 (three-tier prose, optional `gh api` ruleset payload) and S08
  (`enforcement` field in `cairn.config.json`, generated `cairn-check` header
  line, tier-0/1 `cairn-init`). This repository is tier 1, declared.
- **S07a** must land `ADR-017` before the specification (S07) can describe the
  lifecycle: round 3's D2 §2.2 still declares `done` terminal, contradicting
  bedrock 35, and is to be marked *proposed* until the ADR settles it.

## Resume instruction for the agent

Resolve the path from this worktree's branch, verify the ledger against Git,
then execute `next action`. Do not ask the owner to restate the prior session.
