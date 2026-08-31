---
type: Atomik Brief
title: Handoff — CP-OPS-002
timestamp: 2026-08-31T00:00:00Z
atomik:
  path: CP-OPS-002
  written_by: cp-ops-002-writer
  branch: path/cp-ops-002
  checkpoint: 1b1491aa645acb53c3e6184064b38edf9e2e91e2
  checkpoint_unit: 18
  checkpoint_pushed: true
  base_commit: 7aa3b1d
  trunk_seen: dfcd09d
  writes:
    - tools/cairn-*.mjs
    - atomik-project/coding-paths/paths.md
    - docs/cairn/**
    - docs/adr/**
    - atomik-project/coding-paths/CP-OPS-002.md
    - atomik-project/coding-paths/history/**
    - atomik-project/briefs/**
    - atomik-project/log/**
  governs:
    - atomik-project/coding-paths/paths.md@c8776b293f1c49cc7450481ea9de0d3151ecb2f9
    - docs/bedrock/22_22-agent-handoff.md@c10ed0a11bc501336f449be204b57408f80c196e
    - docs/cairn/cairn-audit-2026-08-24.md@319d54d2035b03dddb03f379cc7874bcbc448154
    - docs/cairn/cairn-s08-opening-brief-2026-08-31.md@7d753d473b1f7542f3003dc4e11e83346485a35a
  verify:
    - npm run cairn-check
    - npm run cairn-check:test
    - npm run cairn-spec:build
  budget_tokens: 1200
---

# Resume CP-OPS-002 here

## Outcome

Close Cairn's enforcement gaps, drain the state that predates each rule, and
extract the protocol from Atomik as a portable specification and init kit.

## State

The specification is v0.2 and its predicates are implemented. Since then the work
has been about whether the rules are honest, not whether there are enough.

**The finding that organises everything else:** every enforcement defect found in
this checker is a rule that agreed too easily; not one was too strict. Eight
instances now, two still live on the trunk — `hasCeremony` accepts a path's
*opening* note as its closing ceremony, and the merge-time journal entry has no
predicate at all.

Landed for it: four concept articles, the directive *Prove that the gate can
fail* with four MUSTs, five conformance rows, and the first adversarial fixtures.
S07r rebased onto `dfcd09d` and found the worst instance: `unretainedCheckpoints`
reports "nothing orphaned" once the retained set stops intersecting the branch —
which is what a rebase causes, and rebase-before-merge is mandatory. The ref
namespace cannot express the fix, so it is an ADR first. S07s drained
`CP-MVP-008` into the self-deleting `V02_MIGRATION_PATHS`; S07t caught a rule
catalogue publishing five rules as blocking-only when all five can go advisory.

**S08 is open and S08a is done: the local gate now asks the CI question.** On a
`path/*` branch `npm run cairn-check` defaults its base to the trunk. The base is
chosen before any predicate runs, so every changed-file rule had been inheriting
the wrong one — 0 changed files locally against 228 in CI, on this branch, for
many pushes. `--working-tree` narrows it as an opt-out, the header names the base
and how it was chosen, and a narrowed run raises the new advisory `base-parity`.
**Read every `cairn-check` verdict recorded before unit 19 as the narrow one.**

Refs 01–18; refs 01–13 hold PRE-rebase commits and no ref was moved. Checker
suite 197, specification suite 33.

## Next action

S08 Part 1 item 1, the next unit: **`hasCeremony`** must read the `ceremony:`
frontmatter key instead of matching a filename, with a fixture that rejects a
`done` path whose only session note is its opening check. `ceremonyFromSessions`
on this branch already does it correctly and has never reached the trunk.

Then, in order: item 2 (a predicate for the merge-time journal entry), item 3
(the derived-view rule keyed on declared `status`, not the branch name), item 3c
(a record's filename date equals its frontmatter `timestamp:`), item 4 (the
retention-generation question — an ADR before any code).

## Blockers

None. Both owner questions are settled: `CP-MVP-008` by the named migration
exception (S07s), and the inaccurate CP-UI-TYPOGRAPHY dates by record
immutability — they stand, and later records carry the correction.

## Tried and rejected

- **`remote_trunk == T` at integration.** Every landing would invalidate every
  other open acceptance. The drift predicate over `writes:` ∪ `governs:`
  replaces it, pinned by a test.
- **A YAML dependency for the extended parser.** The control plane must install
  with no network, which the S08 `cairn-init` kit needs.
- **Grandfathering by date or forward scope**, and **retention checked per
  declared unit.** Both agree too easily: the exception set is named and finite
  and reports itself once spent, and the branch is walked directly.
- **Dispositions compared against the closure commit**, and **route triggers left
  to declaration.** Both let a rule pass on the narrower reading; the record now
  attests the advisory set, and a second work unit forces `full`.
- **Renaming the `atomik-project/` folder now.** 736 occurrences, 120 files, two
  paths branched against it; owner ruled documents-only, folder at S08.
- **A self-sufficient brief, and an `objective:` field in it.** Both make the
  brief a second copy of the path record, drifting from the day it is written.
  It owes the last link of the entry route, exactly.
- **Taking "Part 1 in order" as numeric order.** Item 3b says do it first, and
  gives the reason: any earlier repair would be verified by the command it
  fixes. Done as S08a — the reason outranks the numbering.
- **Pinning each conformance row's status in its test.** The row must exist and
  state a status in the vocabulary; pinning *which* makes every honest matrix
  update a test edit, and teaches an editor to change the test.

## Reading order

1. `docs/cairn/cairn-s08-opening-brief-2026-08-31.md@7d753d47` — **first.** The
   five findings that reorder S08, the two owner rulings, and the teaching axis,
   each with the fixture that would catch it.
2. `atomik-project/coding-paths/paths.md@c8776b29` — how paths run.
3. `docs/bedrock/22_22-agent-handoff.md@c10ed0a1` — the per-step protocol.
4. `docs/cairn/cairn-audit-2026-08-24.md@319d54d2` — the audit that opened this
   path and named the failure mode it exists to fix.

`proxy-predicate`, `unsound-gate`, `adversarial-fixture` and `gate-parity` under
`specification/concepts/` are the vocabulary the rest of this path is written in.
Completed steps live in `coding-paths/history/`;
`docs/cairn/specification/index.md` is the normative target.

## Verification

`npm run cairn-check` — the branch against the trunk by default since S08a —
reports OK with 11 pre-existing advisories: nine grandfathered `CP-MVP-008`
findings carrying their reason, two `single-truth` notes on generated files. A
twelfth appears for the newest unit's retention ref, written after the commit
that declares it. A run reporting `base-parity` is a NARROWED run: re-run without
`--working-tree` before recording it.

`npm run cairn-check:test` passes 197 subtests (140 checker, 33 specification, 24
generators). `npm run cairn-spec:build` reproduces the checked-in HTML
byte-for-byte. `npm run typecheck`, `npm test` (1109 passing) and `npm run build`
all pass.
