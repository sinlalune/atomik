---
type: Atomik ADR
title: 'ADR-016: Cairn enforcement integrity — the gates must judge what they claim to judge'
description: Repairs the checks that reported OK over false conditions: rules fail closed when they cannot name their subject, ceremonies are declared in root-level frontmatter, and enforcement is declared in three tiers.
tags: [adr, cairn, enforcement, ci, ceremony, protocol, tiers]
timestamp: 2026-08-24T00:00:00Z
adr:
  id: ADR-016
  status: accepted
  date: 2026-08-24
---

# ADR-016: Cairn enforcement integrity — the gates must judge what they claim to judge

Status: accepted
Date: 2026-08-24
Amended: 2026-08-24 (§3 — enforcement tiers; host protection is a repository property, not a protocol requirement)
Amends: ADR-012 (parallel coding paths, self-merge, and a protocol check in CI)

## Context

Three independent audits of the Cairn protocol converged on one failure mode
wearing several faces: **checks that report `OK` over conditions that are false**.
The record is `docs/cairn/cairn-audit-2026-08-24.md`; the owner ruled the whole
set at the CP-OPS-002 opening check
(`atomik-project/sessions/2026-08-24-cp-ops-002-opening-check.md`).

Four defects were mechanical, and each made a *blocking* rule silently
inapplicable rather than merely lenient:

- **F1 — the rebase gate did not run.** `resolveBranch()` read the checkout, and
  CI checks out a detached head, so every `path/*`-scoped rule was skipped in
  exactly the place the rules exist for. A skipped rule printed nothing.
- **F2 — the ceremony gate was a tautology.** It substring-matched session
  *filenames*. `paths.md` requires an opening-check note before a path may
  branch, so a matching filename exists from the path's first hour: the rule
  verified that a path had been OPENED and reported it as proof it had been
  CLOSED. With no integrator, this is the last human guard before a merge.
- **F8 — CI had never run a path-scoped rule.** The workflow triggered on
  `push: master` and `pull_request`, and every merge in this repository is a
  local merge commit — zero pull requests in the whole history.
- **F9 — `writes:` parsed the document, not the frontmatter.** It consumed the
  `---` terminator as a write surface and refused the trailing comment that the
  bedrock 24 template itself shows, so a path copied faithfully from the
  template declared nothing and silently disabled `scope-drift`.

Two more were documentation defects of the same species — a published rule that
the implementation does not honour:

- **F13 — the operator guide prescribed a ceremony schema the parser rejects.**
  The D1 guide and CP-OPS-002's own step text wrote
  `atomik: { path, ceremony: closing }`; the shipped parser reads ROOT-LEVEL
  keys, as do all sixteen backfilled closure notes. Executed against the live
  parser the nested form returns `false`. An operator following the published
  guide would have failed a blocking gate on the merge that guide was written to
  close.
- **F15 — two doctrine pages disagreed about the registration commit.**
  `paths.md` said land *only* the declaration and the regenerated view; bedrock
  24 said those plus the opening-check note. The repository's last real
  registration (`9040417`) followed bedrock. `AGENTS.md` requires such a
  disagreement to be reported as a defect.

## Decision

### 1. A rule that cannot determine its subject fails closed

`resolveBranch()` asks the host (`GITHUB_HEAD_REF`, then the git ref) before
falling back to the checkout, and a `branch-identity` rule **fails the build**
when the branch is undeterminable *and* guarded roots changed — advisory
otherwise, because a docs-only or tag build must not be punished for how it was
checked out. `cairn.yml` checks out the pull-request HEAD sha, so the gate
judges the commit that lands rather than a merge preview that contains the base
by construction. Silence is no longer a pass.

### 2. Ceremonies are DECLARED, in root-level frontmatter

A closing ceremony is proven by a session note that says it is one:

```md
path: CP-EXAMPLE-001
ceremony: closing
```

Root level, siblings of `title:`, matched on the exact path id so a note about
`CP-MVP-0010` never closes `CP-MVP-001`. Filename substrings are not a schema.

**The schema is pinned in exactly one place** —
`docs/bedrock/24_24-doc-templates.md`, section *Session note and ceremony
template* — and every other document points at it. F13 was a restatement that
drifted; the repair is not a better restatement but the removal of restatement.
The nested form is rejected, not accepted-for-compatibility: accepting both
would make the ratified form a preference instead of a schema, and the corpus
of sixteen backfilled notes already uses the ratified one.

### 3. CI runs on path branches, and enforcement is DECLARED in three tiers

`cairn.yml` triggers on `push` to `master` and `path/**`, with a `concurrency`
group so push-per-commit does not multiply runs. A local `git merge` still
bypasses CI entirely — that is how all six merges in this repository happened.

An earlier version of this clause said every document must describe CI as
*observing* **until branch protection lands**, which framed host protection as
inevitable and made it part of standing the protocol up. Amended on the owner's
ruling of 2026-08-24
([note](../../atomik-project/sessions/2026-08-24-cp-ops-002-s06b-rescope.md)),
after the concern that it *"makes the protocol complicated to setup for
adoption"*. Enforcement is three tiers, and only the first is required:

