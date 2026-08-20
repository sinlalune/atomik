---
type: Atomik Path Convention
title: Parallel coding paths — one path per worktree, every path merges itself
description: How several devs or agents work at once without a gatekeeper. Accepted paths register on the trunk, run in parallel in isolated worktrees, and merge themselves after their closing ceremonies.
tags: [paths, concurrency, worktree, self-merge, ci, process]
timestamp: 2026-08-14T00:00:00Z
---

# Parallel coding paths

![The Cairn protocol — full workflow (D14)](../../docs/diagrams/D14_cairn_protocol_workflow.svg)

**Status: ACCEPTED operating detail under ADR-012.** CP-OPS-001 S06 ratified
the model after its first pilot; S08 amends the opening order after real
parallel work exposed the checkout-local visibility hole. Work runs on what is
written here, never on a conversation.

## The model

```text
N coding paths, running at the same time
one path      = one worktree = one branch = one writer
every opening = one registration-only trunk commit BEFORE the branch
each path merges ITSELF into the trunk
no integrator, no parent, no gatekeeper
```

An earlier draft put a single integrator between every lane and the trunk. The
owner rejected it (2026-08-14): *"for me it not possible to have only one
integrator, every workstation or dev should be able to merge into master"* —
and was right for a second reason that only became visible afterwards. The
integrator created two of the four holes the workflow audit had found: nothing
marked a lane integrated, and the gate left no artifact. Both vanish when a
path merges itself, because the path sets its own `status: done` in the very
pull request that lands it, and that pull request with its CI run IS the
artifact.

The lane abstraction is gone with it. Paths were always the unit of bounded
work; making them the unit of parallelism removes a layer instead of adding one.

## Naming

```text
CP-MVP-010     numbered  — roadmap work, one per milestone slice
CP-SETTINGS    labelled  — everything else: fine-tuning, repairs,
CP-PROVIDERS               investigations, spikes
```

Numbered paths come from the roadmap and carry a register row. Labelled paths
are named for their subject and do not claim a milestone. Both are ordinary
accepted paths, and both get both ceremonies — the owner's ruling (2026-08-14):
*"ceremonies are short anyway and the only moment the dev actually work with
[the owner]... better too much evaluation than not enough."*

Branch names follow the path: `path/cp-mvp-010`, `path/cp-settings`.

## Opening a path

Drafting and executing happen in the SAME session. Nobody drafts a path for
someone else to pick up later — the owner's observation, and it removes the
handoff the earlier draft assumed.

1. Run the OPENING CHECK with the owner — feature by feature, recorded in a
   session note. Activation needs explicit acceptance.
2. From a clean, current trunk, create the accepted path file from the template
   in bedrock 24:

