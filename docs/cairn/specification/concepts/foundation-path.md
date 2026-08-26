---
type: Cairn Concept
title: Foundation path
description: The route a repository uses for its own first hour, when the work units are documents and there is no code to check them against.
tags: [cairn, concept, route, origin, documents, adoption]
timestamp: 2026-08-26T00:00:00Z
---

# Foundation path

A foundation path is a [coding path](./coding-path.md) whose work units are
documents: the route by which a repository produces the accepted intent that
every other path begins from.

## Build the idea

A protocol that begins at accepted intent says what to do once a team already
knows the outcome, the boundaries and the governing documents — and says nothing
about where those came from.

That is the wrong hour to leave undescribed. Ideation is where context loss
hurts most, because nothing catches it. A compiler catches a broken call; a test
catches a broken behaviour; nothing at all catches a document that quietly
contradicts the one written three sessions ago. The phase with the least
mechanical support was the phase with no protocol.

A foundation path is not a lighter kind of work. It is the same protocol
pointed at documents.

## In Cairn

A foundation path declares:

- **write surface** — `docs/**` plus `draft` path records under
  `project/coding-paths/`; no application source;
- **work-unit type** — `foundation`: the parts that must move together are the
  documents, their indexes, and the ledger entry, with no module note and no
  test;
- **verification** — `links`, `schema`, and a [coherence audit](./coherence-audit.md).
  All three already exist as corpus rules, so a foundation path needs no gate
  that ordinary paths do not already have;
- **governing documents** — pinned as `path@oid`, which is what makes the
  [scope digests](./scope-digest.md) of the paths it produces cheap to compute.

Its deliverable has two halves. The first is the foundational text itself —
architecture, constraints, the decisions already made. The second is a roadmap
of `draft` path records: one per bounded piece of the intended product, each
complete enough to be reviewed, none yet accepted. They wait in `draft` for
[opening acceptance](./opening-acceptance.md), and `draft → running` is a
transition the [lifecycle](./lifecycle.md) already allows.

### The adoption variant

A brownfield repository has the opposite problem: plenty of system, no records.
An adoption path is a foundation path whose work units back-document what
already exists — one [module note](./module-note.md) per implemented area,
describing the area as it is rather than as it should be, plus the decisions
that are already load-bearing whether or not anyone wrote them down.

Its deliverable is the same: a governing document set and a roadmap of `draft`
paths. Its purpose is narrower — to give an existing repository a legal entry
point, so the first real change is not also the first record.

## It does not prove

A foundation path cannot establish that its foundations are right. Its
verification is internal consistency — every link resolves, every record parses,
nothing contradicts anything else already written. A coherent and wrong
architecture passes every one of those checks. Only building against it finds
out.

Related: [coding path](./coding-path.md), [draft state](./draft-state.md),
[lightweight path](./lightweight-path.md), [work unit](./work-unit.md),
[module note](./module-note.md).
