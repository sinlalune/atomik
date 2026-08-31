---
type: Atomik Coherence Audit
title: Coherence audit — CP-UI-TYPOGRAPHY @ a380f2a
timestamp: 2026-08-31T09:32:38.489Z
atomik:
  path: CP-UI-TYPOGRAPHY
  branch: path/cp-ui-typography
  head: a380f2ad1d03f3f5c3fe6629875f8dc55c704018
  base: df875e6
  verdict: drift noted, proceeding
---

# Coherence audit — CP-UI-TYPOGRAPHY @ a380f2a

Run after the rebase, before the merge. ADVISORY: nothing here blocks. Its job
is to catch what no deterministic check can — two paths that each pass every
rule and still pull the architecture in different directions.

## What to read

- the rebased diff for this branch
- every bedrock page and ADR named in this path's documentation coverage
- the module area notes the diff touches
- any OTHER path currently `running` that declares an overlapping surface

## Findings

### Does the diff contradict an accepted decision?

**No, and one was deliberately avoided.**
`docs/bedrock/36_36-ui-design-system.md` enumerates the chrome token vocabulary
and then delegates content typography to the `--note-*` family without
enumerating it. `--note-text-font` is added to that delegated family, so bedrock
36 needs no amendment. A *chrome* token would have contradicted it — the page
would then list a vocabulary that is missing an entry — and was rejected for
that reason at S01.

The path DID contradict an accepted decision at S01 and was corrected at S02:
choosing Electron is a decision about OS universality, and a stack led by a
Windows-only family name is at odds with it. The correction is the candidate.

### Does it duplicate something another running path is building?

**No.** `CP-MVP-011` is the only other running path declaring
`apps/desktop/renderer/src/styles.css`. Checked at its head `777e3f8`: it
contains no `@font-face` and no `--note-text-font`; its surface is chat and
citation styling. The overlap is file-level, not region-level. Whichever
integrates second rebases; the conflict surface is the `--note-*` block and four
`font-family` lines, none of which CP-MVP-011 touches.

`CP-OPS-002` declares no `apps/` surface at all.

### Did it introduce architecture that belongs in an ADR and has none?

**Arguably yes, and this is the finding worth arguing about.**

"The application ships its own typeface rather than adopting the host OS's UI
font" is a durable, cross-cutting choice with costs (~740 KB, an OFL obligation)
and a rationale (universality, and a dev loop that can observe its own output).
That is ADR-shaped. It is recorded only in this path's ledger, the closing
ceremony, and `docs/modules/atomik-desktop-shell.md`.

Not blocking, and not written here, because an ADR is a decision record and the
decision was the owner's, made in conversation, on one exchange. Proposing one
retroactively from a module note is how decision records lose their meaning. The
honest disposition: **if a second surface ever asks the OS for a face, that is
the moment this needs an ADR**, and the module note now carries the argument in
full so writing one is transcription rather than reconstruction.

### Is anything now documented in two places that will drift apart?

**One instance, bounded and deliberate.** The measurement record — the four inert
rendering properties, the letter-spacing figures, the DejaVu resolution — appears
in both `atomik-project/sessions/2026-08-27-cp-ui-typography-opening-check.md`
and `docs/modules/atomik-desktop-shell.md`.

That is not drift-prone: the session note is an immutable event record of what
was measured on 2026-08-27, and the module note is the maintained contract. They
are allowed to diverge, because one is history and the other is current. The
module note is the one to trust.

The four `font-family` declarations that motivated this path were the real
two-places problem, and the candidate removes them: one definition, four
consumers, with a test that fails on a fifth.

## Verdict

**drift noted, proceeding.**

The drift is the missing ADR for "bundle the typeface", recorded above with its
trigger condition rather than deferred silently. Nothing else in the diff pulls
against an accepted decision, duplicates another running path, or creates a
record that will rot.

Two caveats belong in the merge decision and not in this verdict, because they
are not coherence questions: no visual regression pass was run over the running
app, and the owner accepted before seeing the face in `npm run dev` — the first
attempt to look was made in the wrong worktree.

*(clean · drift noted, proceeding · needs a conversation before merge)*
