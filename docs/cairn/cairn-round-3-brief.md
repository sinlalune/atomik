---
type: Atomik Brief
title: Cairn round 3 — brief for the research agent
description: Correct the round-2 record against the repository's current state, then produce the four milestone deliverables as drafts, under a verify-before-you-write discipline.
tags: [cairn, brief, research, round-3, specification, lexicon, init-kit]
timestamp: 2026-08-24T00:00:00Z
---

# Round 3 — brief for the research agent

You produced [round 1](./cairn-protocol-research-and-diagnostic.md) and
[round 2](./cairn-protocol-research-and-diagnostic-round-2.md) against the brief in
[cairn.md](./cairn.md). Round 2 was a real improvement: the invented token numbers are
gone, the plane ontology is right, `workflow.html` is correctly cleared, and the rule
count is right. This round is not another audit. **The audit is finished.** This round
turns it into the four artifacts the milestone actually needs.

Read this whole brief before opening any other file.

---

## 1. Authority order — read this first

Round 2 was written against a snapshot of the repository that no longer exists. Several
of its statements were true when written and are false now.

```text
1. the repository itself          — always wins, always verify against it
2. docs/cairn/cairn-audit-2026-08-24.md   — the CURRENT audit record (F1–F11)
3. atomik-project/coding-paths/CP-OPS-002/index.md — the CURRENT roadmap
4. round 2                        — a superseded outline; harvest its shape, not its claims
```

**Do not edit, overwrite, or "merge into" the audit record or CP-OPS-002.** If you believe
either is wrong, say so in your output with the command that proves it. That is welcome —
see §3.

## 2. What has already been fixed — do not re-prescribe it

Round 2 presents F1, F2 and F3 as open and offers remedies. Four findings have since been
repaired in the working tree, with regression tests. Treat them as done:

| Finding | State | What changed |
| :-- | :-- | :-- |
| **F1** rebase gate dead in CI | **repaired** | `resolveBranch()` asks the host before the checkout; new `branch-identity` rule fails closed; `cairn.yml` checks out the PR head sha instead of the merge preview |
| **F2** ceremony gate tautology | **repaired** | ceremonies declared as `path:` + `ceremony: closing` frontmatter, exact id match; 16 closure notes backfilled |
| **F8** CI never ran on a path branch | **repaired** | `push` now includes `'path/**'`, with a `concurrency` group; **round 2 does not contain this finding at all** |
| **F9** `writes:` parsed from the document | **repaired** | `parseWrites()` scoped to frontmatter; tolerates the trailing comment the bedrock 24 template itself uses |
| **F3** visibility hole | **owner-ruled, closed** | drains itself when CP-MVP-011/012 land under CP-OPS-001. No repair opened. |
| **F4** ledger size | **re-framed, downgraded to Medium** | see §3.1 — this one matters |

Everything above is **uncommitted in the working tree** and **CP-OPS-002 is not open**.
Do not commit, do not branch, do not register a path, do not run `git worktree add`.
The owner is holding registration deliberately until the change set settles.

## 3. Three corrections to make in your own record

### 3.1 F4 — the framing you restored was withdrawn on purpose

Round 2 §2.2 calls F4 *"The Ledger Context Bottleneck (Severity: High)"* and its flowchart
says *"Surpassed frozen log.md"*. That framing — `log.md` was frozen because it had become
a context bottleneck, and the ledger is the same problem returning — **is wrong, and the
owner corrected it by hand.**

`atomik-project/coding-paths/paths.md` states the real reason under *"Nothing is shared, so
nothing needs a gatekeeper"*: the journal became one file per entry so that **two paths
writing it at once stop colliding**. It was a concurrency decision and it succeeded.

The size measurement is still true and still worth acting on. It is simply not a
recurrence of anything. Severity is **Medium**, framed as *"the path ledger has no size
boundary"*. Restore that framing wherever round 2 carries the old one.

### 3.2 `ledger-size` does not exist

Round 2 §3.1 is titled "The Mechanical Rule Catalog (`cairn-check.mjs`)" and lists
`ledger-size` as a rule with enforcing logic `statSync(file).size < 15000`.

```bash
grep -c "ledger-size" tools/cairn-check.mjs   # 0
```

It is a *proposal* in CP-OPS-002 S04. A catalog of implemented rules must contain only
implemented rules; proposals belong in a separate, clearly labelled column or section.

### 3.3 §3.1 contradicts §2.1

§3.1 describes `ceremony` as `hasClosingCeremony(pathId) (Frontmatter-based)` — the
repaired behaviour — while §2.1 presents F2 as an open tautology. Pick the state that the
repository is actually in and state it once.

---

## 4. The discipline for this round

These are the rules that separated the two rounds from the audit record, and they are not
negotiable this time.

1. **Every factual claim is produced by a command you ran.** Put the command and its real
   output in the record. If you cannot reproduce it, do not write it.
2. **Never transcribe from documentation into a table of implemented behaviour.** Rule
   names, counts, statuses, file lists: read them out of the code or the filesystem.
   `AGENTS.md` and `paths.md` both say "8 blocking / 5 advisory" and both are stale.
