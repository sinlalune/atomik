---
type: Atomik Brief
title: Handoff — CP-OPS-002 S04 complete, ready for S05
timestamp: 2026-08-24T00:00:00Z
atomik:
  path: CP-OPS-002
  branch: path/cp-ops-002
  completed_step: S04
---

# Resume CP-OPS-002 here

## Repository state

- Worktree `../4tom1k-cp-ops-002` (this checkout), branch `path/cp-ops-002`
  tracking `origin/path/cp-ops-002`. `node_modules` is symlinked from the main
  checkout.
- Registered at `base_commit: 7aa3b1d` by the trunk commit `df875e6` before this
  branch existed; `dd6e76a` is S00.
- Gates at S04: `npm run cairn-check` OK with one advisory — no coherence audit
  for this head, which is expected until the pre-merge audit. Validator suite
  `npm run cairn-check:test` 54/54.
- `typecheck` / `test` / `build` are not run for this step and their verdicts are
  not claimed: this path writes protocol tooling and doctrine only, and touched
  no product code.

## What the completed step changed

**S04 — the ledger has a boundary** (audit finding F4).

- **Convention** in `paths.md` § *The ledger has a boundary*: completed steps roll
  into `atomik-project/coding-paths/history/<id>-S0N.md`, one file per major step,
  sub-steps beside the step they belong to. The path file keeps its declaration, a
  one-line index per step, the ledger, the next action and blockers.
- **The move is verbatim** — cut and paste, never summarize. Summarizing at rollup
  time would quietly rewrite the record, which is the one thing a ledger may not do.
- **CP-MVP-008 migrated as the proof**: ~23.5 k tokens to ~4.7 k across seven step
  records. Verified line-for-line: the 1,621 non-empty lines of its Execution
  section are byte-identical to what `history/` now holds.
- **`ledger-size`** — advisory, diff-scoped, budget 10,000 tokens, on the reasoning
  that a path file should not cost more than the whole mandatory entry chain
  (~9.3 k). Corpus-scoped would nag about the same historical files on every run.
  Four tests, one pinning `approxTokens()` to the same words × 4/3 proxy the F4
  table used so findings and the audit record are comparable numbers.
- Round 3's C7 row (`ledger-size` "does not exist in code") corrected, and §2.3's
  rule table regenerated from the live source — it now carries 20 rows.
- Bedrock deliberately untouched: `AGENTS.md` puts operating detail in `paths.md`,
  which may change without amending a bedrock page.

**Only `CP-MVP-010.md` (~11.3 k) is over budget now**, and it is `done`. Nothing
forces it: the rule fires for whoever next edits that file.

## Next action

**S05 — backfill OKF** (closes F5). `index.md` for `docs/bedrock/`, `docs/adr/`,
`docs/modules/`, `atomik-project/sessions/` and `atomik-project/audits/` — bedrock
26 routes agents through the nearest index and the most-read directories have
none. Frontmatter for all 15 ADRs (16 now, counting ADR-016). Extend schema
validation beyond `coding-paths/`.

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
