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

**S01b was planned here and is folded in.** It was to correct
`transport.registration: manual-git`, which S01's own registration proved
false: the push to the trunk was refused, the `master — cairn gates` ruleset
carrying `bypass_actors: []`. The owner added an admin bypass on 2026-09-21,
matching `sinlalune/cairn`'s, and the direct push then succeeded. The declared
value is true again and stays. What is left of that unit is one sentence and
one field, both in this one's surface: `binding.md` still glosses the `ci`
profile as *host protection is not claimed*, which is now wrong — it is
claimed, enforced, and bypassed by one role — and `transport.integration`
still says `manual-git` while `allowed_merge_methods` is `[merge]` behind a
required request. That field is not free to move: on `pull-request` the
`acceptance` rule refuses an arrival carried by a merge object rather than a
commit of its own, and all six of this repository's historical integrations
are local merges. This unit establishes what the checker does with those six
before it decides whether the field moves or the gloss alone is corrected.

Advances: outcomes 4 and 7.

## S04 — the dead ends

Add the `cairn-postmortem` script and the release's postmortem-on-failure step
to the workflow — the owner ruled it wired rather than deleted, since the
repository already carries the 428 lines and the failure case is the one S01
just closed. Exercise the tool before calling it wired.

Two amendments from execution. `tools/cairn-{init,rules,spec-build}.mjs` and
their scripts went in **S02**, where the concept-root move broke
`cairn-spec:build` and repairing a tool this unit would delete was work with no
reader. And `docs/modules/application.md` is **rerouted, not deleted**: it is a
kit-owned host file and was pristine, so a deletion returns on the next
`update`, while an edited host file is never rewritten. It is now three lines
pointing at the folder index.

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

**Deferred here by S02's second read, with its counts.** The retired tree keeps
twelve files and only six are load-bearing — the four concept stubs plus
`reference/{execution-protocol,repair}.md`, which append-only records name by
exact path. The other nine (`specification/index.md` and eight reference pages)
are reachable only from editable documents, and `docs/cairn/specification.html`
is 19 575 lines generated by a builder S02 deleted. The amendment keeps the
copy *only* so frozen records resolve; this unit shrinks it to exactly that.
ADR-018 and ADR-019 decided *about* the 0.2 specification, so `index.md` is
argued for separately rather than deleted with the rest.

Advances: outcomes 7 and 8.
