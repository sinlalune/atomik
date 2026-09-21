---
type: Atomik Coding Path
title: Finish the Cairn 1.1 adoption — one green gate, one specification, one entry chain
description: The 1.1 kit landed its tools and skills; the host stayed on 0.2. Retire the 0.2 shapes the adoption reported and left, repoint the entry chain at the installed release, and put the forked engine on the record.
tags: [cairn, ops, adoption, ci, entry-chain]
timestamp: 2026-09-21T00:00:00Z
atomik:
  id: CP-OPS-003
  route: full            # control plane + decision plane; six units; escalation is one-way
  status: running
  current_step: S01
  base_commit: 37f56a56689388b4fb770e3b9238ab033d0cfb2e
  branch: path/cp-ops-003
  assigned_writer: jubette
  depends_on: []
  subject_commit: null
  resolution: null
  writes:                    # ADVISORY — a signal, never a lock
    - tools/cairn-*.test.mjs
    - tools/cairn-init.mjs
    - tools/cairn-rules.mjs
    - tools/cairn-spec-build.mjs
    - package.json
    - .github/workflows/cairn.yml
    - cairn.config.json
    - AGENTS.md
    - atomik-project/coding-paths/binding.md
    - atomik-project/coding-paths/paths.md
    - atomik-project/coding-paths/CP-OPS-003/**
    - atomik-project/coding-paths/ACTIVE.md
    - atomik-project/coding-paths/index.md
    - atomik-project/{sessions,audits,briefs}/**
    - atomik-project/log/**
    - docs/cairn/**
    - docs/adr/ADR-023-*.md
    - docs/adr/index.md
    - docs/modules/**
    - docs/architecture/**
    - docs/index.md
  governs:                   # declared READ surface, pinned at exact blob ids
    - cairn/README.md@9222c44c421cefb43ef9194613c38df49bcfeaa0
    - cairn.lock.json@b88d566ec71330f27ed17293fa2435b6dab96ba2
    - cairn.config.json@f9ee57906b399bc29d2b2ad5fe90c926abdbe6e6
    - AGENTS.md@a5812d5d58011fd45fff8436df2604ef5464c620
    - atomik-project/coding-paths/binding.md@1cd0b0a4cfd02a9441bbbc7b1ad09399ce017cb9
    - .github/workflows/cairn.yml@68822f13eab331d0c78f80ffe0e6c0dcbecefebe
    - docs/adr/ADR-019-cairn-v0-2-revision.md@5029a02022de5a090007457b944cb7bc03f39a6e
    - docs/adr/ADR-020-protocol-context-weight.md@28ded34587b644441b6dc188314c171854cd1bb5
---

# CP-OPS-003 — Finish the Cairn 1.1 adoption

## Goal

Atomik carries the Cairn 1.1 kit and a 0.2 host. `37f56a5` installed five new
tools, six skills and the release lock; `applyAdopt` kept every host file that
already existed and **reported** thirty-four 0.2 shapes it will not delete.
None were acted on. This path acts on them: it makes the gate green, leaves one
specification instead of two, points the entry chain at the release the lock
names, and puts the locally forked engine on the record.

It is the least because it deletes rather than writes: seven of its eight
outcomes remove a file, a script or a step, and the kit's own `staleShapes()`
already names each one and why. Nothing here is designed — the adoption already
decided it and only declined to carry it out.

It does not touch product code, does not migrate the concept corpus into new
prose, does not fix what belongs to Cairn. Two findings from the 2026-09-21
audit are upstream defects and live in cairn PR #23 — the silent-CI-break in
the adoption report, and `optionsFromConfig` deriving `architecture`,
`decisions` and `modules` from `docsRoot` while honouring a declared
`conceptsRoot`. Neither is repaired here; this path only records what the
second one left in this tree and waits.

## Definition of done

- [ ] `npm run cairn-check:test` no longer exists, no workflow step calls it,
      and a push to `master` and to a `path/**` branch both go green.
- [ ] No `tools/*.test.mjs` remains: this repository does not own the tools
      they test, and the release's own suite is not adopted in their place.
- [ ] `docs/cairn/specification/` is gone; the concept wiki lives at a root
      this repository owns, `roots.concepts` names it, `cairn-check` still
      reads all 76 concepts, and no page routes a reader to the 0.2 copy.
- [ ] `AGENTS.md` and `binding.md` describe release 1.1: the six skills, the
      specification at its release link, and a mechanical contract in which
      every named command exists.
- [ ] `tools/cairn-{init,rules,spec-build}.mjs` and their `package.json`
      scripts are gone; `cairn-postmortem` is reachable by script and runs in
      CI on a failed check, as the release's own workflow does.
- [ ] An ADR records that `tools/cairn-check.mjs` is held one patch ahead of
      release 1.1, names the e18bbe4 / CP-CAIRN-006 S02 regression and cairn
      PR #23, and states the condition under which `update --take` retires it.
- [ ] `atomik-project/{sessions,audits,briefs}/` are retired as history, or
      kept with one sentence each saying why this host keeps what the kit
      retired.
- [ ] Every remaining shape `staleShapes()` reports is either gone or named in
      this path's closing review as deliberately kept.

## Opening acceptance

```yaml
decision: accepted
accepted_by: jubette
accepted_roles: [initiator, reviewer]
accepted_at: 2026-09-21T10:12:00Z
scope_ref: atomik-project/coding-paths/CP-OPS-003/index.md#definition-of-done
scope_digest: sha256:a75c14f7c86781c6e5f3a695799f96e97464eee90ca4284b93b8814616d18df6
```

Reviewed at the plan review: the `full` route and its three triggers (control
plane, a decision record, six units), the eight outcomes above, the write
surface and its absence of overlap — no other path is running — the exclusion
of both cairn PR #23 defects and of the harness-loading question on Cairn's 1.2
row, and `jubette` as the initial writer. Two amendments were asked for before
the go-ahead and are written into [`plan.md`](./plan.md): S02 moves the concept
wiki to flat `docs/concepts/` rather than sorting it into 1.1's three-folder
root, and S04 wires `cairn-postmortem` rather than deleting it.

## Documentation coverage

### Required

- `cairn/README.md` — what the kit owns, and what `update` does with a file
  this host has edited
- `cairn.lock.json` — the manifest and the host list this path reasons about
- `AGENTS.md`, `atomik-project/coding-paths/binding.md` — the entry chain being
  repointed
- `docs/adr/ADR-020-protocol-context-weight.md` — why portable protocol, host
  binding and host constitution are separate pages

### Conditional

- `docs/adr/ADR-019-cairn-v0-2-revision.md` — read before removing anything the
  0.2 revision put in place
- `.github/workflows/cairn.yml` — read before S01 changes a job

### Deliberately excluded

- `docs/bedrock/00_00-orientation.md` and the rest of the product constitution
  — no product behaviour changes here
- The Cairn repository's own records — upstream work is PR #23, not this path

## Steps

Forward steps live in [`plan.md`](./plan.md) until they are executed.

- **[S01](./steps/S01.md)** — the gate: the eight 0.2 tool tests, the script and the workflow step that called them — COMPLETE
- **S01b** — the transport declaration, which S01's own registration proved false

## Resume

### Checkpoint

```text
commit : b238a665bb086081d883cb6cbf1f0d9184c5cecc
unit   : 0 — the registration commit, on the remote as the head of
         origin/path/cp-ops-003 and not yet on the trunk
base   : 37f56a56689388b4fb770e3b9238ab033d0cfb2e
trunk  : 37f56a56689388b4fb770e3b9238ab033d0cfb2e (local; origin/master is at 46bdd11, one commit behind)
```

### Next action

Get the registration commit onto `origin/master`. It is one decision, not a
command: this repository's ruleset has no bypass actor, so the route is to add
one — as `sinlalune/cairn` has, which is the only reason the protocol's own
registrations work — or to wait on the rule change proposed in cairn PR #25.

### Blockers

**The path cannot be registered, and both locks are external.**

`git push origin HEAD:master` is refused: the `master — cairn gates` ruleset
requires a pull request and carries `bypass_actors: []`, so no one can push the
trunk directly. And a pull request carrying the registration is refused by the
gate in turn — `registration` resolves the declaration on the trunk ref, never
in the change under review, so the request that would land it fails for not
having landed. Reported as cairn PR #25, observations 6 and 7.

A third lock sits behind those two: until this unit merges, the required check
`cairn-check (protocol)` runs `npm run cairn-check:test`, which this unit
deletes. A metadata-only registration request would not touch it and would fail
on it.

What clears it: a bypass actor on the ruleset for the trunk, which restores the
sequence `cairn-open` ships and matches the protocol's own repository; or the
`registration` rule learning the registration commit under review. Four
untracked files in the owner's main worktree (`index.md`, `log.md`,
`cairn-manifesto`, `cairn-project`) are the owner's and were deliberately left
alone; the registration commit was staged by explicit path instead of from a
clean tree.

### Tried and rejected

- Copying the release's eleven `tools/*.test.mjs` in — rejected: this host owns
  none of those tools, so it would maintain another repository's fixtures and
  re-break on every release.
- Repairing `docs/architecture/` against `roots.architecture` here — rejected:
  the kit ignores three declared roots, which is cairn PR #23's second
  observation, and a host-side patch would be overwritten by the fix.
- Registering by direct push, the sequence `cairn-open` ships — rejected by the
  forge: a pull request is required and the ruleset has no bypass actor.
- Registering through a pull request carrying the metadata-only commit —
  rejected by the gate: `registration` reads the trunk, not the request.
- Fixing the red gate outside a path so a registration request could merge —
  refused: *no implementation work outside an accepted coding path* is the rule
  bedrock 35 exists to hold, and breaking it to satisfy a different rule is the
  choice this protocol exists to keep a writer out of.

### Reading order

1. `cairn/README.md@9222c44c` — what `update` will and will not rewrite.
2. `cairn.lock.json@b88d566e` — the host list, and the one manifest digest that
   does not match its file.
3. `AGENTS.md@a5812d5d` — the entry chain as 0.2 left it.

### Verify

```bash
npm run cairn-check
npm run cairn-active
```
