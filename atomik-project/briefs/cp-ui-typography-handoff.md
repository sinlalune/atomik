---
type: Atomik Brief
title: Handoff — CP-UI-TYPOGRAPHY
timestamp: 2026-08-27T00:00:00Z
atomik:
  path: CP-UI-TYPOGRAPHY
  written_by: cp-ui-typography-writer
  branch: path/cp-ui-typography
  checkpoint: 39127e79fb233c799cf7a78a4741d32345e62f47
  checkpoint_unit: 00
  checkpoint_pushed: true
  base_commit: df875e6
  trunk_seen: 39127e7
  writes:
    - apps/desktop/renderer/src/styles.css
    - apps/desktop/tests/note-typography.test.ts
    - docs/modules/atomik-desktop.md
    - docs/modules/atomik-desktop-shell.md
    - atomik-project/coding-paths/CP-UI-TYPOGRAPHY.md
    - atomik-project/briefs/cp-ui-typography-handoff.md
  governs:
    - docs/bedrock/36_36-ui-design-system.md@ce97f012630db0c45bda7a62b40b6019e3670b33
  verify:
    - npm run cairn-check
    - npm test
  budget_tokens: 1200
---

# Resume CP-UI-TYPOGRAPHY here

## Outcome

Give the app the Cairn reader's proportional face, defined once instead of four
times, without disturbing note metrics.

## State

S01 is complete and is the path's only planned step. `--note-text-font` sits in
the `--note-*` block beside `--note-code-font`; `:root`, the live editor's
scroller, the live-preview limit notice and the inline AI widget all consume it,
and no literal of the old stack survives. `note-typography.test.ts` pins the
token, the stack order, the four consumers, the absence of a fifth copy, and the
absence of `letter-spacing` on `:root`.

`checkpoint` names the rebased trunk tip because this is unit 01 and no earlier
checkpoint exists to name; the commit carrying this brief becomes checkpoint 01
once its retention ref is written.

Gates: 1107 tests across 79 files, typecheck and build green, `cairn-check` OK
with three advisories (audit not yet run, upstream not yet set, and the shared
root module note, explained in the ledger).

## Next action

Closing ceremony — owner acceptance recorded as a session note with root-level
`path:` and `ceremony: closing`. Then `npm run cairn-audit`, rebase on the trunk
tip, and self-merge.

## Blockers

None. Closing acceptance is an owner decision, not a technical block.

## Tried and rejected

- **Changing `:root` alone.** Leaves `.editor-host.live .cm-scroller` on the old
  face and breaks the invariant the stylesheet states at `.cm-content`: read
  <-> live never shifts the text.
- **`font-family: inherit` at the duplicate sites.** Correct at `.cm-scroller`,
  wrong at `.cm-inline-ai-rendered`, whose parent IS the monospace scroller —
  that is bug S05f, bold and italic vanishing under WSLg.
- **A new chrome token.** Would extend the vocabulary bedrock 36 enumerates,
  making this an architecture change and forcing `route: full`. The `--note-*`
  family is delegated by that page and needs no amendment.
- **The four rendering properties.** Measured byte-identical in rendered pixels:
  macOS-only smoothing, a property already at its initial value, and one
  Chromium already applies.
- **`letter-spacing: -0.003em` on `:root`.** The only measured metric change
  (555.063 → 552.141 px over 65 chars); re-wraps existing notes and crosses the
  chrome/content line bedrock 36 draws.

## Reading order

1. `docs/bedrock/36_36-ui-design-system.md@ce97f012` — the token contract, and
   the sentence delegating content typography to the `--note-*` family.
2. `atomik-project/sessions/2026-08-27-cp-ui-typography-opening-check.md` — the
   measurements, the two corrected claims, and the accepted scope.
3. `docs/modules/atomik-desktop-shell.md` — the four sites and why each needs an
   explicit declaration.

## Verification

`npm run cairn-check` reports OK with the three advisories above. `npm test`
passes 1107 across 79 files, `note-typography.test.ts` among them with 6.
`npm run typecheck` and `npm run build` pass. Note: this worktree needs a real
`apps/desktop/node_modules`; the main checkout's has an empty `vitest/`, which
presents as `TS2307` across every test file.
