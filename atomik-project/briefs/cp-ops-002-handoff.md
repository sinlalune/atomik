---
type: Atomik Brief
title: Handoff — CP-OPS-002
timestamp: 2026-08-27T00:00:00Z
atomik:
  path: CP-OPS-002
  written_by: cp-ops-002-writer
  branch: path/cp-ops-002
  checkpoint: 5954095e744ede5e0fa77d20e068ab920fd447c0
  checkpoint_unit: 12
  checkpoint_pushed: true
  base_commit: 7aa3b1d
  trunk_seen: df875e68c383f6e82b833b755e8925f2fb4651ed
  writes:
    - tools/cairn-*.mjs
    - docs/cairn/**
    - docs/adr/**
    - atomik-project/coding-paths/CP-OPS-002.md
    - atomik-project/briefs/**
  governs:
    - atomik-project/coding-paths/paths.md@2e7747c5ffb4e0b3def150a112752cf417205c75
    - docs/bedrock/22_22-agent-handoff.md@c10ed0a11bc501336f449be204b57408f80c196e
    - docs/cairn/cairn-audit-2026-08-24.md@319d54d2035b03dddb03f379cc7874bcbc448154
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

The Cairn specification is v0.2, its predicates are implemented in the review's
own severity order (S07g–S07j), and two repair units closed a moved retention ref
and the rule that could not see it (S07k–S07l). A second review round corrected
three predicates rather than adding any (S07m). The cold-resume pilot ran at
S07n: 20 trials, 35% would act, failures flat across paths, and its own verdict
is *do not change the normative text yet*.

S07o answered owner feedback on v0.2. Two doctrine corrections: the
answerable-alone contract forbade the reader from following the entry route
`AGENTS.md` points at, and now constrains context rather than file count; and the
second-ledger sentence named only one of the two ways a brief fails. Editorial:
`project/` replaces `atomik-project/` everywhere except one binding table, the
blob object id is explained, route is its own concept, the retention ref
namespace is located in the tree, and three non-Cairn rows left it. The reader
pins the specification to the left pane, opens everything on the right, and drops
the active-pane model, its coloured rule lines, and the Pane A/B labels.

S07p repaired three defects owner review found in that reader: the history
buttons were dead (the pane's own `data-article` swallowed every click inside
it), the arrow glyphs were not centred, and the h1 kept a serif that falls back
to a dated face. One face now, and a test that clicks the buttons rather than
asserting they are enabled.

S07q answered the owner's question — *is it a structural problem of the
protocol?* — after a fifth defect surfaced on CP-UI-TYPOGRAPHY. Partly, and
narrowly: every enforcement defect found so far is a rule that agreed too easily,
never one that was too strict. Six instances are tabulated in the ledger, two of
them still live on the trunk (`hasCeremony` accepts the opening note as a closing
ceremony; the merge-time journal entry has no predicate). Landed as four concept
articles, a normative directive with four MUSTs, five conformance rows, and three
tests.

Checker suite 191, specification suite 33. Retention refs 01–12.

## Next action

Begin S08 — extract Cairn from Atomik. First unit: `cairn.config.json` and the
loader, so `cairn-check.mjs` stops hardcoding `atomik-project/`, `apps/`,
`AREA_MAP` and the grandfather set. The folder rename `atomik-project/` →
`project/` lands in that same work unit, once the binding is selectable rather
than documented-but-unimplemented.

## Blockers

None.

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

1. `atomik-project/coding-paths/paths.md@2e7747c5` — how paths run; read before
   resuming or opening any path.
2. `docs/bedrock/22_22-agent-handoff.md@c10ed0a1` — the per-step protocol.
3. `docs/cairn/cairn-audit-2026-08-24.md@319d54d2` — the audit that opened this
   path and named the failure mode it exists to fix.

The S07f–S07j ledger entries in `CP-OPS-002.md` carry the decisions and their
reasons; `docs/cairn/specification/index.md` is the normative target.

## Verification

`npm run cairn-check` reports OK with at most one advisory: the newest work
unit's retention ref, which is written after the commit that declares it.
`npm run cairn-check:test` passes 189 subtests; `node --test
tools/cairn-spec.test.mjs` passes 31. `npm run cairn-spec:build` reproduces the
checked-in HTML byte-for-byte. `npm run typecheck`, `npm test` (1101 passing)
and `npm run build` all pass.
