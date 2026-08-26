---
type: Atomik Coding Path History
title: 'CP-OPS-002 S07b — The rendered page — SUPERSEDED by S07c'
description: Completed-step record rolled out of CP-OPS-002.md at CP-OPS-002 S07g. Verbatim; nothing summarized.
tags: [coding-path, history, cp-ops-002]
timestamp: 2026-08-26T00:00:00Z
path: CP-OPS-002
step: S07b
---

# CP-OPS-002 S07b — The rendered page — SUPERSEDED by S07c

Rolled out of [CP-OPS-002.md](../CP-OPS-002.md) at CP-OPS-002 S07g, VERBATIM:
moved, never summarized. The live path file keeps its declaration, its index over
these records, its Work Ledger and its next action; the execution detail lives
here. The convention is in [paths.md](../paths.md#the-ledger-has-a-boundary).

Two mechanical adjustments were unavoidable and are named rather than made
silently. **Deixis**: text saying "below", "this ledger" or "the checkpoint" was
written when this entry sat in the path file and points at the Work Ledger in
[CP-OPS-002.md](../CP-OPS-002.md); repairing it in place would have made the
record no longer verbatim. **Link depth**: a relative link is an address, not
content — moving the file one directory down changes the address of the *same*
target, so `../sessions/…` became `../../sessions/…`. The characters differ; the
reference does not.

---

### S07b — The rendered page — **SUPERSEDED by S07c**

> Superseded with S07 above. Its page reused `index.html`'s design tokens, which the owner also
> rejected: *"Don't reuse de design system from precedent html file make one new clear and
> minimalistic moderne theme, that fit with dense content and multi support explanation
> (diagram, code blocks etc,..)"*. Reusing the house style was the safe choice and the wrong
> one — the earlier page is a short visual overview and this is a long reference document; the
> two have different jobs and should not share a layout.

The three documents are Markdown, which is what CI checks and what the repository keeps.
The owner shares this work outside the repository, so `docs/cairn/foundations.html` renders
the primer in the house style of `index.html` — same tokens, same light/dark handling, same
dated status banner naming what it renders and which file wins on disagreement.

- **The analogy gets a component, because it is the spine of the argument.** Every bridge
  is a two-column `.bridge` element — *in your world* → *in software* — so the translation
  is a visible structure rather than a sentence a skimming reader loses. Seven of them: the
  lab notebook, the parallel experimental arm, the positive control, preregistration,
  instrument QC, the figure you do not edit in Illustrator, exclusion criteria versus flags.
- **Failures get their own component too.** Four `.scar` blocks carry the CI that never ran
  on the branches its rules were about, the ceremony gate that proved the wrong
  proposition, the piped gate that shipped a broken build, and the 34 links that were not
  broken. They are visually distinct from the teaching because they are evidence, not
  illustration — and a primer of invented examples would have taught the same words and
  none of the fear.
- **The glossary appendix** carries the lexicon's plain-language column, thirty terms, with
  the blocking/advisory chips where they apply. The full lexicon with enforcing files stays
  in Markdown; the page says so rather than pretending to be complete.
- Structure validated by parser (no unclosed or mismatched tags); links resolve.
