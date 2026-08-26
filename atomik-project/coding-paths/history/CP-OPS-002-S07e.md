---
type: Atomik Coding Path History
title: 'CP-OPS-002 S07e — Canonical top-down specification project and universal reader (owner correction) — COMPLETE'
description: Completed-step record rolled out of CP-OPS-002.md at CP-OPS-002 S07g. Verbatim; nothing summarized.
tags: [coding-path, history, cp-ops-002]
timestamp: 2026-08-26T00:00:00Z
path: CP-OPS-002
step: S07e
---

# CP-OPS-002 S07e — Canonical top-down specification project and universal reader (owner correction) — COMPLETE

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

### S07e — Canonical top-down specification project and universal reader *(owner correction)* — **COMPLETE**

> **Owner correction, 2026-08-25.** *"First of all, You use in both version the same
> theme and design system since I told you to build a new one that fit more pedagogical
> content. Then you produce an inversed specification of Cairn, talking about its
> foundation and superficially linking it to Cairn… Make a specification of Cairn where
> prior foundation concept manipulated are explained at the right time and for new
> comers… The structure should be top down, with an emphasis of sharing the big picture
> for then detailing the implementation. This is a canonical document, don't refer to
> any past project or issues that resulted in new rules."*

The correction changes the information architecture, source shape, and visual system — not
just the order of existing sections.

- **One canonical specification replaces two competing readings.** `handbook.md/html` and
  `anatomy.md/html` are deleted. The first made readers assemble Cairn from general concepts;
  the second inverted it into primitives and only then surfaced the protocol. Both answered a
  different question from the one asked. The replacement is
  `docs/cairn/specification/index.md`: Cairn's outcome, complete flow and three roles first;
  project model, records, lifecycle and each phase next; enforcement, operations, guarantees
  and rule catalogue last.
- **Foundations arrive at first use, without becoming a second specification.** Five notes
  under `specification/foundations/` explain Git, durable state, metadata, quality gates and
  parallel work from zero. Six notes under `specification/reference/` carry the canonical
  layout, copy-ready path and human-record templates, configuration, operations and glossary.
  The main file explicitly owns every normative statement; linked notes clarify it and add no
  rules. In Atomik, opening `docs/cairn/specification/` gives the requested project tree and
  lets those links open beside `index.md`.
- **Canonical, reconstructible names.** The specification uses the portable defaults
  `project/`, `docs/architecture/`, `docs/adr/`, `docs/modules/`, `main`, `path/<id>`,
  `cairn:` and `cairn.config.json`, then provides the whole repository tree, filename
  conventions, ownership table, record schemas and commands. Its normative prose contains no
  Atomik binding, path id from this repository, origin story, dated incident, legacy path, or
  justification by past failure. Each rule is stated as what Cairn is and why its structure
  follows.
- **One universal HTML file, with a genuinely new pedagogical system.**
  `docs/cairn/specification.html` is a self-contained three-pane “study desk”: a dark atlas/tree
  at left, an opaque paper reading surface in the centre, and a warm contextual lens that opens
  explanations or copy-ready references at right. It is not the old sans/one-accent handbook
  recoloured: it has a new serif/sans/mono hierarchy, three surface identities, chapter blocks,
  phase maps, rule/why/limit cards, embedded diagrams, scroll progress, tree filtering, contextual
  drawers, code-copy controls, day/night themes and a print edition. Responsive drawers,
  keyboard/Escape handling, named controls, focus treatment, reduced-motion handling and a
  no-JavaScript sequential library make the interaction portable as well as the file.
- **The documentation stays executable.** `SPEC_FILE` now points to the canonical
  `specification/index.md`; its catalogue remains generated from the checker. A new specification
  test pins the top-down heading order, portable vocabulary, every context-link target, every
  tree target, exact equality between implemented and rendered HTML rule names, the three-pane
  self-contained contract, and inline JavaScript syntax. Validator suite 83 → 90.
