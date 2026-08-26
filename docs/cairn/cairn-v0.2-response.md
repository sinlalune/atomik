# Response to the Cairn v0.2 review

Branch `path/cp-ops-002` · 2026-08-26 · spec at `docs/cairn/specification/index.md` (v0.2 canonical)

All nineteen items are resolved in normative text; none is listed as a non-goal.
The brief said **spec text only, no checker implementation** — that was honoured
in the revision commit (`d1f3830`), which shipped fourteen conformance rows
marked `not implemented`. The checker rules came afterwards as a separate
instruction, in four commits. The two columns below are kept apart so it stays
visible which claims rest on prose and which rest on a predicate.

## Summary

| Measure | Before | After |
| :-- | :-- | :-- |
| Review items resolved | — | 19 / 19, plus the origin gap |
| Blocking checker rules | 14 | 26 |
| Advisory checker rules | 10 | 14 |
| Conformance rows (implemented / partial / not) | 6 / 1 / 8 of 15 | 13 / 9 / 8 of 30 |
| Concept articles | 65 (41 Cairn / 24 borrowed) | 66 (45 Cairn / 21 borrowed) |
| Test suite | 118 | 184 (checker 76 → 135) |

Status vocabulary: **Enforced** = normative text plus a working predicate ·
**Partial** = text complete, predicate covers part, gap named below ·
**By design** = deliberately no predicate.

## P0 — broken promises

| # | Item | Status | What shipped | Enforced by |
| :-- | :-- | :-- | :-- | :-- |
| 1 | Checkpoint retention | Partial | Retention required under `refs/cairn/checkpoints/<id>/<n>` before any rewriting push, or forbid rewriting pushes | `checkpoint-retention` |
| 2 | Provisional commits | Enforced | Pushed, marked `Cairn-Provisional:`, excluded from candidate identity, folded before `C` | `provisional` |
| 3 | Handoff brief section | Partial | Nine frontmatter fields, seven capped sections, 1200-token budget, pinned `governs`, answerable-alone contract, cold resume as the pilot's primary metric | `brief-schema` |

Limits:

- **1** — a validator that sees one commit cannot observe a ref *moving*, only
  the orphan a move leaves behind. Remote presence is deliberately unchecked, so
  a restricted runner cannot turn a protocol failure into a protocol pass.
- **2** — the fold is not verified to preserve content.
- **3** — the brief's *shape* is checkable; whether it can actually be resumed
  cold is a judgement and a benchmark, and is never claimed by a checker.

## P1 — records that mean what they claim

| # | Item | Status | What shipped | Enforced by |
| :-- | :-- | :-- | :-- | :-- |
| 4 | Field-level closure surface | Enforced | On `ready`, `A` may move only `status` and `subject_commit`; `done` additionally moves `resolution` in the trunk integration unit | `closure-surface` |
| 5 | Scope digest | Enforced | Resolved `scope_ref` section digested at opening, re-verified at closing | `scope-digest` |
| 6 | Candidate base + drift predicate | Enforced | Closing record names base `T`; acceptance survives while the trunk delta touches nothing in `writes:` ∪ `governs:` | `acceptance-drift` |
| 7 | Structured dispositions | Partial | `{rule, disposition, reason}[]` compared against `advisories_at_candidate`, attested in the closing record and bound to `C` by the audit | `advisory-disposition` |
| 8 | Per-role actor identity | Partial | One actor on both acceptances raises an advisory; roles recorded in the acceptance record | `role-collapse` |
| 9 | `scope-drift` blocking | Enforced | Blocks unless `writes:` moved in the same change | `scope-drift` |

Limits:

- **5** — a path opened before the rule cannot amend its immutable opening
  record. Covered by a named, finite exception set that reports itself as a
  blocking finding once spent (`migration-debt`), rather than a date cutoff or
  forward scoping.
- **6** — path matching is a proxy for semantic overlap, and is stated as one.
- **7** — an advisory that fires only at `C` is attested rather than derived.
  Deriving it needs evaluation replayed at `C`. Any advisory that fires at `A`
  and is missing from the attested set is proved missing, because `A`'s findings
  are a strict subset of `C`'s.
- **8** — `accepted_roles` is recorded and not yet validated.

## P2 — adoption and cost

