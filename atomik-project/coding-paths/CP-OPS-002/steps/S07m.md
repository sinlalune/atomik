---
type: Atomik Coding Path History
title: 'CP-OPS-002 S07m — Review round two: two unsound predicates and a fabricated figure'
timestamp: 2026-08-31T00:00:00Z
atomik:
  path: CP-OPS-002
  step: S07m
---

# CP-OPS-002 S07m

Rolled verbatim from the live ledger when `ledger-size` fired at S07t. The move
is cut-and-paste, never a summary: the record below reads exactly as it did in
`CP-OPS-002.md`.

### S07m — Review round two: two unsound predicates and a fabricated figure — **COMPLETE**

```cairn-unit
step: S07m
unit: 09
type: implementation
verified: cairn-check, cairn-check:test, typecheck, test, build
```

The reviewer checked the response against the generated specification rather than taking it
at its word, and found four things. Three were defects in this work; one was a compliment
that does not survive counting.

- **`closure-surface` was more permissive than the prose it enforces.** The rule allowed
  `current_step` and `resolution` on any closure. `resolution` at closure is incoherent —
  a `ready` path has resolved nothing — and neither field appears in the normative list.
  The surface is now scoped by the fact being recorded: `ready` may move `status` and
  `subject_commit`; `done` additionally moves `resolution`, because that is the trunk
  integration unit. This was the exact seam the document claims to track, and the predicate
  was on the wrong side of it.
- **`advisory-disposition` was unsound, not merely partial.** It compared dispositions
  against the advisories raised while evaluating `A` — and `A` is field-restricted by
  construction, so its advisory set is a strict SUBSET of `C`'s. The rule could pass while
  an advisory raised at the candidate went undisposed, which is the failure the requirement
  exists to prevent. The closing record now **attests** `advisories_at_candidate`, bound to
  `C` by the audit's subject; dispositions must cover that set exactly, and any advisory
  that fires at `A` and is missing from it proves the attestation incomplete. An advisory
  firing only at `C` remains attested rather than derived, and the matrix says so.
- **Item 14 was conformance-breaking, not editorial.** The text disowned "forty hexadecimal
  characters" while the checker matched `[0-9a-f]{40}` in five places, so a SHA-256
  repository conformed to the specification and failed the reference tool — the tool and the
  spec disagreeing about what a valid repository is. `isObjectId` now accepts either format
  and refuses every prefix; `isCommitPin` widens to 64.
- **`route` gained a structural backstop.** Two of five triggers are self-declared, whose
  honest failure mode is that everything declares itself lightweight and no rule ever fires.
  *Expected* to span more than one work unit is unobservable; **having** spanned one is a
  fact in the ledger. A path whose ledger declares more than one `cairn-unit` must be
  `full`. It is the same trigger one unit late, and it cannot be declared away.
- **A fabricated figure, removed.** The response document reported v0.1 conformance as
  `9 / 0 / 21`. The real count is `6 / 1 / 8` across 15 rows — v0.1 shipped fifteen rows and
  at least one partial, so zero partials was impossible on its face. The number was not
  mis-transcribed; it was invented. It is now generated from the v0.1 table rather than
  asserted.
- **A compliment declined.** The reviewer read the split as surface area falling —
  "45 Cairn concepts, down from ~55". Classifying v0.1's 65 articles under the same
  taxonomy gives **41 Cairn and 24 borrowed**, so Cairn concepts went **41 → 45, up four**,
  while borrowed fell 24 → 21. The brief's "~25 real ideas" was an estimate; the split
  revealed the real number rather than reducing it. Accepting a flattering figure that
  counting contradicts is the failure this whole path exists to remove.
- **The failure mode both violations share is now named in the specification**, in a section
  addressed to the next implementer: a predicate can ask about a **declaration** or about a
  **fact**, the two read almost identically, and they diverge exactly when something has
  gone wrong — because a broken state usually leaves the declarations internally consistent.
  A moved ref keeps every declared unit resolving; a closure commit's advisory set stays a
  tidy subset. When a predicate can be written either way, write the one that can disagree
  with the record.
- Nine regression tests; checker suite 129 → 135, full suite 176 → 184. **No new rules** —
  every change corrects or scopes an existing one.
