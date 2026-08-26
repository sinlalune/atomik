---
type: Atomik Brief
title: Handoff — CP-OPS-002
timestamp: 2026-08-26T00:00:00Z
atomik:
  path: CP-OPS-002
  branch: path/cp-ops-002
  checkpoint: PENDING
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

The Cairn specification is v0.2 and its predicates are being implemented in
order of the review's own severity ranking. Landed: the canonical specification
project (S07f), the v0.2 revision of its text (S07g), the two P0 predicates —
checkpoint retention and provisional commits — plus a typed ledger and an
extended frontmatter grammar (S07h), and the P1 record predicates: scope
digests, field-level closure, acceptance drift, structured dispositions,
collapsed-role advisory, blocking scope drift, and a self-deleting migration
exception (S07i). Routes, this brief's own contract, and redaction (S07j).

Ten of the fourteen unimplemented v0.2 rows are now enforced or partly enforced.
Four remain, and are the honest residue rather than a backlog: repair procedures
have no predicate, the answerable-alone contract is a judgement, the temporal
half of retention is unobservable, and ledger-prefix proof awaits markers.

One protocol violation occurred and was repaired in S07k: a retention ref was
force-moved, orphaning the commit it had named. The rule could not see it —
it checked whether every declared unit resolved a ref, not whether every
completed commit was retained. Both the ref and the rule are fixed.

Checker suite 129, full protocol/specification suite 176. Retention refs 01–07.

## Next action

Begin S08: `cairn.config.json`, the generated enforcement header line,
`tools/cairn-new.mjs`, and the tier-0/1 `cairn-init` seed.

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
`npm run cairn-check:test` passes 157 subtests. `npm run cairn-spec:build`
reproduces the checked-in HTML byte-for-byte. `npm run typecheck`, `npm test`
and `npm run build` all pass.
