---
type: Atomik Folder Log
title: Log — docs/cairn
description: Recent meaningful changes to the Cairn protocol as explained outside this repository, per the OKF folder convention.
tags: [log, okf, cairn]
timestamp: 2026-08-24T00:00:00Z
---

# Log — `docs/cairn`

Recent meaningful changes in this scope: the Cairn protocol as explained outside this repository. The companion map is
[index.md](./index.md). An agent reads the index before opening many files, and
this log when recency matters or when re-entering after time away
([bedrock 26](../../docs/bedrock/26_26-okf-agent-context.md)).

Seeded 2026-08-24 (CP-OPS-002 S05c) from Git history: the 9 most recent of 9 commits that touched this folder, newest first, merges omitted because a merge names the path rather than the change.

**Append newest-first, at the top, in the same work unit as the change.** Git
remains the complete record; this is the readable one. If two paths ever start
colliding on this file, it takes the amendment the journal already took — one file
per entry in a `log/` subfolder — which was a concurrency fix, never a size one.

## 2026-09-01

- `CP-OPS-002 S08o` applies ADR-020's artefact boundary. The session procedure
  moves into the portable reference, the path convention becomes lightweight
  required reading, and Atomik's installed names and examples leave the
  specification for one binding appendix.
- `CP-OPS-002 S08n` makes a born-sliced step's adding blob the stable
  `record-integrity` baseline. Exact suffix appends pass locally and in CI;
  earlier-byte rewrites block, and the specification still labels flat-ledger
  plus verbatim-roll proof partial.

## 2026-08-25

- `S07e` **Canonical top-down rewrite on owner correction.** The competing
  `handbook.*` and `anatomy.*` pairs are removed. They shared one design system
  despite needing a new pedagogical one, and both organised the reader around
  foundations before Cairn was fully visible. Their replacement is one
  specification project under `specification/`: a normative `index.md` that
  gives the complete protocol first, five linked newcomer foundations opened at
  the point of need, and six copy-ready implementation references. The source
  uses generic canonical names (`project/`, `docs/architecture/`, `main`,
  `cairn:`) and contains no origin story, incident, migration, or repository-
  specific exception. `specification.html` packages the same hierarchy into a
  self-contained three-pane study desk: dark project tree, paper reading surface,
  and a warm contextual lens that opens on the right. The theme, component
  grammar, typography, information architecture, and interaction model are new;
  the page is responsive, keyboard-operable, theme-aware, printable, and has a
  no-JavaScript sequential fallback.

- `S07d` Two owner corrections. **The bindings**: the handbook was writing
  `atomik-project/` into the protocol's prose, so a document about portability was teaching this
  repository's name as if it were Cairn. It now writes `project/`, with a Notation section
  saying the protocol talks about roles and each repository binds them; links, the generated
  catalogue and the declared-properties section keep the real name and say why. The frontmatter
  namespace key stays `atomik:` because the parser reads it hardcoded — publishing `cairn:`
  would be a published rule the implementation does not honour. **The inverse document**:
  `anatomy.md` + `anatomy.html` read the same material downward, organised **by primitive
  rather than by feature**. Seven primitives and nothing else; every construct reduced to its
  exact predicate with a `cannot` line; every human judgement reduced to a file; a section on
  the eight primitives Cairn refuses; and two tables the upward reading cannot produce — all
  eighteen rules on one screen, and the seven names a port has to cut.

- `S07c` **Redo on owner correction.** `foundations.md`, `specification.md`, `lexicon.md` and
  `foundations.html` are replaced by one `handbook.md` + `handbook.html`. The owner had said the
  work *could* reach a researcher; that was read as *write it for a researcher*, and the whole
  explanatory apparatus was built from research-world concepts — making a document that claimed
  to teach from zero **depend on** a background. The analogies are **removed, not replaced**:
  substituting another profession's would reproduce the defect with a different dependency. The
  text now stands on concrete software situations, this repository's own dated failures, and
  diagrams. One file, alternating `CONCEPT` and `IN CAIRN` blocks, with the IN CAIRN blocks
  self-contained and carrying every normative statement. New minimal theme built for a long
  dense reference rather than reusing `index.html`'s house style, with five inline SVG diagrams.

- `S07b` `foundations.html` renders the primer in the house style of `index.html`, with the
  analogy given its own two-column component (*in your world* → *in software*, seven of
  them) and each repository failure its own visually distinct block — evidence, not
  illustration. Glossary appendix from the lexicon's plain-language column. Dated banner
  naming what it renders and which file wins on disagreement.

- `S07` Three documents, on the owner's pedagogical amendment. `foundations.md` teaches
  version control, tests, CI and the reason for a protocol **from zero**, for someone who
  writes real code but has never worked in a production setup — every mechanism bridged to
  a rigour the reader already practises (a unit test is a positive control, TDD is
  preregistration, a generated file is a figure you do not edit in Illustrator) and taught
  through a failure this repository actually had. `specification.md` is normative and
  points into it at every section. `lexicon.md` glosses 60 terms and marks the four with
  nothing behind them yet as ASPIRATIONAL. The rule catalogue is spliced by
  `cairn-rules.mjs --write` and pinned by a test, so the page warning about hand-written
  rule tables can no longer carry one.

- `S07a` D2 §2.2 stops proposing a lifecycle of its own: a dated banner, the accepted
  ADR-017 outcome, the `active` row removed, the abandoned-path gap marked closed, and
  §2.3's rule table regenerated with `path-staleness`. Corrections register gains C16.
  `index.html` names ADR-017 in its banner and carries the new advisory rule.

## 2026-08-24

- `S06` `index.html` rewritten against ADR-012 — the integrator model it taught at
  ten sites replaced by two roles and N paths each merging itself; enforcement table
  regenerated against the rules that exist; both HTML pages given a dated status
  banner naming the ADRs they render, because the page drifted unnoticed for ten days
  with no vintage on it.

- `d6b29f1` CP-OPS-002 S05b: gate the opening check, finish the OKF backfill
- `3df9073` CP-OPS-002 S05: backfill OKF — five indexes, ADR frontmatter, schema over the decision plane
- `7e04288` CP-OPS-002 S04: bound the ledger — history/ rollup and an advisory ledger-size
- `c4a9670` CP-OPS-002 S01: pin the ceremony schema, unify the registration doctrine
- `dd6e76a` CP-OPS-002 S00: adopt the enforcement repairs into the path
- `df875e6` Register CP-OPS-002 before branching
- `382ba30` CP-WORKTREE-CLEANUP S01: retire worktree after verified merge
- `9ea45db` CP-OPS-001 S09: push every step as a session boundary

## 2026-08-15

- `92f25cb` CP-OPS-001 S01–S04f — Cairn: parallel coding paths, self-merge, and the CI that enforces it