3. **Record non-findings.** Things you checked that were fine are part of the result.
4. **Never invent an identifier that implies something exists** — no schema URLs on
   domains that do not resolve (round 2 §7 uses
   `https://cairn-protocol.org/schema/v2/config.json`), no rule names, no file paths, no
   npm packages. If it is aspirational, label it aspirational in the same sentence.
5. **Verify this brief too.** Everything in §2 and §3 is a claim about the repository. Run
   the commands. If I am wrong about something, say so — that is a better outcome than
   agreement.
6. **You are not re-auditing.** Do not renumber, re-derive, or restate F1–F11. Cite them.

---

## 5. The four deliverables

Write drafts. They are drafting input for CP-OPS-002 S07 and S08, which the owner will
open as a coding path later; nothing you write lands on the trunk in this session.

### D1 — Corrected operator guide

Round 2 §5 is the right skeleton and the wrong details. Rebuild it from
`atomik-project/coding-paths/paths.md`, which is the operating source of truth, and fix at
minimum:

- **Merge style.** Round 2 says `git merge --ff-only path/cp-id`. Every merge in this
  repository is a merge commit:
  ```bash
  git rev-list --parents -n1 7aa3b1d | wc -w    # 3 = merge commit, not fast-forward
  ```
  `--ff-only` would erase the `Merge CP-*` commit that the closing ceremony and the
  worktree-cleanup sequence both reference.
- **Worktree removal.** Round 2 gives a bare `git worktree remove`. `paths.md`
  §"Cleanup is the final local transition" mandates a sequence: verify the merge is on the
  remote trunk, verify the exact secondary worktree is Git-clean, remove **without**
  `--force` from another checkout, verify absence, and never touch the main worktree or
  the retained branch. Reproduce it fully — this is the part operators copy.
- **CI reality.** State plainly when CI runs and what it can and cannot prevent, including
  the F8 residual: a local `git merge` still bypasses CI, so the gate is positional, not
  structural, until the owner chooses branch protection or a PR convention.

Write it for someone who does not already know Cairn. `paths.md` is excellent and assumes
you do.

### D2 — Specification with a GENERATED rule table

`docs/cairn/specification.md`. Round 2 §3.1's four-column shape (rule · level · condition ·
enforcing logic) is right — but a hand-written table is how the count went stale in the
first place.

Write `tools/cairn-rules.mjs` that reads `tools/cairn-check.mjs` and emits the table, then
embed its output. Verify against the live inventory:

```bash
grep -oE "add\('(blocking|advisory)', '[a-z-]+'" tools/cairn-check.mjs | sort -u
grep -oE "rule: '[a-z-]+'" tools/cairn-check.mjs | sort -u
```

Note that the corpus-level rules (`schema`, `links`, `derived-view`, `coherence-audit`)
are emitted from `corpusFindings()`, not `evaluate()`, so a generator must read both. The
inventory has changed since round 2 — `branch-identity` is new and appears at both levels.

The specification must also state, as *properties* rather than omissions: the F8 residual,
the CP-MVP-011/012 migration window, and `active` as dead status vocabulary (F11 —
accepted by `schema`, rejected by `branch-path`, reserved for a path that has closed).

### D3 — Lexicon tied to enforcement

`docs/cairn/lexicon.md`. One definition per term, each naming the file **and rule** that
enforces it. Round 2's lexicon is close; extend the discipline: any term with no enforcing
file is labelled **aspirational** in the definition itself. A reader must be able to tell
what Cairn *guarantees* from what it *recommends* — the distinction the audit exists
because of.

### D4 — Bootstrap prompt and init kit, with F8 propagated

Round 2 §6 and §7. Both inherit the pre-F8 workflow: its scaffolded `cairn.yml` would ship
the trigger gap to every future project, and its guide tells operators to push after every
commit without saying that nothing will validate it. Fix that, and:

- Base the config seam on round 2 §7's `cairn.config.json` shape, minus the invented
  `$schema` URL. It must replace what `tools/cairn-check.mjs` currently hardcodes:
  `atomik-project/`, `apps/`, `AREA_MAP`, `SINGLE_TRUTH`, the trunk name, and
  `LEGACY_UNREGISTERED_PATHS`.
- The bootstrap prompt must produce a repository whose **first** path is opened correctly:
  opening check → registration-only trunk commit → worktree from that commit. Registration
  ordering is the one rule that cannot be repaired after the fact, and it is the rule new
  projects will get wrong.
- Say which bedrock pages are the irreducible seed and why. Round 1 and round 2 both list
  five or six without justifying the cut.

---

## 6. Output

One document: `docs/cairn/cairn-protocol-round-3.md`, with D1–D4 as sections. Do not
modify any other file except a new `tools/cairn-rules.mjs` if you write the generator.

Open with a short **corrections register** — what round 2 said, what is actually true, and
the command that shows it. Include any place where this brief turns out to be wrong.

Close with **what you could not verify**, explicitly. An honest gap is worth more than a
confident sentence, and both previous rounds would have been better documents with that
section in them.

Then run, and report the real output:

```bash
npm run cairn-check
npm run cairn-check:test
```
