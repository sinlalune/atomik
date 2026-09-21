---
type: Atomik Coding Path Plan
title: 'CP-OPS-003 — forward steps'
description: The planned units of the Cairn 1.1 adoption cleanup, in the order the owner set.
tags: [coding-path, plan, cairn]
timestamp: 2026-09-21T00:00:00Z
atomik:
  path: CP-OPS-003
---

# CP-OPS-003 — plan

Six units, each one deletion and its consequences. The order is the owner's:
the red gate first, then the two specifications.

## S01 — the gate

Delete the eight `tools/cairn-*.test.mjs`. Drop `cairn-check:test` from
`package.json` and from `binding.md`'s mechanical contract. Delete the
`validator self-test` step from `.github/workflows/cairn.yml`.

The tests are 0.2 fixtures against tools this repository no longer owns: 41 of
86 fail on the installed engine. The release ships its own suite and the
installer does not install it, by design — a host that does not own the tools
owns no tool tests. Green is then `gates` plus `cairn-check`, which is what the
release's own workflow runs.

Advances: outcomes 1 and 2.

## S01b — the transport declaration tells the truth

`cairn.config.json` declares `transport: { registration: manual-git,
integration: manual-git }` and `enforcementProfile: ci`, which `binding.md`
glosses as *host protection is not claimed*. It is claimed and enforced:
`sinlalune/atomik` requires a pull request on `master` plus two strict checks,
and its ruleset carries no bypass actor, so nobody can push the trunk directly.
S01's own registration was rejected by it.

Correcting `registration` is not a one-line edit, which is why this is a unit
and not a line of S01. Cairn ships no pull-request registration sequence —
`configuration.md` calls `manual-git` *the one registration sequence the open
skill ships* — so the true value has no procedure behind it, and that is
[cairn PR #25](https://github.com/sinlalune/cairn/pull/25), observations 6 and
7. Correcting `integration` is not free either: on `pull-request` transport the
`acceptance` rule refuses an arrival carried by a merge object rather than by a
commit of its own, and every one of this repository's six historical
integrations is a local merge commit. The unit establishes what the checker
does with those six before it moves the field.

Until this unit lands, the declared transport is a false statement about this
host, and the next path to open will hit exactly what CP-OPS-003 hit.

Advances: outcome 8, and the precondition for every path after this one.

## S02 — one specification

Delete `docs/cairn/specification/`. Move the 76 concept pages to `docs/concepts/`
— a flat root this repository owns — repoint `roots.concepts` at it, and repoint
every link into the old copy — `AGENTS.md` step 3, `binding.md`'s required-reading banner and its
role table, and whatever the corpus rules find.

The owner ruled the destination at the plan review: flat `docs/concepts/`, not
the three-folder concept root 1.1 created. That root's three indexes are kept
and grow as pages are written; the 76 existing pages are not bulk-sorted into
it, because sorting history is a judgement per page and buys nothing the gate
can check.

This is the sharp one. `cairn/README.md` pins the specification at
`bff7e2a`; the 0.2 copy is a second, older answer to the same question, and the
entry chain currently sends every session to it. `concept-orphan` and `links`
read the whole corpus, so this unit is checked by the gate rather than by
inspection.

Advances: outcome 3.

## S03 — the entry chain

Rewrite `AGENTS.md` and `binding.md` for release 1.1: name the six skills and
where they are, link the specification at its release, and make every command
in the mechanical contract one that exists. Retire the brief paragraph —
`briefs/` is the record's resume section now.

Advances: outcomes 4 and 7.

## S04 — the dead ends

Delete `tools/cairn-{init,rules,spec-build}.mjs` and their `package.json`
scripts. Add the `cairn-postmortem` script and the release's
postmortem-on-failure step to the workflow — the owner ruled it wired rather
than deleted, since the repository already carries the 428 lines and the
failure case is the one S01 just closed. Delete
`docs/modules/application.md`, whose area is already covered by the six
`atomik-desktop-*` notes the configuration binds.

Advances: outcome 5, part of outcome 8.

## S05 — the fork on the record

Write `ADR-023`: `tools/cairn-check.mjs` is held one patch ahead of release
1.1, restoring the link exemption for `docs/fixtures/` and
`atomik-project/log.md` that e18bbe4 (CP-CAIRN-006 S02) dropped. Name cairn PR
#23, and state the retirement condition — when the fix is released, `update
--take tools/cairn-check.mjs` and the ADR is superseded.

The patch is correct and the commit that carries it says only
`Adopt Cairn 1.1.0`. Until this unit, nothing in this repository says its
engine is not stock.

Advances: outcome 6.

## S06 — the reported residue

Retire `atomik-project/{sessions,audits,briefs}/` as history. Run
`staleShapes()` once more and account for every line it still prints: gone, or
named in the closing review as deliberately kept. The nineteen flat
`CP-*.md` records are conforming and migrate when next touched — that is a
statement, not a unit of work.

Advances: outcomes 7 and 8.
