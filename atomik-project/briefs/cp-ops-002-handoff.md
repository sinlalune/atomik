---
type: Atomik Brief
title: Handoff — CP-OPS-002
timestamp: 2026-08-31T00:00:00Z
atomik:
  path: CP-OPS-002
  written_by: cp-ops-002-writer
  branch: path/cp-ops-002
  checkpoint: c254c01bf5069fd274dbfd54de2f77d676aebfce
  checkpoint_unit: 21
  checkpoint_pushed: true
  base_commit: 7aa3b1d
  trunk_seen: dfcd09d
  writes:
    - tools/cairn-*.mjs
    - .github/workflows/cairn.yml
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
    - docs/cairn/cairn-s08-opening-brief-2026-08-31.md@7f52feaa8d1e5ded7514a2f39127f755c39d40b2
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

The specification is v0.2 and its predicates are implemented. The work since is
about whether the rules are honest, not whether there are enough.

**The finding that organises everything else:** every enforcement defect here is
a proxy predicate substituted for the sentence the rule states — eight leaning
lenient, one strict. Two are still live on the trunk: `hasCeremony` accepts a
path's *opening* note as its closing ceremony, and the merge-time journal entry
has no predicate. **Worst one still open (S07r):** `unretainedCheckpoints`
reports "nothing orphaned" once the retained set stops intersecting the branch,
which is what a rebase causes — and rebase-before-merge is mandatory. The ref
namespace cannot express the fix, so it is an ADR first.

**S08 so far — four units, one question:** *is the verdict I am recording the one
that decides the merge?* Full records in the path file; what a resuming session
needs from them:

- The local gate now defaults to the **trunk** base on a path branch (S08a).
  `--working-tree` is the opt-out and raises `base-parity`. **Every verdict
  recorded before unit 19 is the narrow one.**
- An **empty ref namespace is inconclusive, not absent** (S08b). CI fetches
  `+refs/cairn/*:refs/cairn/*`; without that step retention cannot be judged.
- **CI is read, not reproduced** (S08c). `gh run view --log` is the source for any
  claim about what CI reported — substituting a look-alike local run is what put a
  false attribution in the S08 opening brief.
- **[`ADR-020`](../../docs/adr/ADR-020-protocol-context-weight.md) is `proposed`**
  (S08d): context weight as a maxim tested by separation, `instruction parity`
  named, a portable/host/binding boundary, and a path record **born sliced** with
  the Work Ledger dissolving into its steps. The `history/` rollup and
  `ledger-size` retire with it, so **the queued ledger roll is deliberately not
  done** — it would be work performed to be undone.

Refs 01–19 on the remote; 01–13 hold PRE-rebase commits and no ref was moved.
Checker suite 198, specification suite 33.

## Next action

**Owner ruling on ADR-020 first.** If accepted it carries three things together:
the `instruction-parity` article, the concept-cap decision it forces (the wiki is
at its hard cap of 71), and the `CP-OPS-002` folder migration as worked example.

Independent of that ruling, and unblocked either way: **`hasCeremony`** must read
the `ceremony:` frontmatter key instead of matching a filename, with a fixture
rejecting a `done` path whose only session note is its opening check.
`ceremonyFromSessions` on this branch already does it and has never reached the
trunk. Then item 2, a predicate for the merge-time journal entry.

Then: item 2 (a journal-entry predicate), item 3 (the derived-view rule keyed on
declared `status`, not the branch name), item 3c (a record's filename date equals
its `timestamp:`), item 4 (retention generation — an ADR before code).


## Blockers

None. Both owner questions are settled: `CP-MVP-008` by the named migration
exception (S07s), and the CP-UI-TYPOGRAPHY dates by record immutability.

## Tried and rejected

- **`remote_trunk == T` at integration.** Every landing would invalidate every
  other open acceptance; the drift predicate replaces it.
- **A YAML dependency for the extended parser.** The control plane must install
  with no network, which `cairn-init` needs.
- **Grandfathering by date or forward scope**, and **retention checked per
  declared unit.** Both agree too easily; the exception set is now named, finite
  and self-deleting, and the branch is walked directly.
- **Trusting a local run that resembles CI.** How the S08 brief came to attribute
  findings to CI that CI never reported.
- **Renaming `atomik-project/` now.** 736 occurrences, 120 files, two paths
  branched against it; owner ruled documents-only, folder at S08.
- **A self-sufficient brief, and an `objective:` field in it.** Both make it a
  second copy of the path record, drifting from the day it is written.
- **Pinning each conformance row's status in its test.** The row must exist and
  state a status in the vocabulary; pinning *which* makes every matrix update a
  test edit.
- **Treating an empty ref namespace as absent refs.** Indistinguishable from
  unfetched, from inside one clone; inconclusive is the only honest verdict.

## Reading order

1. `docs/cairn/cairn-s08-opening-brief-2026-08-31.md@7f52feaa` — **first.** The
   five findings that reorder S08, the owner rulings, the teaching axis, and a
   dated correction where it got CI wrong.
2. `atomik-project/coding-paths/paths.md@c8776b29` — how paths run.
3. `docs/bedrock/22_22-agent-handoff.md@c10ed0a1` — the per-step protocol.
4. `docs/cairn/cairn-audit-2026-08-24.md@319d54d2` — the audit that opened this
   path and named its failure mode.

`proxy-predicate`, `unsound-gate`, `adversarial-fixture`, `gate-parity` under
`specification/concepts/` are this path's vocabulary. `specification/index.md` is
normative; completed steps live in `coding-paths/history/`.

## Verification

`npm run cairn-check` — branch against trunk by default since S08a — reports OK
with pre-existing advisories: nine grandfathered `CP-MVP-008` findings carrying
their reason, two `single-truth` notes on generated files, `ledger-size`, and the
newest unit's retention ref, written after the commit that declares it. A run
reporting `base-parity` is NARROWED, and one reporting an inconclusive
`checkpoint-retention` has not fetched `refs/cairn/*`: neither is recordable.

Claims about what **CI** reported come from `gh run view --log`, never from a
local run built to resemble it — that substitution is what S08c had to correct.

`npm run cairn-check:test` passes 198 subtests. `npm run cairn-spec:build`
reproduces the checked-in HTML byte-for-byte. `npm run typecheck`, `npm test`
(1109 passing) and `npm run build` all pass.