| # | Item | Status | What shipped | Enforced by |
| :-- | :-- | :-- | :-- | :-- |
| 10 | Lightweight path is the default | Partial | `route: lightweight \| full \| foundation`; `full` required by five named triggers plus a second-unit backstop; escalation one-way | `route` |
| 11 | Typed work units | Partial | Fenced `cairn-unit` block declaring step, ledger ordinal, type, verification | `work-unit` |
| 12 | Repair procedures | By design | Normative section plus a reference page covering nine violations, each a `repair` work unit | — |
| 13 | Redaction ceremony | Partial | Rotate first, immutable redaction record, replace in place in its own commit, history rewrite as a separate unit | `redaction` |

Limits:

- **10** — three triggers are structural and derived. "Policy-designated
  high-risk" stays declared. "Expected to span more than one work unit" is
  unobservable as an expectation, but *having* spanned one is a fact in the
  ledger, so a path declaring more than one `cairn-unit` must be `full` — the
  same trigger one unit late, and not declarable away.
- **11** — `same-work-unit` does not yet key its requirement to the declared
  type. The block declares a **ledger ordinal**, not an object id, because a
  block cannot truthfully name the commit that does not exist while it is being
  written; `refs/cairn/checkpoints/<id>/<unit>` supplies the hash afterwards.
- **12** — no predicate exists to propose. Deliberately spec-only.
- **13** — rotation-first ordering is a procedure, not a predicate.

## P3 — editorial

| # | Item | Status | What shipped | Enforced by |
| :-- | :-- | :-- | :-- | :-- |
| 14 | Hash-algorithm agnostic | Enforced | "Full object id in the repository's configured object format" throughout, and the checker accepts SHA-1 and SHA-256 while refusing every prefix | `isObjectId` |
| 15 | Diagram and table reconciled | Enforced | `ready → blocked` added, `blocked → ready` refused, `archived → archived` removed | `transition` |
| 16 | Git glossary split | Enforced | 21 borrowed terms presented separately from 45 Cairn concepts | — |

Limits:

- **14** — this was originally shipped as spec-only, which was a conformance
  break rather than an editorial gap: a SHA-256 repository conformed to the
  specification and failed the reference tool, so the two disagreed about what a
  valid repository is. The checker now accepts either format.
- **15** — reconciling the table exposed a pre-existing defect: an unchanged
  `done → archived (completed)` record failed the "unintegrated paths archive as
  abandoned or superseded" rule on every run after the archiving one.
- **16** — no article was added to achieve the split, as required. It is
  structural.

## Origin gap — foundation paths

| # | Item | Status | What shipped | Enforced by |
| :-- | :-- | :-- | :-- | :-- |
| 17 | Foundation path | Partial | Write surface `docs/**` plus draft path records; documents as work units; verification by `links` + `schema` + coherence audit; deliverable is foundational text plus a roadmap of `draft` path records | `route` |
| 18 | Adoption variant | By design | A foundation path whose work units back-document existing modules, giving a brownfield repository a legal entry point | — |

Governing documents pin **blob** object ids (`git rev-parse HEAD:<path>`), not
commit ids — a commit id changes whenever anything else in the repository does,
so a `governs:` list pinned to commits would go stale while the documents it
names sat untouched. This is also what makes the scope digests of item 5 cheap.

## Prohibitions

| Prohibition | Held? | Evidence |
| :-- | :-- | :-- |
| No `remote_trunk == T` at integration | Yes | Rejected by name in the normative text with the livelock reason, and pinned by a test: a 200-file trunk delta touching nothing declared raises no finding |
| Do not ship P1 alone | Yes | The lightweight default landed in the same revision as the nine tightenings |
| Do not implement checker rules in this pass | Yes, then lifted | `d1f3830` implemented nothing and marked fourteen rows `not implemented`; the predicates came later as a separate instruction |
| Do not add concepts to solve item 16 | Yes | The split is structural; five articles merged away paid for five added |

## Still not checkable

Named rather than left as a backlog, because naming what cannot be checked is
part of the claim.

- **Repair procedures** — no predicate exists to propose.
- **The answerable-alone contract** — a judgement, measured by cold resume.
- **"Before the push" retention, and ref append-only** — a single-commit
  validator cannot observe a ref moving, only the orphan a move leaves behind.
