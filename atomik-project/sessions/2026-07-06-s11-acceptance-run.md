---
type: Atomik Session Note
title: S11 acceptance run — M0–M2 checklist results
description: Durable record of the CP-MVP-001 S11 acceptance execution, with per-line status and evidence pointers.
tags: [session, acceptance, m0, m1, m2, cp-mvp-001]
timestamp: 2026-07-06T00:00:00Z
---

# S11 acceptance run — M0–M2 (roadmap 18)

Executed 2026-07-06 on a fresh Git-tracked scratch vault + fresh state
dir. Evidence: vitest suites (98 tests / 16 files, all green), smoke
markers from the packaged app, and direct disk/git inspection. Statuses:
PASS · STRUCTURAL (holds by architecture, no runtime surface yet) ·
DEFERRED (explicit, with reason and re-entry point — never silent).

## M0 — Electron shell

| acceptance | status | evidence |
|---|---|---|
| app starts | PASS | every smoke: `ATOMIK_SMOKE_OK`, exit 0 |
| Dev Docs opens the current bedrock bundle | PASS | `devdocs=9groups/79files`; screenshots since S03 |
| remote content has no Node access | STRUCTURAL | no remote views exist until M5; required webPreferences pinned and asserted EXACTLY (`security-contract.test.ts`); re-verify at the first WebContentsView |
| preload exposes only documented typed methods | PASS | `preload-surface.test.ts` — 17 methods, drift fails the suite |
| local/cloud policy enforceable below renderer | STRUCTURAL | the only execution path (mock) runs in main; no cloud path exists; ExecutionPolicy/budget objects are the M7 provider's entry criterion |

## M1 — vault + project bundle

| acceptance | status | evidence |
|---|---|---|
| knowledge survives app restart | PASS | files on disk; restore smokes (S04/S05) |
| workspace state deletable without losing content | PASS | this run: FULL state-dir wipe (layout+settings+traces) → relaunch clean, vault git-clean, notes intact |
| opening the app does not rewrite files | PASS | `git status` = 0 after open+render+search+AI (also dedicated S05 run) |
| one edit = one understandable diff | PASS | S05 `cmp` byte-exact + 1-file diff; S07 editor save; S08 accept→save |

## M2 — AI loop + minimal truth/execution contracts

| acceptance | status | evidence |
|---|---|---|
| selected passage → source-linked note | PASS | new-note patch embeds source path + exact quote (S08 e2e on disk) |
| uncited factual detail marked needs-citation/model-only | PASS | labels e2e `labels=source-backed,model-only,needs-citation,interpretive`; `truth.test.ts` |
| interpretation labeled without blocking prose | PASS | interpretive chip; prose renders fully |
| accepted patch = one meaningful diff | PASS | accept saves through writeNote (mtime handshake); git diff verified |
| local/cloud/tool path + usage inspectable | PASS | panel badge + ledger line inspected (S09) |
| hard budget + cancellation enforced below renderer | DEFERRED | meaningless for a synchronous zero-cost deterministic mock; the enforcement seat IS main-side (only place providers run); explicit entry criterion for the M7 provider path |
| source-backed reproducible by deterministic check | PASS | `truth.test.ts` reproducibility + adversarial smuggling case |

## S11-specific

| requirement | status | evidence |
|---|---|---|
| filename/heading/full-text search, no embeddings | PASS | `search.test.ts` (kinds, lines, case-insensitivity, caps, denylist) + e2e marker `search=1files/filename+heading` |
| cache deletion destroys nothing | PASS | this run: `rm -rf` of the whole state dir between two launches |

## Definition-of-done cross-check (path header)

- Thinness rule: M2 steps (S08–S10) each landed as single-session units,
  same order of magnitude as M1's (S05–S07). Held.
- Minimal trace = one JSON line + one badge: held (33 trigger never fired).
- Mechanical labeling rule: held (28 trigger never fired; adversarial-tested).
- **Experiential gate (S12): OPEN — the path does not close on this run.**
  Two consecutive weeks of daily use by the creator, frictions recorded as
  project files, priorities patched back. Agent's role during the gate:
  fix frictions, keep the ledger, never widen scope.
