---
type: Atomik Brief
title: Handoff — CP-OPS-002
timestamp: 2026-08-31T00:00:00Z
atomik:
  path: CP-OPS-002
  written_by: cp-ops-002-writer
  branch: path/cp-ops-002
  checkpoint: 292ae08c5af89e546b07ea0ab4204b0fc81a5f0e
  checkpoint_unit: 17
  checkpoint_pushed: true
  base_commit: 7aa3b1d
  trunk_seen: dfcd09d
  writes:
    - tools/cairn-*.mjs
    - docs/cairn/**
    - docs/adr/**
    - atomik-project/coding-paths/CP-OPS-002.md
    - atomik-project/coding-paths/history/**
    - atomik-project/briefs/**
    - atomik-project/log/**
  governs:
    - atomik-project/coding-paths/paths.md@2e7747c5ffb4e0b3def150a112752cf417205c75
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
has been about whether the rules are honest, not whether there are enough of
them.

**The finding that organises everything else:** every enforcement defect found in
this checker is a rule that agreed too easily; not one was too strict. Seven
instances now, including two still live on the trunk — `hasCeremony` accepts a
path's *opening* note as its closing ceremony, and the merge-time journal entry
has no predicate at all.

Landed for it: four concept articles, the directive *Prove that the gate can
fail* with four MUSTs, five conformance rows, and the first adversarial fixtures.

S07r rebased onto `dfcd09d` and found the worst instance: `unretainedCheckpoints`
returns "nothing orphaned" when the retained set stops intersecting the branch —
exactly what a rebase causes. 13 refs, 41 commits, 0 intersecting, gate `OK`.
Rebase-before-merge is mandatory, so retention evaporates before every merge on
every path. The ref namespace cannot express the fix, so it is an ADR first.

S07s drained `CP-MVP-008`, which never merged from a branch and so has no
candidate commit to name; it joins the self-deleting `V02_MIGRATION_PATHS`, now
wired into `transition` and `acceptance`. S07t fixed the rule catalogue, which
published five rules as blocking-only while all five can emit advisory findings —
guarded by a test comparing the table against the same blind extraction that
wrote it.

Refs 01–16; refs 01–13 hold PRE-rebase commits and no ref was moved. Checker
suite 193, specification suite 33.

## Next action

Open S08 from
`docs/cairn/cairn-s08-opening-brief-2026-08-31.md`, and take its Part 1 in order.
The first unit is `hasCeremony`: read the `ceremony:` frontmatter key instead of
matching a filename, with a fixture that rejects a `done` path whose only session
note is its opening check.

## Blockers

None. Both open owner questions are settled: `CP-MVP-008` by the named migration
exception (S07s), and the inaccurate CP-UI-TYPOGRAPHY dates by the protocol's own
immutability rule — the records stand and later records carry the correction.

## Tried and rejected

- **`remote_trunk == T` at integration.** First-come-first-served; every landing
  invalidates every other open acceptance, so a busy trunk never closes. The
  drift predicate over `writes:` ∪ `governs:` replaces it, pinned by a test.
- **A YAML dependency for the extended parser.** Rejected to keep the control
  plane installable with no network, which the S08 `cairn-init` kit needs.
- **Forbidding collapsed reviewer roles.** Would exclude the setup most likely
  to adopt Cairn first; the rule makes the weakness visible instead.
- **Grandfathering by date or forward scope.** Rejected for a named, finite
  exception set that reports itself as a blocking finding once spent.
- **Taking frontmatter scalars verbatim to end of line.** A documented choice
  that silently made `governs:   # comment` declare nothing. Scalars now strip
  trailing comments; quoted values keep their `#`.
- **Retention checked per declared unit only.** A moved ref left every unit
  resolving while orphaning a real commit; the branch is now walked directly.
- **Dispositions compared against the closure commit.** `A` is field-restricted,
  so its advisory set is a strict subset of `C`'s — the rule could pass while an
  advisory at the candidate went undisposed. The record now attests the set.
- **Route triggers left entirely to declaration.** A path that has already
  spanned two work units must be `full`, which cannot be declared away.
- **A brief that answers everything from itself.** Rejected at owner review: it
  would be a hand-kept copy of the path record and ledger, drifting from the day
  it is written. The brief owes the last link of the entry route, exactly.
- **An `objective:` field in the brief frontmatter.** The objective is prose and
  the frontmatter is machine-checkable state; maintained in two schemas it will
  eventually disagree with itself, and no predicate can adjudicate two paragraphs.
- **Renaming the `atomik-project/` folder now.** 736 occurrences across 120 files
  with two paths branched against it; owner ruled documents-only, folder at S08.
- **A serif display face in the reader.** It carries whatever the machine has,
  and with no Source Serif installed that is a dated fallback. One face.

## Reading order

1. `docs/cairn/cairn-s08-opening-brief-2026-08-31.md@7d753d47` — **read this
   first.** It carries the five findings that reorder S08, the two owner rulings,
   and the teaching axis, each with the fixture that would catch it.
2. `atomik-project/coding-paths/paths.md@2e7747c5` — how paths run; read before
   resuming or opening any path.
3. `docs/bedrock/22_22-agent-handoff.md@c10ed0a1` — the per-step protocol.
4. `docs/cairn/cairn-audit-2026-08-24.md@319d54d2` — the audit that opened this
   path and named the failure mode it exists to fix.

The four concept articles named in the S08 brief — `proxy-predicate`,
`unsound-gate`, `adversarial-fixture`, `gate-parity` — are the vocabulary the
rest of this path is written in. Completed steps live in
`coding-paths/history/`; `docs/cairn/specification/index.md` is the normative
target.

## Verification

`npm run cairn-check` reports OK with at most one advisory: the newest work
unit's retention ref, which is written after the commit that declares it.
`npm run cairn-check:test` passes 189 subtests; `node --test
tools/cairn-spec.test.mjs` passes 31. `npm run cairn-spec:build` reproduces the
checked-in HTML byte-for-byte. `npm run typecheck`, `npm test` (1101 passing)
and `npm run build` all pass.
