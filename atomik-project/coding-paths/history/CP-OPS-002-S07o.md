---
type: Atomik Coding Path History
title: 'CP-OPS-002 S07o — Owner review: the brief is a stone, not a hero'
timestamp: 2026-08-31T00:00:00Z
atomik:
  path: CP-OPS-002
  step: S07o
---

# CP-OPS-002 S07o

Rolled verbatim from the live ledger when `ledger-size` fired at S07t. The move
is cut-and-paste, never a summary: the record below reads exactly as it did in
`CP-OPS-002.md`.

### S07o — Owner review: the brief is a stone, not a hero — **COMPLETE**

```cairn-unit
step: S07o
unit: 11
type: documentation
verified: cairn-check, cairn-check:test, typecheck, test, build
```

Owner feedback on v0.2 ([record](../../briefs/2026-08-27-cairn-v0.2-owner-feedback.md)).
Two items are doctrine, six are editorial, four are the reader. The doctrine two are the
ones worth the space: both say the specification asserts the opposite of what it builds.

- **The answerable-alone contract contradicted the entry route.** It demanded a reader
  holding "only `AGENTS.md` and the brief — **no ledger**" answer eight questions. But
  `AGENTS.md` exists to point at the operating convention, which points at the live view,
  which names the path and its ledger — so the contract forbade the reader from doing the
  one thing the bootloader is for. The owner's framing is the fix: *a brief is a rock on
  the trail, not a do-it-all hero.* "Alone" now constrains **context, not file count** —
  no conversation, no prior session, no memory of how the path got here — and each answer
  MUST be in the brief **or in a record the brief names at an exact object id**.
- **The second-ledger sentence was inverted.** It named only the *thick* failure — a brief
  that reproduces the ledger becomes a second one — while the brief that is actually
  shipped is terse enough to need the ledger, which the sentence describes as the healthy
  state. Both failure modes are now stated, and the reason they are not symmetric: deciding
  *which part of the ledger's history is still the situation* is the brief's own job, so a
  brief that hands that judgement back has been **silent**, not terse. The section is
  `Two failure modes, not one`; a test pins both.
- **Why there is no `objective:` in the brief frontmatter** — the owner noticed the gap and
  read it, fairly, as evidence against the contract. Considered and rejected: the objective
  is prose, the frontmatter is machine-checkable state, and an objective maintained in two
  schemas eventually disagrees with itself while no predicate can adjudicate between two
  paragraphs. It is answered by `## Outcome` and argued in the path record. The
  specification now says this rather than leaving it to be inferred.
- **The pilot was measured under the old wording**, so it carries a note saying which of its
  numbers move. `resume_commit` (16/20) and `must_read` (15/20) test brief fields and do
  not move; `outcome` (10/20) becomes an upper bound and 35% "would act" a lower bound; the
  flat-by-path distribution that decides v0.3 is unaffected. The findings are not rewritten
  — a dated measurement that gets edited to match a later rule is not a measurement.
  ADR-019's own statement of the contract is corrected in place, marked as a correction.

Editorial, in the order the owner raised them:

- **`atomik-project/` → `project/`, fifty-six times.** The plane is named after the product
  Cairn was extracted from, and the specification carried that name through every example,
  template and command sequence. Every one now reads `project/`. Scope was the owner's call:
  documents only, not a `git mv` — the folder rename lands with S08's config loader, where
  the binding becomes selectable instead of documented-but-unimplemented. **Exactly one**
  place still names it, the installed binding table, which gained a column separating role
  from binding and a paragraph saying no adopter should inherit the prefix. A test asserts
  the count is two and that no other article mentions it.
- **`git rev-parse HEAD:docs/architecture/example.md` had no explanation.** The prose
  demanded a *blob* object id, then dropped an unusual command with no output, no account of
  the `<commit>:<path>` form, and no way to read the pinned version back. All three added.
- **`[route]` linked to the lightweight path**, collapsing the field into its default. Route
  is now its own concept — the four routes, the five `full` triggers, the ledger backstop,
  one-way escalation — and every `[route]` link points at the field.
- **`refs/cairn/checkpoints/` was described but never located.** It is now in the reference
  tree under `.git/refs/`, in the role table, and has a paragraph on why no directory
  listing will ever show it and which three commands do.
- **`sources/`, `projects/` and the frozen `log.md` left the tree.** The first two are vault
  fixtures from the repository's first use as an Atomik vault; the third predates the
  one-file-per-entry journal. None is Cairn structure, and the tree claims to be exhaustive
  for what Cairn defines.

The reader, per the owner's four points:

- **Active state was a coloured rule line** on the pane top edge and the tree item's left
  edge — a second layer of line over a layout whose separators are already minimal. Both
  are gone; current state is a subtle fill.
- **Pane A / Pane B labels removed**, along with the active-pane model they belonged to.
- **The specification is now fixed in the left pane** and every link and tree entry opens on
  the right. That deletes the select-a-pane-then-click step the owner reported as not
  working, and stops a right-pane link from evicting the specification. The left pane keeps
  no history because it never navigates; the right pane keeps all of it. Deep links moved
  from `#read=a|b` to `#article-<id>`, with the old form still accepted.
- **Modern, not old.** Body text is a contemporary sans with a serif display title — the
  serif-everywhere stack fell back to something dated on any machine without it, which is
  the opposite of what a research aesthetic should do. Rounded corners on the search field,
  code blocks, tables, quotes, buttons and badges. Still flat: no shadows, no gradients, and
  glass confined to the two chrome surfaces that already had it.
- **The edition label was lying.** It read `v0.1` in the masthead and the meta description
  while the specification had been v0.2 since S07g. It is now read from the specification's
  own frontmatter and the build throws if that frontmatter declares no version.

Checker suite 188, specification suite 30 (four new: the contract, the blob explanation,
the route concept, the fixed-pane reader; two rewritten). Nothing outside the feedback was
changed.