```yaml
atomik:
  id: CP-MVP-010
  status: running            # draft | running | done | blocked | archived
  base_commit: 70f7e27
  branch: path/cp-mvp-010    # required by `running`; it is what puts the path
                             # in the generated view and what CI checks against
  writes:                    # ADVISORY — a signal, never a lock
    - apps/desktop/electron-main/graph-index.ts
    - docs/modules/atomik-desktop-graph.md
```

   `base_commit` is the trunk tip immediately BEFORE this registration. Run
   `npm run cairn-active` and `npm run cairn-check`, then land ONLY the accepted
   path declaration and regenerated view on the trunk (directly or through the
   host's required short PR). No product code enters this commit. This tiny
   serialized transition is the price of a durable global portfolio: every
   workstation and CI can now see the path before its branch diverges.

   **Status vocabulary.** `running` means "registered on the trunk, then on its
   own branch and worktree" and requires `branch` + `base_commit`. That tuple is
   what the generated view and CI key on. `active` is reserved for the one
   bootstrap-exception path that began on the trunk before this convention
   existed (CP-OPS-001); no new path uses it. `done` requires a ceremony session
   note. `draft`, `blocked` and `archived` carry no branch obligations.

3. Create the worktree FROM THE REGISTRATION COMMIT and its runtime isolation
   (below). Cairn blocks a new `path/*` branch when its matching `running`
   declaration is absent from the trunk. CP-OPS-001, CP-MVP-011 and CP-MVP-012
   are the finite grandfathered set because they were already running when the
   defect was found; the exemption is named in code and is never copied.
4. Execute bedrock 22's protocol one step at a time — code, tests, docs and the
   ledger in the same work unit.

### Why registration is a commit, not more guidance

`cairn-active` reads files in ONE checkout. Before this rule, a new path file
was first committed on its own branch. The trunk and every sibling branch were
therefore unable to see it; on 2026-08-20 the generated trunk view passed its
freshness check while saying no path was running, although four clean worktrees
declared `status: running`. The view was internally current and globally false.

No instruction can make one Git tree read files that exist only in unrelated
trees. Registration changes where the stable identity tuple lives; derivation
then works as designed. The evolving ledger remains branch-owned.

### `writes:` is advisory

An overlap SIGNAL when the path opens, and a diff-versus-declaration CHECK
before merge. Never a lock. A root cause is discovered, not declared: S07b was
reported as "pills show file names" and fixed in `firstHeadingOf`, rewriting
the strip, the relation sentences and the wikilink candidates in one edit. A
path that must widen records the widening in its ledger and keeps going.

**Declare documentation surfaces too** — they are the ones that actually collide.

## One writer per working tree

A shared working tree has exactly ONE writer. Others may read, diagnose, review
and report there, but simultaneous edits in one filesystem are not made safe by
Markdown.

The owner dogfoods the trunk in the main working tree, so **every code path
takes its own worktree**:

```bash
git worktree add ../4tom1k-cp-mvp-010 -b path/cp-mvp-010 master
cd ../4tom1k-cp-mvp-010
ln -s ../4tom1k/node_modules node_modules
ln -s ../4tom1k/apps/desktop/node_modules apps/desktop/node_modules
```

Branch from local `master`, never `origin/master` when the local branch is
ahead. Run the app with `ATOMIK_LANE=<slug> ATOMIK_LANE_PORT=<port> npm run dev`
so two instances never share one Electron profile (`electron-main/lane.ts`).

## Merging — every path merges itself

```text
1  CLOSING CEREMONY — the owner accepts the work, recorded in a session note
2  REBASE on the trunk — enforced, not remembered (below)
3  CI GREEN on the rebased result, never on a stale branch
4  COHERENCE AUDIT — recorded, advisory (below)
5  the path sets its own status: done, and merges
```

Step 2 is what makes a gatekeeper unnecessary. Requiring the branch to contain
the trunk tip serializes the MERGE — thirty seconds — without serializing the
WORK. Two paths run for two days in parallel and still land safely, because
whoever merges second rebases and re-runs CI. There is no queue of people, only
a queue of merges.

### The rebase gate is automated

Owner directive (2026-08-14): *"the rebase need should be an automated gate"*.
`cairn-check` fails when a `path/*` branch does not contain the current trunk
tip. Objective, no judgment, one command to fix — the shape a blocking rule
should have. Configure the host to require it too (GitHub: "require branches to
be up to date before merging") so the rule holds even if someone merges from
the web UI.

### The coherence audit is automated, its verdict is not

Owner directive: *"it could be an automated audit from agent after each rebase
or merge"*. Removing the integrator removes the person who noticed two paths
drifting apart architecturally, so the noticing is delegated to an agent —
without letting a non-deterministic judgment block a merge:

```text
the AGENT produces the judgment     — reads the rebased diff against bedrock,
                                      the ADRs, and the path's declared coverage
CI checks only that it EXISTS       — a deterministic gate on a
                                      non-deterministic activity
its verdict never blocks            — findings are advisory, read by a human
```

`npm run cairn-audit` scaffolds the record; the agent fills it in. One file per
audit under `atomik-project/audits/`, so two paths auditing at once never
conflict.

## Nothing is shared, so nothing needs a gatekeeper

The integrator's real job was writing the files everyone touched. With no
integrator, those files must stop being shared at all — the same move the lane
list already made, applied everywhere:

```text
ACTIVE.md              GENERATED from the path files (npm run cairn-active)
register status        GENERATED from the same source
root module note       an index over the per-area notes
the journal            ONE FILE PER ENTRY under atomik-project/log/
                       — two paths writing two files never conflict
```

`atomik-project/log.md` is FROZEN as the historical archive (its ~300 entries
are not migrated; rewriting history to fit a new convention would be worse than
the convention). New entries land as `log/YYYY-MM-DD-<path-id>.md`.

What remains genuinely hand-written — bedrock pages, ADRs, per-area module
notes, each path's own file — is per-file by construction, so two paths editing
different ones never meet.

The stable part of each path file is GLOBAL before work starts: its accepted
`id` / `status` / `branch` / `base_commit` tuple is registered on the trunk.
The path branch then owns the evolving checklist and Work Ledger. Without that
ordering, `ACTIVE.md` is only a projection of whichever branches happen to be
ancestors of the current checkout — not a portfolio view.

### Hot files that still conflict

`apps/desktop/electron-main/index.ts` (~1900 lines) and
`shared/ipc-contract.ts` (~870): every path adding an IPC channel touches both.
Frequent conflicts, MECHANICAL resolution (two paths appending distinct
channels). Rebase early and often; do not paper over it with bookkeeping.

## Enforcement — `cairn-check`

```bash
npm run cairn-check                            # the working tree
npm run cairn-check -- --base origin/master    # a branch, as CI sees it
npm run cairn-check:test                       # the validator's own tests
```

```text
BLOCKING   branch → path (a path/* branch is declared by a running path
                          carrying a base_commit)
           trunk registration — that accepted running declaration already
                          exists on the trunk before implementation starts
           rebase gate — a path branch contains the trunk tip
           a path marked done has a closing-ceremony session note
           source changed ⇒ a module note AND a coding path changed
           path frontmatter parses, statuses in vocabulary
           relative links in docs/ and atomik-project/ resolve
           derived views current (trunk only)

ADVISORY   coherence audit missing for this head
           scope drift vs declared writes:
           area note untouched while its source changed
           bedrock changed with no ADR beside it
```

**The test a rule must pass to block:**

```text
objectively checkable   AND   breaking it leaves something WRONG IN THE REPO
                              — not merely unconventional
```

Undocumented code is wrong. A journal entry written by the path that did the
work is unconventional. Only the first fails a build. The journal rule was
briefly blocking and was retracted when it failed this test.

Advisory findings print and never fail the build. A validator that blocks on
judgment calls gets switched off within a week — and the first run of this one
reported 34 broken links that were not broken (bedrock pages illustrating a
vault layout inside code fences). **A false blocking verdict costs more than a
missed one.**

CI runs it as a job SEPARATE from the gates, because "does the software work"
and "was the protocol followed" are two different questions and a team needs to
see which one failed (`.github/workflows/cairn.yml`).

## Owner feedback preempts

```text
owner uses the trunk
  -> reports friction
  -> pin the exact commit + vault/artifact/configuration
  -> open a short LABELLED path
  -> reproduce, add a regression test
  -> integrate as soon as its gates are green
  -> longer paths rebase onto it at their next step boundary
```

This ratifies what the repository already did: S06b, S07b and S07c all preceded
S08.

## Holes still open

The workflow audit (drawing D14) found four missing guards. Self-merge closed
two of them by construction. Checkpoint drift was discovered later, so three
open holes are recorded here:

1. **Abandoned paths have no terminal status.** A path that dies keeps
   `status: running` and poisons the generated views. Needs an `archived`
   transition and something that notices staleness.
2. **`base_commit` accuracy is unchecked** — presence is verified, truth is not.
   Partly mitigated by the rebase gate, which checks the branch against the
   trunk directly rather than trusting the recorded base.
3. **Checkpoint accuracy is unchecked.** The validator verifies that a path file
   CHANGED when source changed; it cannot tell whether the checkpoint inside it
   is still true. Found the honest way, on 2026-08-15: CP-OPS-001's own
   checkpoint still described step zero in lane vocabulary five steps after the
   lane layer was removed. The rule the protocol most depends on is the one it
   cannot mechanically defend, because "is this prose still accurate?" is not a
   checkable question. Candidate mitigation, no more than that: require the
   checkpoint's `base commit` line to match the branch's actual base.

Closed by CP-OPS-001 S08 (2026-08-20): **running-path visibility**. Deriving
`ACTIVE.md` from path files did not help when the files existed only on sibling
branches. The accepted declaration now lands on the trunk before branching,
and a new blocking rule checks that fact. Guidance alone could not repair a
missing Git ancestor.

## Questions still open after the pilot

- What is the minimal path status lifecycle beyond `running` / `done`?
- How precise must a declared write surface be before it stops being useful?
- Should an investigation path be an accepted path even when its output is
  intentionally disposable?
- Does the coherence audit find anything a human would not have? If it does not
  after the pilot, delete it rather than keep it as decoration.