```text
tier 0  local      npm run cairn-check          zero setup, no host, no account
tier 1  ci         .github/workflows/cairn.yml  one file — CI OBSERVES
tier 2  protected  a trunk ruleset              host-specific — CI PREVENTS
```

Tier 0 carries nearly all the value, and it is where this ADR's other decisions
live: branch→path, trunk registration, the rebase gate, the ceremony gate and
link integrity all run with no host at all. **Tier 2 is a declared property of a
repository, never a requirement of the protocol.**

The claim is therefore generated rather than written: `cairn.config.json`
declares `"enforcement"`, and `cairn-check` prints it in its header, so no
document can assert prevention that is not installed. That failure — a published
rule the implementation does not honour — is exactly F13, repaired in decision 2
of this same ADR. A setup step performed once, invisibly, in someone else's web
UI would have reintroduced it at the level of the whole protocol. An honest
description of a partial guard is worth more than a confident description of a
guard that is not there.

This repository is **tier 1**, declared. Tier 2 scales with the number of writers
on a shared trunk, not with the protocol.

### 4. `writes:` is read from the frontmatter block only

`parseWrites()` is scoped to the frontmatter, stops at the terminator, and
tolerates the trailing comment the documented template carries. A template a
path is told to copy must parse.

### 5. A registration commit is METADATA-ONLY, not a file count

The invariant is that **no implementation enters the registration commit** —
not that it contains exactly two files. A count is arbitrary: it would fail a
legitimate registration that also fixed a typo in the agenda it cites, while
saying nothing about the thing that actually breaks the ordering. The commit
carries the accepted declaration, the regenerated `ACTIVE.md`, and the
opening-check note that justifies the activation. `paths.md` and bedrock 24 now
state this identically, resolving the F15 conflict in favour of the practice the
repository already followed.

### 6. The admission test for a blocking rule is unchanged, and these pass it

> objectively checkable AND breaking it leaves something WRONG IN THE REPO.

A false blocking verdict costs more than a missed one, so nothing here blocks on
judgment: each rule above is a fact about the diff, the frontmatter, or the git
graph. What changed is that these facts are now actually consulted.

## Consequences

- The first CI run on a `path/*` branch in this repository's history happens on
  CP-OPS-002, which is the path that repairs these gates — the repairs land
  through the protocol they repair rather than around it.
- Sixteen historical closure notes were backfilled with the declaration; no
  grandfather set was added, because the corpus was small enough to correct.
  A grandfather set is a debt with no due date, and this one did not need one.
- The frontmatter reader takes scalar values verbatim to end of line, so
  `ceremony:` and `path:` must carry no inline comment. Stated in bedrock 24 and
  guarded by a test that parses the shipped template itself: the documentation
  is now executable, which is the only durable defence against F13 recurring.
- Adoption elsewhere requires no account and no host configuration: `cairn-init`
  scaffolds tiers 0 and 1, and the tier-2 ruleset ships as a copy-paste payload in
  the operator guide rather than as a click-path anyone must follow.
- Documents that predate the ratified schema (the two Cairn research records,
  the round-3 deliverables) carry a dated banner rather than a silent edit. They
  are records of what was proposed; the banner keeps them from being mistaken
  for instructions.

## Alternatives considered

- **Accept both ceremony forms.** Rejected: it converts a schema into a
  preference and doubles the surface every future reader must know.
- **Keep filename matching as a fallback.** Rejected: the fallback is exactly
  the tautology F2 named, and a rule with a permissive fallback is the rule the
  fallback describes.
- **Make `branch-identity` blocking everywhere.** Rejected: a docs-only build in
  a detached checkout is not wrong, and the fastest way to get a validator
  switched off is a false blocking verdict.
- **Fix `paths.md` to name three files.** Rejected — see decision 5. The count
  was never the invariant.

## Migration / rollback

No migration. The sixteen closure notes were backfilled when F2 was repaired;
the three schema-drifted documents are corrected in place with dated banners.
Rollback would mean re-admitting gates that certify false statements, which is
the condition this ADR exists to end.

## Links

- Audit record: [`docs/cairn/cairn-audit-2026-08-24.md`](../cairn/cairn-audit-2026-08-24.md)
- Opening check: [`atomik-project/sessions/2026-08-24-cp-ops-002-opening-check.md`](../../atomik-project/sessions/2026-08-24-cp-ops-002-opening-check.md)
- Path: [`atomik-project/coding-paths/CP-OPS-002/index.md`](../../atomik-project/coding-paths/CP-OPS-002/index.md)
- Ceremony schema: [`docs/bedrock/24_24-doc-templates.md`](../bedrock/24_24-doc-templates.md#session-note-and-ceremony-template)
- Convention: [`atomik-project/coding-paths/paths.md`](../../atomik-project/coding-paths/paths.md)
- Amends: [`ADR-012`](./ADR-012-parallel-paths-self-merge.md)
- Sequel: `ADR-017` (path lifecycle) lands at CP-OPS-002 S07a
