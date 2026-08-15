# ADR-012: Parallel coding paths, self-merge, and a protocol check in CI

Status: accepted
Date: 2026-08-15
Amends: ADR-009 (durable coding paths, work ledger, dual-plane repository)

## Context

ADR-009 made execution state durable but assumed one path at a time. The owner
hit the limit directly (brainstorm 2026-08-14): *"its hard to run mutliple agent
in parallele, working on different subject, in a worktree or not, like maybe
doing feedback fine tuning, while going forward on the roadmap, how can we
adjust the structure to make it possible N?"*

The concrete use case was four simultaneous streams — a roadmap milestone,
backlog repairs, provider expansion, and settings polish. An overlap audit
against the real files reduced them to three: provider expansion and settings
polish share `ai-settings.ts`, `shared/ipc-contract.ts` and `AppMenu.tsx`, so
they are one piece of work wearing two names.

A first design put a single **integrator** between every worker and the trunk.
The owner rejected it: *"for me it not possible to have only one integrator,
every workstation or dev should be able to merge into master... maybe
considering coding path to be parallel directly instead of parallel lane would
be easier to manage."* That rejection turned out to be correct for a second
reason found afterwards: the integrator had created two of the four gaps a
workflow audit had already identified — nothing marked work integrated, and the
merge gate left no artifact.

## Decision

1. **Coding paths are the unit of parallelism.** One path = one worktree = one
   branch (`path/<id>`) = one writer. No parent path, no lane layer, no
   integrator. Numbered paths (`CP-MVP-010`) come from a roadmap milestone and
   hold a register row; labelled paths (`CP-SETTINGS`) are named for their
   subject and hold none. Both are ordinary accepted paths.
2. **Every path merges itself**, once its closing ceremony is recorded, its
   branch contains the trunk tip, the gates are green on the *rebased* result,
   and a coherence audit is recorded. The path sets its own `status: done` in
   the same change that merges it, so status and history cannot disagree.
3. **The rebase gate replaces the gatekeeper.** Requiring the trunk tip
   serializes the *merge* — seconds — without serializing the *work*. This is
   blocking and machine-checked.
4. **Nothing is shared between two paths.** Views over the whole are DERIVED
   from the path files (the running-paths view, the register's status column,
   the index over module notes); the journal is one file per entry under
   `atomik-project/log/`, with the former single `log.md` frozen as an archive
   and deliberately not migrated. Deriving a view is strictly better than
   forbidding edits to it: it makes the conflicting state impossible rather
   than illegal.
5. **Ceremonies bracket every path**, not the gap between paths. Both halves,
   for numbered and labelled alike (owner: *"better too much evaluation than
   not enough"*). The closing ceremony is now the last human judgment before a
   merge, and its session note is machine-checked.
6. **The mechanical half runs in CI**, as a job separate from the build gates,
   because "does the software work" and "was the protocol followed" are
   different questions. A rule may fail the build only when it is **objectively
   checkable AND breaking it leaves something wrong in the repository — not
   merely unconventional.** Everything else is advisory and never blocks.
7. **The coherence audit is agent-produced and advisory.** An agent reads the
   rebased diff against the bedrock, the ADRs and the path's declared coverage;
   CI checks only that a filled record exists. A deterministic gate on a
   non-deterministic activity; its verdict never blocks.

## Evidence

Three claims in the first design were tested rather than argued, and two of
them lost. That is why this ADR exists in the shape it does.

- **"Shared files merge cleanly into something false"** — challenged by the
  owner, then tested with four real merges. Two journal appends CONFLICT
  visibly. Two edits to adjacent table rows CONFLICT visibly. Two edits to
  distant rows merge cleanly AND correctly. Only "one path closes the parent
  while another adds an entry" merges into a contradiction — a *cross-line*
  failure where both edits are individually right. Three of four did not
  reproduce, so the answer became derive-don't-lock (decision 4).
- **"A path may not write the journal"** was blocking for a day on the argument
  that it records work as integrated before it is. The argument is circular —
  the entry is wrong only against our own definition of the file — and no
  untrue statement ever reaches the trunk, since the entry becomes visible
  exactly when it merges. Retracted; the criterion in decision 6 was extracted
  from that failure.
- **The app could not run twice at all.** No `app.setPath('userData', …)` and
  no dev-port configuration, so two worktrees shared one Electron profile —
  one cookie jar, one `localStorage`, one GPU cache. Closed by
  `electron-main/lane.ts` before any parallel work was possible.

## Consequences

Positive: parallel work needs no coordinator; a path is resumable on any
machine from its checkpoint; protocol compliance no longer depends on which
agent or model produced the commit; the two gaps the integrator created are
closed by construction.

Negative and accepted: merging is serialized by the rebase requirement, so a
long-lived path pays a rebase cost that grows with its age. Nobody owns
architectural coherence structurally — decision 7 delegates the noticing to an
agent, and if that audit never catches anything a human would have missed it
should be deleted rather than kept as decoration. The owner becomes the
bottleneck for ceremonies, accepted deliberately.

## Known gaps at acceptance

Recorded rather than hidden; none is a reason to defer the decision.

1. An abandoned path keeps `status: running` and lingers in the generated
   views. No terminal transition exists.
2. `base_commit` accuracy is unchecked — presence is verified, truth is not.
   Partly mitigated by the rebase gate, which checks the branch against the
   trunk directly.
3. Checkpoint *accuracy* is unchecked, and cannot be: "is this prose still
   true?" is not a checkable question. Found the honest way — CP-OPS-001's own
   checkpoint had gone stale five steps after the model changed.
4. **The model has never run two paths in parallel.** It is written, enforced
   in CI, and unproven. The pilot (CP-OPS-001 S05) is what tests it.

## Migration / rollback

Nothing is migrated. `log.md` stays frozen with its ~300 entries intact;
rewriting recorded history to fit a newer convention would be worse than the
convention. Existing closed paths are untouched, and the ceremony check is
scoped to the change that closes a path so history is never punished for a
convention that postdates it.

Rollback is cheap: the convention is one execution-plane file plus three
dependency-free scripts. Removing them returns the repository to serial
single-path work with every record still readable.

## Links

- `35_35-coding-path-execution-state.md` — the plane this amends
- `22_22-agent-handoff.md` — the per-step protocol
- `24_24-doc-templates.md` — the path template
- `atomik-project/coding-paths/paths.md` — the operating detail, execution-plane
- `atomik-project/coding-paths/CP-OPS-001.md` — the path that built it
- `atomik-project/brainstorm/2026-08-14-parallel-agent-execution.md` — the origin
- `ADR-009` — the decision this extends