- **Live-ledger prefix and verbatim-roll proof** — pre-existing; awaits explicit
  ledger markers.
- **Portable configuration, protected transport, independent control-plane
  protection, transaction commands, the emergency route, the cost pilot** —
  pre-existing rows, unchanged by this revision.

## Deviations from the brief, stated plainly

1. **Concept count grew, and surface area grew with it.** 65 → 66 overall:
   inside the cap of 66, but +1 rather than 0. Classifying v0.1's articles under
   the same taxonomy gives **41 Cairn / 24 borrowed**, against **45 Cairn / 21
   borrowed** now — so Cairn's own surface area went **up four**, and only the
   borrowed glossary shrank. The brief's "~25 real ideas" was an estimate; the
   split revealed the real number rather than reducing it. If the cap was aimed
   at Cairn-specific surface area, v0.2 misses it by four and the honest
   remedies are merges, not relabelling.
2. **Checker rules were implemented after the fact.** The brief forbade it for
   that pass and it was honoured there; the work was then explicitly requested
   and landed separately, which is why ten rows moved off `not implemented`.
3. **Three predicates shipped wrong and were corrected after review**: the
   closure surface was more permissive than its own prose, `advisory-disposition`
   was unsound rather than partial, and item 14's checker contradicted its spec.
   All three are fixed; none required a new rule.

## Two protocol violations during the work

Both are recorded in the ledger as `repair` work units with their own ordinals,
and both changed a rule rather than only a record.

1. **A retention ref was force-moved**, orphaning the commit it named. The rule
   written for exactly this case reported OK, because it asked whether every
   *declared unit* resolved a ref rather than whether every *completed commit*
   was retained. Repaired, and `unretainedCheckpoints` now walks the branch
   directly; run against the broken state it named the orphan immediately.
2. **A placeholder was left in a handoff brief**, caught by `brief-schema` on
   the pushed state. It exposed the same self-reference the ledger ordinal
   solves: a brief is refreshed inside the work unit it describes, so it cannot
   name the commit that will contain it. `checkpoint` now names the last
   *retained* checkpoint, with `checkpoint_unit` carrying its ordinal.

## The failure mode both violations share

Named in the specification for whoever implements this next, because it produced
two live violations and the gate reported `OK` for both.

A predicate can ask about a **declaration** — does every unit the ledger names
resolve a ref? does the disposition match what the checker raises right now? — or
about a **fact** — is every commit on this branch retained? was every advisory at
the candidate disposed? The two read almost identically in code and diverge
exactly when something has gone wrong, because a broken state usually leaves the
declarations internally consistent. A moved ref keeps every declared unit
resolving. A closure commit's advisory set stays a tidy subset of the
candidate's.

When a predicate can be written either way, write the one that can disagree with
the record.

## Verification

```bash
npm run cairn-check        # OK, no advisory
npm run cairn-check:test   # 184 subtests
npm run cairn-spec:build   # deterministic; matches the checked-in HTML
npm run typecheck && npm test && npm run build
git for-each-ref refs/cairn/checkpoints
```

Commits, oldest first: `e787174` (S07f, specification project) · `d1f3830`
(S07g, the v0.2 revision — spec only) · `7ffa4d1` (S07h, P0 predicates) ·
`8709579` (S07i, P1 predicates) · `0711bc6` and `8f84024` (S07j, routes and
lifecycle) · `1e29195` (S07k, repair) · `a523afb` (S07l, repair).

`ADR-018` and `ADR-019` are both `proposed`; neither has been accepted. Under
this repository's own `decision-drift` advisory that is a live gap: architecture
moved and the decisions recording it have not landed.

## What v0.3 should be

Not more rules. Rules went 24 → 40 across this work; the cold-resume row still
reads **not run**. The central claim — that a cold participant can resume a path
from files alone — now has a specification, a schema, seven sections, a budget
and a predicate checking its shape, and zero measurements. Meanwhile every rule
added is a thing an agent can fail, and the mechanism meant to hold cost down is
the one that is voluntary.

The next step is twenty cold resumes on real handoffs, with failures classified
by which of the eight answerable-alone questions was unanswerable, and that
result deciding v0.3.
