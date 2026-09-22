---
type: Atomik Coding Path
title: Finish the Cairn 1.1 adoption — one green gate, one specification, one entry chain
description: The 1.1 kit landed its tools and skills; the host stayed on 0.2. Retire the 0.2 shapes the adoption reported and left, repoint the entry chain at the installed release, and put the forked engine on the record.
tags: [cairn, ops, adoption, ci, entry-chain]
timestamp: 2026-09-21T00:00:00Z
atomik:
  id: CP-OPS-003
  route: full            # control plane + decision plane; six units; escalation is one-way
  status: ready
  current_step: S07
  base_commit: 37f56a56689388b4fb770e3b9238ab033d0cfb2e
  branch: path/cp-ops-003
  assigned_writer: jubette
  depends_on: []
  subject_commit: 8010b1cd96afababf4b7fc248e2d7d039210e301
  resolution: null
  writes:                    # ADVISORY — a signal, never a lock
    - tools/cairn-check.mjs      # S05: the held patch, declared by ADR-023
    - tools/cairn-*.test.mjs
    - tools/cairn-init.mjs
    - tools/cairn-rules.mjs
    - tools/cairn-spec-build.mjs
    - package.json
    - .github/workflows/cairn.yml
    - cairn.config.json
    - cairn.lock.json             # S02: the kit's own files followed the wiki
    - AGENTS.md
    - atomik-project/coding-paths/binding.md
    - atomik-project/coding-paths/paths.md
    - atomik-project/coding-paths/CP-OPS-003/**
    - atomik-project/coding-paths/ACTIVE.md
    - atomik-project/coding-paths/index.md
    - atomik-project/sessions/**
    - atomik-project/audits/**
    - atomik-project/briefs/**
    - atomik-project/index.md
    - docs/bedrock/index.md       # S03: the brief and paths.md were host
    - docs/bedrock/17_17-self-evolving-docs.md   # constitution in five places,
    - docs/bedrock/24_24-doc-templates.md        # not two
    - docs/bedrock/27_27-git-compatibility.md
    - docs/bedrock/35_35-coding-path-execution-state.md
    - atomik-project/log/**
    - docs/cairn/**
    - docs/concepts/**            # S02: the concept wiki's new root
    - docs/adr/**                 # S02: three ADRs link the wiki and follow it
    - docs/bedrock/index.md       # S02: entry pointers left the retired tree
    - docs/bedrock/22_22-agent-handoff.md
    - docs/agents/*.md
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
- [ ] `docs/cairn/specification/` is **retired, not deleted**: the concept wiki
      lives at a root this repository owns, `roots.concepts` names it,
      `cairn-check` reads all 76 concepts there, and no page routes a reader to
      the 0.2 copy. What remains of the copy carries a superseded banner and
      exists only so that the append-only records linking it still resolve.
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

```yaml
decision: accepted
accepted_by: jubette
accepted_roles: [initiator, reviewer]
accepted_at: 2026-09-21T13:58:00Z
supersedes: the acceptance of 2026-09-21T10:12:00Z above
scope_ref: atomik-project/coding-paths/CP-OPS-003/index.md#definition-of-done
scope_digest: sha256:fce14b6e263dca0c266a36f37f87957f31045daa5253ffaad3fa2894aa495aaa
```

**Scope amendment, outcome 3 only: *gone* becomes *retired*.** Deleting
`docs/cairn/specification/` breaks eight relative links inside append-only
records — six distinct targets across `CP-OPS-002/steps/`, `audits/` and
`briefs/` — and `links` is corpus-wide and blocking. The outcome as accepted
could be met only by editing records this protocol forbids editing, or by
widening the checker fork this path exists to retire. It is the third instance
today of the class filed as cairn observation 1, a rule demanding an edit to
frozen history.

What the outcome names is unchanged and still met: one live concept wiki at a
root this repository owns, and no live page presenting the 0.2 copy as current.
What is given up is the deletion itself — six pages stay reachable behind a
retired banner so that frozen records resolve.

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
- **[S02](./steps/S02.md)** — one specification: the concept wiki moved to `docs/concepts/`, the 0.2 copy retired behind a banner, the 0.2 tools deleted with it — COMPLETE
- **[S03](./steps/S03.md)** — the entry chain: the bootloader and binding at release 1.1, `paths.md` retired, the integration transport moved on a measurement — COMPLETE
- **[S04](./steps/S04.md)** — the dead ends: the duplicate module note rerouted, `cairn-postmortem` given a caller and exercised — COMPLETE
- **[S05](./steps/S05.md)** — the fork on the record: ADR-023, and the engine comment's wrong attribution corrected — COMPLETE
- **[S06](./steps/S06.md)** — the residue: sessions and audits retired, the 0.2 spec's generated reader deleted, staleShapes down to 23 and every line accounted for — COMPLETE
- **[S07](./steps/S07.md)** — the post-mortem's own run: the step named the incident it could not count — COMPLETE

## Resume

### Checkpoint

```text
commit : 8010b1cd96afababf4b7fc248e2d7d039210e301
unit   : 07 — S07, the post-mortem's own run. This is candidate C, accepted
         and integrated by request #5
base   : 37f56a56689388b4fb770e3b9238ab033d0cfb2e
trunk  : b238a665bb086081d883cb6cbf1f0d9184c5cecc — the registration commit,
         published to origin/master after the owner added a bypass actor to
         the ruleset on 2026-09-21
```

### Next action

Record done: the integrating commit setting `status: done` and
`resolution: completed`, the journal entry under `atomik-project/log/`, and the
removal of the clean secondary worktree.

### Blockers

None. The registration blocker cleared on 2026-09-21: the owner added an admin
bypass actor to the `master — cairn gates` ruleset, matching `sinlalune/cairn`,
and the registration commit published. `cairn-check` is green on the branch.

The trunk's own CI stays red on `validator self-test` until this path
integrates, because the trunk still carries the workflow S01 repaired. Nothing
is blocked by it: no other path is running, and a request from a branch
carrying S01 is judged by the workflow that branch carries.

One thing is knowingly left inconsistent for the kit to reconcile:
`cairn/README.md` lists the concept indexes at their pre-S02 paths while
`cairn.lock.json` lists them at their new ones. That page is generated by
`npx cairn-protocol update`, which no unit of this path runs.

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
