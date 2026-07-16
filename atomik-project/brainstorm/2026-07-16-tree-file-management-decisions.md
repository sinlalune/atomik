---
type: Atomik Brainstorm Note
title: Tree file management — the four 2026-07-16 owner decisions (addendum to 2026-07-06 creation flows & DnD)
timestamp: 2026-07-16T00:00:00Z
---

# Tree file management — owner decisions, 2026-07-16

Addendum to [2026-07-06-creation-flows-and-dnd.md](./2026-07-06-creation-flows-and-dnd.md),
written as a sibling note because the original carries live owner
edits at the time of writing. Decision authority: these choices are
RECORDED in the accepted path `../coding-paths/CP-MVP-007.md` — this
note only preserves the reasoning trail (17). Nothing here is
provisional anymore; the deviations are deliberate.

## The four decisions (owner, dogfooding session 2026-07-16)

1. **New folder = option D** — a folder is born WITH `index.md`
   (the project convention generalized to plain folders).
   DEVIATION from the 06-07 leaning (B, pending-UI folder). What
   changed: three more days of daily use — the owner now wants the
   map file, not a ghost entry. Dividend the 06-07 note missed:
   D keeps `listVaultFiles`' prune-empty-folders invariant intact
   (a D-folder is never empty), where B needed disposable UI state
   and C broke pruning.
2. **Delete = OS trash** (`shell.trashItem`) after a confirm that
   names the target. Hard `rmSync` stays reserved for derived files
   (the existing pattern). No in-app trash to maintain; the OS one
   is already understood.
3. **Rename = the sanctioned refactor** (27 §rename refactor diffs,
   20 §rename and link integrity): inbound links updated in the same
   atomic operation, behind a PREVIEW of every file to be touched.
   Never silent, never mixed with content edits.
4. **Move + drag-and-drop INCLUDED** — DEVIATION from the 06-07
   fence ("deliberately post-MVP"). Why it holds now: decision 3
   builds the exact machinery the fence was waiting for; move is the
   same refactor verb with a directory change, and DnD is an input
   binding over the proven flow. Sequencing carries the caution:
   machinery (S04) → menu move (S05) → DnD (S06), never the reverse.

## Bundle-guard inventory (pinned at CP-MVP-007 S01)

- **Bundle root marker: a folder that directly contains `source.md`.**
  Location-independent — capture bundles land at user-chosen paths
  (`importCaptureUpload` takes any validated folder), pdf/web bundles
  under `sources/pdf|web/<slug>/`. The rule must key on the marker,
  not on a path prefix.
- Inside a bundle root: individual rename/move DISABLED (dossier ↔
  derived ↔ evidence relative links and frontmatter pointers are
  bundle-internal contracts: `resource:`, `atomik.source`, media/
  refs). Delete of individual derived files stays with the existing
  in-view verbs (Delete reader…/extraction/transcription — they
  restore dossier state, which a tree delete would not).
- The bundle root itself renames/moves AS A UNIT through the refactor
  verb (inbound links from notes point at `<root>/source.md`,
  `<root>/original.*#page=N`, `<root>/reader.md` — the scan must
  treat a folder move as a prefix rewrite of all inbound targets).
- Bundle root DELETE = trash the whole folder (evidence + derived
  together) behind the strengthened warning; never partial.
- Convention files (`index.md`, `log.md` — the pill pair) rename-
  guarded in any folder: renaming them silently breaks the pill
  routing and (for projects) `listProjects` adoption.
- `projects/<slug>/` roots: rename/move allowed as units (they are
  ordinary folders + conventions); the project manifest scan adopts
  by structure, not by registry, so a renamed project is re-adopted
  on next scan — verify in S04 tests.
