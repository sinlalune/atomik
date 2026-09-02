---
type: Atomik Brief
title: Cairn round 4 — correction pass on the round-3 deliverables
description: Four verified defects in the round-3 record, plus one generator bug and one test to make the generator's anti-staleness property permanent. A correction pass, not a rewrite.
tags: [cairn, brief, round-4, corrections, specification, init-kit]
timestamp: 2026-08-24T00:00:00Z
---

# Round 4 — correction pass

[Round 3](./cairn-protocol-round-3.md) delivered. This is a short correction pass on it,
not another round of research.

**Do not restructure, renumber, or re-audit anything.** D1–D4 keep their shape. Fix the
five items below, in place, and stop.

---

## 0. What round 3 got right — so you keep doing it

Stated plainly, because it is the difference between this round and the last two.

- **The generator is real, and it works.** Verified empirically, not by reading it: a fake
  rule injected into a copy of `cairn-check.mjs` appears in the output as
  `| **Blocking** | \`invented-rule\` | diff | TBD | \`TBD\` |`. Extracting names, levels and
  scopes from source while keeping prose in `RULE_METADATA` with a visible `TBD` fallback is
  the correct split — the part that goes stale cannot, and an undocumented rule announces
  itself. Keep that design.
- **The published rule table matches the live inventory exactly** — 9 blocking rows, 8
  advisory, with `branch-identity` and `registration` correctly appearing at both levels.
- **D1's two defects are fixed**: `git merge --no-ff` matches the real history, and the
  worktree sequence is complete.
- **§5 "What could not be verified" is the section that separates this document from
  round 2.** Keep it, and extend it if this pass creates new uncertainty.

---

## 1. C10 — the portability seam silently drops coverage *(fix this first)*

D4 §4.2's `cairn.config.json` is meant to *replace* what `cairn-check.mjs` hardcodes. It
replaces two constants with shorter lists, which does not de-hardcode them — it switches
the corresponding rules off in every repository generated from the kit.

```bash
grep -A8 "export const SINGLE_TRUTH" tools/cairn-check.mjs
grep -A9 "export const AREA_MAP"     tools/cairn-check.mjs
```

| Constant | In code | In D4 | Silently dropped |
| :-- | --: | --: | :-- |
| `SINGLE_TRUTH` | 6 | 4 | `docs/learning/index.md`, `docs/diagrams/index.md` |
| `AREA_MAP` | 6 | 4 | `sources`, `vault` |

The two missing area patterns are the two longest ones, which is probably why they were
lost — they are also the two covering the source subsystems most likely to change:

```js
[/^apps\/desktop\/(electron-main\/(capture|pdf|web|transcription|whisper|ocr|mistral-ocr|scan-filter|reader-worker)|renderer\/src\/(source|web|import)\/)/, 'sources'],
[/^apps\/desktop\/(shared\/retrieval-core|electron-main\/(vault|search|retrieval|project|folder-index)|renderer\/src\/(vault|project)\/)/, 'vault'],
```

Restore all six of each. Then state the general rule in D4 itself: **a config seam must be
lossless against the constant it replaces, and that equivalence is checkable** — a
follow-up may assert it in a test, but at minimum the document must not present a lossy
list as a faithful extraction.

## 2. C11 — the proof block contradicts the claim it is cited for

§6 is headed "Real Validation Gate Execution" and pastes **40 tests**. The suite has 43:

```bash
npm run cairn-check:test | grep -E "^ℹ (tests|pass|fail)"
# ℹ tests 43   ℹ pass 43   ℹ fail 0
```

The three missing ones are exactly the F9 regression tests:

```
✔ the frontmatter terminator is not a write surface
✔ a writes: list survives the trailing comment the template shows
✔ no writes: block, or no frontmatter, declares nothing
```

And **C4 cites `npm run cairn-check:test` as confirming "frontmatter scoping and trailing
comment tolerance"** — a test that does not appear in the output pasted as its proof. The
evidence block refutes the row that cites it.

Re-run both gates at write time and paste the real output, or delete §6. A stale proof
block is worse than no proof block, because it invites the reader to stop checking.

Also update the `cairn-check` line: the changed-file count moves as files are added, so
report whatever it actually prints when you run it.

