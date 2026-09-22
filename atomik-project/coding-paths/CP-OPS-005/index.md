---
type: Atomik Coding Path
title: Run the kit's update — the generated pointer page stops lying, and the request template arrives
description: The installed release is current, but three of its generated files are stale after CP-OPS-003 moved a declared root and changed a transport. cairn/README.md tells a reader this repository has edited nothing, when it has edited ten kit files, and the pull-request transport's closing-review template has never existed here.
tags: [cairn, ops, kit, update, generated]
timestamp: 2026-09-22T00:00:00Z
atomik:
  id: CP-OPS-005
  route: full            # control plane: the kit's own files and the lock
  status: running
  current_step: S01
  base_commit: 331a37a225564ff1d35ea0a03d1137a03b660d21
  branch: path/cp-ops-005
  assigned_writer: jubette
  depends_on: []
  subject_commit: null
  resolution: null
  writes:
    - cairn/README.md
    - cairn.lock.json
    - cairn.config.json
    - .github/pull_request_template.md
    - docs/inputs/index.md
    - docs/architecture/index.md
    - docs/concepts/*/index.md
    - atomik-project/coding-paths/CP-OPS-005/**
    - atomik-project/coding-paths/ACTIVE.md
    - atomik-project/log/**
  governs:
    - cairn/README.md@9222c44c421cefb43ef9194613c38df49bcfeaa0
    - cairn.lock.json@ed62120aef4556789368e9f592b7aecfcc93f4cc
    - cairn.config.json@a691572572426d05e043d720b728f9d1c6b81458
    - docs/adr/ADR-023-the-checker-is-held-one-patch-ahead.md@359eba6b2a95e1e42704c5574c87203f784748d7
---

# CP-OPS-005 — run the kit's update

## Goal

Run `npx cairn-protocol@1.1.0 update` so the kit's generated files match the
configuration CP-OPS-003 left them. The release is already current; what is
stale is what the kit generates *from* the config, and it has been stale since
the concept root moved and the integration transport changed.

It is the least because it runs one command the kit owns and reviews what it
wrote. This path authors nothing the kit generates.

It does not reconcile the ten edited kit files by hand — `update` keeps them
and lists them, and each was edited deliberately by CP-OPS-003 or is ADR-023.

## Definition of done

- [ ] `cairn/README.md` names the concept indexes at the paths they occupy and
      lists the ten kit files this repository has edited, instead of asserting
      that it has edited none.
- [ ] `.github/pull_request_template.md` exists, and a closing review is
      written into the shape the kit supplies rather than one written by hand.
- [ ] `tools/cairn-check.mjs` is untouched and still reads as edited, so
      ADR-023's held patch survives an `update` — verified, not assumed.
- [ ] `cairn.lock.json` records the run, and every file it now calls pristine
      is byte-identical to what the kit writes.

## Opening acceptance

```yaml
decision: accepted
accepted_by: jubette
accepted_roles: [initiator, reviewer]
accepted_at: 2026-09-22T14:20:00Z
scope_ref: atomik-project/coding-paths/CP-OPS-005/index.md#definition-of-done
scope_digest: sha256:5683f28d54d5e5917a96bfef9b3868ed3a1a0dd98bcbe2e0de01d50f50b4d2c0
```

Accepted in chat after the owner ran `update --dry-run` and a throwaway clone
was updated for real to measure what it writes: seven files, of which five are
a regenerated timestamp and two are substantive, with every edited file kept
and `tools/cairn-check.mjs` untouched.

## Documentation coverage

### Required

- `cairn/README.md` — what the kit owns and what `update` does to each class
- `docs/adr/ADR-023-…` — the held patch this run must not disturb

### Deliberately excluded

- The ten edited kit files. `update` keeps them; reconciling any of them is a
  separate decision with its own reasons, and CP-OPS-003 recorded those.

## Steps

- **S01** — the update, and what it wrote

## Resume

### Checkpoint

```text
commit : 331a37a225564ff1d35ea0a03d1137a03b660d21
unit   : 0 — the trunk tip this record is registered against
base   : 331a37a225564ff1d35ea0a03d1137a03b660d21
trunk  : 331a37a225564ff1d35ea0a03d1137a03b660d21
```

### Next action

Create the worktree and branch from the registration commit, then S01.

### Blockers

None.

### Tried and rejected

- Waiting for release 1.2 — rejected: the two stale facts are stale now, and
  neither of 1.2's known asks (the `links` exemption field that retires
  ADR-023, the post-mortem run count) touches them.
- Hand-writing the request template — rejected: it is a file the kit generates
  from the declared transport, and hand-writing it is how a host acquires a
  second copy that drifts.

### Reading order

1. `cairn/README.md@9222c44c` — including the line that says this repository
   has edited nothing.

### Verify

```bash
npm run cairn-check
npx cairn-protocol@1.1.0 update --dry-run
```
