# Log — Atomik knowledge and execution plane

## 2026-07-05

- Plane created by v0.6 (ADR-009). Coding path CP-MVP-001 opened as the active path; execution rules (time-to-M2, thinness rule, mechanical labeling, experiential gate) promoted from the 2026-07-05 design conversation into the corpus.

## 2026-07-06

- CP-MVP-001 S01 executed (bootstrap per 22). Reconciliation result: dual-plane tree matches the ADR-009/35 layout; all 100 payload files verify against the upload guide's sha256 manifest; no nested Git repositories; `git init` + seed commit already done per the guide. Seed commit `4675233` (branch `master`) recorded as `base_commit` in the path frontmatter and Work Ledger. Observation, not a defect: the seeded `.gitignore` ignores all of `.atomik/`, stricter than 27's itemized default that leaves `.atomik/workspace.json` committable for shared layouts — revisit when S04 introduces workspace state. Next action: S02.
- CP-MVP-001 S02 executed. Code plane activated: root npm-workspaces manifest + `apps/desktop` (electron-main / electron-preload / renderer per 14, wired with electron-vite; CJS deliberately, sandboxed preload). Security contract of 13 pinned in code (`SECURE_WEB_PREFERENCES`) and enforced by tests; one narrow typed bridge method (`atomik:get-app-info`) declared in `shared/ipc-contract.ts`; 13 §IPC trigger honored. Verified end to end: typecheck clean, 9 tests / 3 suites green, build clean, real launch on WSLg prints `ATOMIK_SMOKE_OK` exit 0. Dependency alignment recorded in the module note (electron-vite 5 pairs with vite 7; plugin-react ^5 / vitest ^3 until vite 8 pairing). First module note: `docs/modules/atomik-desktop.md`. Next action: S03 (read 16 first).
