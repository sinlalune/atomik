---
type: Atomik Brief
title: Handoff — CP-OPS-002 S07e complete, ready for S08
timestamp: 2026-08-25T00:00:00Z
atomik:
  path: CP-OPS-002
  branch: path/cp-ops-002
  completed_step: S07e
---

# Resume CP-OPS-002 here

## Repository state

- Worktree `../4tom1k-cp-ops-002` (this checkout), branch
  `path/cp-ops-002`, tracking `origin/path/cp-ops-002`.
- Registered at `base_commit: 7aa3b1d` by trunk commit `df875e6` before
  this branch existed.
- Latest completed step: **S07e**. Gates at the work-unit boundary:
  `npm run cairn-check` OK with one expected pre-merge advisory (no coherence
  audit for this head), `npm run cairn-check:test` **90/90**, canonical rule
  catalogue current, HTML structure parser-valid, and the self-contained/tree/
  context/rule/inline-script contracts test-pinned. `npm run typecheck` passed;
  the product suite passed **1,101** tests with **1 skipped** (1,102 total); and
  `npm run build` passed.
- The path file remains under its 10 k token boundary. Earlier S00–S06d records
  live verbatim under [`history/`](../coding-paths/history/index.md).

## What S07e changed

The owner rejected both surviving S07 readings and their shared visual system.
The fix is structural.

- **One canonical top-down source.** `docs/cairn/handbook.*` and
  `docs/cairn/anatomy.*` are deleted. The normative entry point is now
  [`docs/cairn/specification/index.md`](../../docs/cairn/specification/index.md):
  the full Cairn outcome and flow first, then project model, records, lifecycle,
  opening, execution, parallelism, closing, human records, enforcement,
  operations, guarantees, and the generated rule catalogue.
- **Foundations at the point of use.** Five linked notes teach Git, durable
  state, metadata, gates, and parallel work from zero. Six reference notes carry
  the canonical file tree, full path and ceremony/audit templates,
  `cairn.config.json`, copy-ready operations, and glossary. Requirements remain
  in the main file; the linked notes clarify without becoming another spec.
- **Canonical portable vocabulary.** The specification uses `project/`,
  `docs/architecture/`, `docs/adr/`, `docs/modules/`, `main`, `path/<id>`,
  `cairn:` and `cairn.config.json`. It contains no Atomik binding, local path id,
  origin story, dated incident, migration exception, or rule justified by a
  historical failure. It gives enough names, schemas, ownership, commands, and
  file layout to reconstruct the protocol.
- **Atomik project and universal reader.** Opening
  `docs/cairn/specification/` in Atomik gives `index.md` as the main surface and
  its `foundations/` / `reference/` tree as linked side material.
  [`specification.html`](../../docs/cairn/specification.html) packages that model
  into one offline file: dark atlas tree at left, paper specification in the
  centre, warm contextual lens at right. The entire design system and component
  grammar are new, with responsive drawers, keyboard and Escape handling,
  accessible names/focus, tree filtering, scroll progress, code copy, day/night,
  print, reduced-motion, and no-JavaScript modes.
- **Executable documentation.** `tools/cairn-rules.mjs` now writes into the
  canonical specification. `tools/cairn-spec.test.mjs` pins top-down order,
  portable naming, context/tree target completeness, HTML rule parity with the
  checker, self-containment, three panes, and JavaScript syntax.

## Where the path stands

Complete: **S00**, **S01**, **S04**, **S05/S05b/S05c**,
**S06/S06c/S06d**, **S07a**, and **S07e**. S07 through S07d are preserved as
superseded attempts in the path ledger. S03 was withdrawn by owner ruling.

Remaining: **S08**, **S09**.

## Next action

**S08 — make the canonical Cairn bindings executable.** The specification now
defines the portable surface; the checker still carries repository-specific
constants.

- `cairn.config.json` — project/knowledge/source roots, area map, metadata
  namespace, trunk name, staleness window, and
  `"enforcement": "local" | "ci" | "protected"`.
- `cairn-check` reads those bindings and prints the declared tier in its header,
  so observation versus prevention is generated from real configuration.
- `tools/cairn-new.mjs` — opening registration commit and worktree creation in
  one command, preserving the required order.
- A `cairn-init` seed plus ex-nihilo bootstrap prompt, scaffolding tiers 0 and 1
  only: validator, config, documentation skeleton, and workflow. No account or
  host configuration required.

## Blockers and decisions still open

- None. S08 implements the already-specified defaults; it does not need a new
  architecture ruling before work begins.

## Resume instruction for the agent

Resolve the path from this worktree's branch, verify the ledger against Git,
then execute `next action`. Do not ask the owner to restate the prior session.