## 3. C12 — the lexicon's headline term cites a file that never mentions it

D3's discipline is "every definition cites its enforcing file". Its first row defines
**Cairn** and cites `docs/bedrock/00_00-orientation.md`:

```bash
grep -c -i "cairn" docs/bedrock/00_00-orientation.md   # 0
```

Zero. And the obvious second candidate is no better:

```bash
grep -c -i "cairn" docs/bedrock/35_35-coding-path-execution-state.md   # 0
grep -c -i "cairn" atomik-project/coding-paths/paths.md                # 14
grep -c -i "cairn" docs/bedrock/22_22-agent-handoff.md                 # 2
```

The honest finding underneath this: **the protocol's own name has no canonical definition
anywhere in the repository.** It is used 14 times in `paths.md` and never defined there
either. So do not hunt for a citation to patch the row with — record the gap, and let the
specification (D2) be the place the term is *defined* for the first time, with D3 citing
D2. Mark it explicitly as a definition this document introduces rather than one it reports.

Re-check every other lexicon row the same way before trusting it — `grep -c -i` on each
cited file, and fix or re-mark any that come back 0.

## 4. C13 — D2 is a rule catalog, not yet a specification

D2 has the ontology, the generated rule table, and three properties. All correct. What a
specification needs and this does not have is the **path lifecycle**:

- The status vocabulary and what each value means:
  `draft | running | done | blocked | archived` — and `active`, which §2.3 already
  correctly flags as dead.
- Which transitions are legal, what each one *requires*, and which are terminal.
  `running` requires `branch` + `base_commit`; `done` requires a closing ceremony; the
  others carry no branch obligation. That is already enforced in
  `pathFrontmatterErrors()` and the `ceremony` rule — read it out of the code.
- What has **no** terminal transition today. `paths.md` §"Holes still open" records it as
  an open question: *"What is the minimal path status lifecycle beyond `running` /
  `done`?"* and *"Abandoned paths have no terminal status."* The specification is where
  that gets an answer or an explicit deferral — not silence.

A state diagram is welcome. An honest "this transition is undefined" is more valuable than
a tidy diagram that invents one.

## 5. C14 — the generator emits a table that breaks Markdown

`tools/cairn-rules.mjs` emits `remote-checkpoint`'s enforcing cell containing a raw pipe:

```bash
node tools/cairn-rules.mjs | grep remote-checkpoint
# ... `pathRemoteCheckpoint(branch).state === 'missing' | 'unpushed'` |
```

An unescaped `|` inside a table cell ends the cell. The published table in round 3 has it
escaped as `\|`, which means the output was hand-corrected after generation — so "generated
directly from the live validation engine" is currently one manual step short of true.

Fix it in the generator (escape `|` in emitted cells), not in the document. Then the claim
becomes true and stays true.

### And make the property permanent

Add `tools/cairn-rules.test.mjs` asserting what I verified by hand:

1. A rule name present in `cairn-check.mjs` but absent from `RULE_METADATA` is emitted with
   `TBD`, not dropped.
2. A rule removed from the source disappears from the table.
3. Emitted cells contain no unescaped `|`.

Node's own test runner, no dependencies, same as the rest of `tools/`. This converts a
one-off manual probe into a guard — which is the entire argument of the audit these
documents exist to serve.

---

## 6. Output

**Edit [`cairn-protocol-round-3.md`](./cairn-protocol-round-3.md) in place.** Do not create
a `round-4` document — the `docs/cairn/` corpus is already six files for one milestone, and
F4/F5 in the audit record are about exactly this kind of growth.

- Bump its version to `2.0.1-PROD-DRAFT`.
- Add rows **C10–C14** to the existing corrections register, in the same format, each with
  its reproduction command.
- Apply the fixes in D1–D4 where they belong.
- Extend §5 if this pass leaves anything unverified.

Touch only: `docs/cairn/cairn-protocol-round-3.md`, `tools/cairn-rules.mjs`, and a new
`tools/cairn-rules.test.mjs`.

Nothing is committed and `CP-OPS-002` is still not open — that is deliberate. Do not
commit, branch, register a path, or create a worktree.

Then run both gates and report their real output:

```bash
npm run cairn-check
npm run cairn-check:test
```
