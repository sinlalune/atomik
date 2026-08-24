---
type: Atomik Session Record
title: CP-OPS-002 — owner ruling 9, S06b rescoped to the enforcement tier model
timestamp: 2026-08-24T00:00:00Z
tags: [ruling, cairn, enforcement, adoption, portability, cp-ops-002]
path: CP-OPS-002
branch: path/cp-ops-002
---

# Owner ruling 9 — S06b becomes "declare the enforcement tier"

Recorded mid-path, after S01. This is a scope amendment, **not a ceremony**: the note
carries `path:` so it belongs to CP-OPS-002 and deliberately declares no `ceremony:` key,
because nothing here opens or closes the path.

## What happened

Opening-check ruling 6 said the owner would configure GitHub branch protection on `master`
requiring `cairn-check` and `gates`, and that until it was on, the specification must say
CI **observes** rather than prevents. The agent walked the ruleset form field by field.
The owner opened it, did not create the ruleset, and said:

> "I didnt but I am a little worried that it makes the protocol complicated to setup for
> adoption"

## The ruling

Accepted, and the concern is correct. The defect is in the protocol's scope, not in the
owner's willingness to click. Cairn is being extracted for adoption elsewhere (S08/S09),
and ruling 6 as written would have made a host-specific web-UI configuration part of
standing up the protocol.

Enforcement is three tiers, and only the first is required:

```text
tier 0  local      npm run cairn-check          zero setup, no host, no account
tier 1  ci         .github/workflows/cairn.yml  one file — CI OBSERVES
tier 2  protected  a trunk ruleset              host-specific — CI PREVENTS
```

Ruled, verbatim from the owner's acceptance:

1. `cairn.config.json` gains `"enforcement": "local" | "ci" | "protected"`, and
   `cairn-check` prints it in its header — the honest claim becomes generated rather than
   written, so it cannot drift.
2. The specification documents all three tiers, one line each on what that tier can and
   cannot prevent, and states that tier 2 is a property of a repository, not a requirement
   of the protocol.
3. `cairn-init` scaffolds tiers 0 and 1 only — no host configuration, no account, nothing
   to click.
4. For anyone who wants tier 2, ship the ruleset as a JSON payload plus one `gh api`
   command in the operator guide. Copy-paste, not a click-path, and skippable.

## Why this is better protocol design, not a concession

`paths.md` already holds that a validator which blocks on judgment gets switched off
within a week, and that a false verdict costs more than a missed one. A setup step
performed once, invisibly, in someone else's web UI is the same failure relocated: it will
be skipped, and the specification would go on asserting that CI prevents merges. That is
finding F13's species exactly — **a published rule the implementation does not honour** —
and F13 is the defect this path's S01 just repaired.

Tier 2 scales with the number of writers on a shared trunk, not with the protocol. One
writer dogfooding their own trunk is guarded by the ceremonies and the local gates, and
admin bypass was one command away in any case.

## Consequences

- S06b is rescoped and delivered where its homes are built: the tier prose and the
  optional ruleset payload in **S07**, the config field, the generated header line and the
  tier-0/1 `cairn-init` in **S08**. It is not an empty step waiting on someone else.
- Nothing in this path now waits on host configuration. The previous blocker is closed.
- **This repository stays at tier 1**, declared, with its ruleset page deliberately empty.
- `ADR-016` §3 is amended: it previously required every document to say CI observes *until
  branch protection lands*, which framed tier 2 as inevitable. It now states the tier model
  and that the claim is generated per repository.
- Path closure continues to merge locally. Had tier 2 been enabled, it would have moved to
  a short self-merged pull request, because a locally created merge commit carries no
  check runs.
