---
type: Atomik Brief
title: Handoff — CP-UI-TYPOGRAPHY
timestamp: 2026-08-27T00:00:00Z
atomik:
  path: CP-UI-TYPOGRAPHY
  written_by: cp-ui-typography-writer
  branch: path/cp-ui-typography
  checkpoint: 2d77b128f45743f4118f4a6551aa2a2910380cae
  checkpoint_unit: 02
  checkpoint_pushed: true
  base_commit: df875e6
  trunk_seen: 39127e7
  writes:
    - apps/desktop/renderer/src/styles.css
    - apps/desktop/renderer/src/fonts/**
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
---

# Resume CP-UI-TYPOGRAPHY here

## Outcome

Give the app one proportional face, defined once instead of four times and the
same on every OS, without disturbing note metrics.

## State

S01 single-sourced the proportional face: `--note-text-font` sits in the
`--note-*` block beside `--note-code-font`, and `:root`, the live editor's
scroller, the live-preview limit notice and the inline AI widget all consume it.
That fixed a real drift risk — changing one site left the others behind, against
the invariant `.cm-content` states outright.

S02 replaced S01's design on the owner's ruling. S01 led the stack with a
Windows-only family name, which is an OS-specific decision in an app chosen for
OS universality, and which was invisible in `npm run dev` on WSL2 — so it could
not be reviewed on the machine that made it. Inter v4.1 now ships in
`renderer/src/fonts/` under the SIL OFL: roman and italic, full 100–900 weight
axis, `font-display: block`, both emitted by the bundler. Verified with CDP
`CSS.getPlatformFontsForNode`, which reports `Inter Variable` (custom) for
normal, bold and italic.

Gates: 1109 tests across 79 files, typecheck and build green, `cairn-check` OK
with one advisory (the coherence audit, which runs after the pre-merge rebase).

## Next action

None — closed. The candidate `a380f2a` is proposed for integration through a
pull request, because the trunk requires one. Nothing remains on this branch.

## Blockers

None. The merge itself waits on the trunk's pull-request rule, not on this path.

## Tried and rejected

- **A stack led by OS faces (S01's design).** Neither coherent strategy: not
  native-per-OS, not one-face-everywhere. It rendered differently per platform
  and could not be seen in the dev loop that produced it.
- **`'Segoe UI Variable Text'`.** A Windows-only family name — DirectWrite
  exposes optical-size instances as families, fontconfig sees one family
  `Segoe UI Variable` — so it could never match off Windows.
- **Mapping `/mnt/c/Windows/Fonts` into WSL fontconfig.** Patches the
  developer's machine to look like one target OS instead of fixing the design.
- **Changing `:root` alone.** Leaves the live editor on the old face and breaks
  *read <-> live never shifts the text*.
- **`font-family: inherit` at the duplicate sites.** Correct at `.cm-scroller`,
  wrong at `.cm-inline-ai-rendered`, whose parent IS the monospace scroller —
  that is bug S05f.
- **A new chrome token.** Would extend the vocabulary bedrock 36 enumerates,
  forcing `route: full`. The `--note-*` family is delegated by that page.
- **Bundling roman only.** Inter's variable roman carries no italics; markdown
  `em` would be synthesised oblique.
- **Four rendering properties.** Measured byte-identical in rendered pixels.
- **`letter-spacing` on `:root`.** The only measured metric change
  (555.063 → 552.141 px over 65 chars); re-wraps existing notes.

## Reading order

1. `docs/bedrock/36_36-ui-design-system.md@ce97f012` — the token contract, and
   the sentence delegating content typography to the `--note-*` family.
2. `atomik-project/sessions/2026-08-27-cp-ui-typography-opening-check.md` — the
   measurements, the two corrected claims, and the accepted scope.
3. `docs/modules/atomik-desktop-shell.md` — the four sites and why each needs an
   explicit declaration.

## Verification

`npm run cairn-check` reports OK with the three advisories above. `npm test`
passes 1109 across 79 files, `note-typography.test.ts` among them with 8.
`npm run typecheck` and `npm run build` pass. Note: this worktree needs a real
`apps/desktop/node_modules`; the main checkout's has an empty `vitest/`, which
presents as `TS2307` across every test file.
