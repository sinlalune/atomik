---
type: Atomik Session Record
title: CP-MVP-007 acceptance — S07 owner bench validated; machine sweep of the M1 intents and the four scoping decisions
timestamp: 2026-07-21T00:00:00Z
path: CP-MVP-007
ceremony: closing
---

# CP-MVP-007 acceptance (2026-07-21)

Owner, after the S07a–S07q bench waves: **"I validate bench."** This
record is the closing sweep — every §M1 intent and every owner
decision checked against what is actually in the tree, with the honest
gaps carried forward in writing.

## Machine sweep — 18 §M1 acceptance intents

- **Knowledge survives app restart** ✓ — vault files are the only
  store; workspace state is disposable (`workspace-state.ts`, 03).
- **Workspace state can be deleted without losing content** ✓ —
  standing invariant, re-exercised by the S07d/S07e migrations
  (pane-tree map, docs pane type) which DERIVE state rather than
  demand it.
- **Opening the app does not rewrite files** ✓ — open/list/read never
  write (vault.test.ts proves git-clean reads); the S07k conventions
  sync runs ONLY inside explicit management verbs; vault-root seeding
  happens only in the explicit open-vault dialog (adoptVaultRoot).
- **One edit creates one understandable diff** ✓ — relocate previews
  count every file they will touch (parent-index Contents links
  included, rung-asserted at totalLinks=2); apply is atomic with
  rollback; conventions bookkeeping rides the same operation.

## The four owner scoping decisions (2026-07-16, revised 07-21)

1. **Folder = option D → FULL conventions** ✓ — born with index.md +
   log.md; vault root seeds at explicit adoption; deterministic
   parent-index/log sync in the main verbs (S07k; addendum revision
   recorded; doctrine in 04 §Vault and folder conventions).
2. **Delete = OS trash** ✓ — TrashFn seam, failing trash surfaces,
   proven into ~/.local/share/Trash on this machine (S03, re-proven
   through the S07k rung).
3. **Rename = the 27 refactor behind a preview** ✓ — computeRelocate
   shared by preview/apply, targeted link rewrites, rollback; dirty
   editors block their own rename; owner-benched.
4. **Move + DnD included** ✓ — folder relocate prefix-wide, bundles
   move as units, DnD is an input binding over the SAME gated flow
   (S05/S06); owner-benched.

## The S07 bench trail (all owner-validated)

Fifteen bench-driven sub-steps landed and were validated cumulatively:
S07a note-follow flash · S07b project-tree refresh · S07c/d pane-chrome
typed trees · S07e typed choosers + Import page + direct URL import +
snapshot preview · S07e-e contract-file guard rescope · S07f caps-lock
root-caused OFF-APP (WSLg) · S07g centered note column · S07h/h-b @
note links + pill fixes · S07i–S07p the UI wave (connected/pill tabs
with flush shoulders, audit fix wave, bedrock-36 design system, four
organic themes, visible glass, icon-first with hover labels, centering
sweep) · S07k full conventions · S07j drag-at-paint-rate · S07q
theme-matched native window background. Final state: tests 435/43,
typecheck/build/smoke green, e2e rung vaultWrite=ok+folder+trash+
reloc+fmove on the S07k conventions.

## Honest gaps carried forward (recorded, not hidden)

- Move destination is TYPED, not a picker tree; no hover-expand during
  DnD — revisit on demand (S05/S06 deviations).
- Relocate preview is a confirmation list; the diff modal waits for
  bedrock 20's link index.
- Pane dividers are pointer-only (no keyboard resize) — 36 deviations
  register.
- A mid-session theme switch recolors the native window band at next
  launch (S07q known edge).
- Legacy pastel themes await an owner prune; TreeMenu is not yet
  registered with the web-overlay guard; the 36 consolidation feed
  (shared .pill/.btn/.input/.popover, NoteBar/InlineCreateForm/
  ConfirmDialog, editor-bar nav parity, full literal→token migration)
  stays in the CP-MVP-007 ledger for a later unit.
- WSLg limits (240 Hz, DWM corners/shadow, hardware glass) are
  environment facts, reserved for the packaged-build unit after
  CP-MVP-008 (register follow-up, owner sequencing decision).

## Close

CP-MVP-007 → done (2026-07-21). No active path until the
vision-alignment review closes (Q1–Q5) and the owner accepts
CP-MVP-008.
