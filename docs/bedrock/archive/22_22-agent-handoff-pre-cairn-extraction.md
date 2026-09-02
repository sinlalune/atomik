---
{
  "id": "22-agent-handoff",
  "title": "Archived coding agent bootstrap protocol before Cairn extraction",
  "status": "ready-to-use",
  "tags": [
    "agent",
    "handoff",
    "bootstrap",
    "coding-path",
    "work-ledger",
    "implementation",
    "okf",
    "git",
    "truth",
    "execution-cost"
  ],
  "relations": [
    { "to": "35-coding-path-execution-state", "kind": "implements" },
    { "to": "26-okf-agent-context", "kind": "uses" },
    { "to": "18-roadmap", "kind": "executes-through-paths" },
    { "to": "13-electron-security", "kind": "must-obey" },
    { "to": "17-self-evolving-docs", "kind": "must-update" },
    { "to": "14-app-kernels", "kind": "implements" },
    { "to": "27-git-compatibility", "kind": "must-preserve" },
    { "to": "28-truth-evidence-model", "kind": "must-implement-minimal-contract" },
    { "to": "33-retrieval-local-execution-cost", "kind": "must-obey" }
  ],
  "agent": {
    "purpose": "Define how any coding agent enters, executes, and leaves work on Atomik so that all execution state survives in files rather than conversation threads.",
    "inputs": [
      "AGENTS.md",
      "atomik-project/index.md",
      "the path you own (several may be running)",
      "work ledger checkpoint",
      "repository and test state"
    ],
    "outputs": [
      "executed path steps",
      "updated work ledger",
      "code + tests + docs in one work unit",
      "pushed remote checkpoint for every commit",
      "path-specific handoff brief refreshed at every completed step",
      "one journal file per merged step",
      "fresh-session proposal after every completed step",
      "verified remote merge followed by non-forced removal of the clean secondary worktree"
    ],
    "invariants": [
      "Navigate Bedrock for knowledge; follow a Coding Path for execution; persist progress in the Work Ledger; keep the path-specific handoff brief only as a portable view of that state.",
      "Never begin implementation without an accepted coding path; propose one first if none exists.",
      "After opening acceptance, register the running path declaration on the trunk and regenerate ACTIVE.md before creating its implementation worktree.",
      "Never silently invent architecture outside the bedrock.",
      "Read every Required document of the active path; honor Conditional triggers; respect Deliberately excluded entries.",
      "Verify repository reality against the ledger before executing; reconcile mismatches explicitly.",
      "Every executed step updates code, tests, documentation and the ledger in the same work unit; the journal is written once, at merge.",
      "Every commit is pushed immediately to its owning branch; an unpushed step is locally implemented, not complete.",
      "Every completed step is a safe chat boundary; the agent proactively offers a fresh session, and the next session resumes without an owner rebrief.",
      "After a merge is verified on the remote trunk, remove the exact clean secondary worktree without force from another checkout; retain the path branch.",
      "Do not hide canonical knowledge or execution state in caches, embeddings, or chat memory.",
      "Provider keys and private context stay behind typed secure boundaries.",
      "Emit a minimal ActionTrace from the first AI mock; no raw prompt/output telemetry by default.",
      "Stage explicit paths per work unit; never blind-add the live repository the owner is dogfooding."
    ]
  }
}
---

# Archived coding agent bootstrap protocol before Cairn extraction

> **SUPERSEDED EXPLANATORY RECORD.** ADR-020 stage 4 moved the portable session
> protocol into Cairn and left `docs/bedrock/22_22-agent-handoff.md` as Atomik's
> host pointer. This page retains the former combined text unabridged; it is not
> required reading and does not override the current portable protocol or host
> binding.

## Role of this document

This page is the re-entry procedure for any implementation session — human, coding agent, or both. It replaced the earlier static first-milestone recipe: that content now lives as the first concrete coding path, `atomik-project/coding-paths/CP-MVP-001.md`, where its progress can actually be tracked.

```text
Bedrock docs   = what the architecture should be
code + tests   = what currently exists
Coding Path    = what this task will change, in what order, and where it stands
```

## The protocol

![Coding agent bootstrap protocol (D08)](../../diagrams/D08_bootstrap_protocol.svg)

```text
1. Read AGENTS.md.
2. Read atomik-project/coding-paths/paths.md — how work runs: parallel
   paths, one per worktree, each merging itself.
3. Open atomik-project/coding-paths/ACTIVE.md and follow it to YOUR path.
   Several may be running; you own exactly one. Its global entry exists because
   accepted running paths register on the trunk before their branches diverge.
4. Verify reality against the Work Ledger:
   git status, base commit, dirty files, test state.
   If they disagree, reconcile and record the correction before anything else.
5. Read the documents listed under Required in the path's documentation coverage.
6. Note the Conditional triggers; read those documents when a trigger fires.
7. Confirm the Deliberately excluded list; do not silently widen scope.
8. Execute ONE path step at a time, on your own branch, in your own worktree.
9. After each step, in the same work unit:
   update tests, update YOUR path's Work Ledger checkpoint,
   update the affected module AREA note and any other affected docs,
   and when the step first mobilizes a technology or pattern,
   add or extend the matching docs/learning/ note (17 first-use rule).
   Refresh `atomik-project/briefs/<path-id>-handoff.md` from that ledger so
   the completed step is already a portable session boundary.
   The journal is written at MERGE time, one file per entry in
   atomik-project/log/ — never appended to the frozen log.md.
10. Run the relevant gates bare, commit the complete work unit, and push that
    commit immediately to its owning branch. A step is not complete until the
    push succeeds. Report its remote commit and proactively offer to end this
    chat and execute the next step in a fresh session. The path remains
    `running`; this is not its closing ceremony.
11. When a fresh session is chosen, end only after the pushed checkpoint is
    verified. The next session in the same worktree resolves the path from the
    branch, reads its ledger and path-specific handoff brief, reconciles reality,
    and begins `next action` without asking the owner to restate context.
12. Before merging: closing ceremony recorded, rebase onto the trunk, gates
    green on the REBASED result, coherence audit recorded, status: done in
    the same change. If the rebase rewrote published commits, push the rebased
    path with `--force-with-lease`, recording the old and new heads; then merge
    and immediately push the trunk — nobody approves it; the gates did. Verify
    that exact merge commit on the remote trunk. From another checkout, resolve
    the path's exact secondary worktree with `git worktree list`, require its
    Git status to be empty, remove it with non-forced `git worktree remove`,
    and verify both its registration and folder are gone. Never remove the
    main/owner or a dirty worktree; retain the local and remote path branch.
    If cleanup fails, report the merge complete and cleanup incomplete, leaving
    the checkout intact.
```

The mechanical half of this is enforced rather than remembered: `npm run
cairn-check` runs the same rules locally that CI runs, and `paths.md` lists
them with the test a rule must pass before it is allowed to fail a build.

## Around every path: the two ceremonies

Do not start coding without an accepted path. Every path is bracketed by two
ceremonies (owner directives, 2026-07-21, refining the earlier single review).
Both are INTERACTIVE — short prompted questions with options, never essay forms
— and both persist their answers verbatim into files.

They were originally described as gating the *gap between* paths, which assumed
paths ran one at a time. With several running at once there is no shared gap:
the ceremonies belong to the path, and every path gets both, numbered or
labelled (owner ruling 2026-08-15: *"better too much evaluation than not
enough"*). The closing ceremony matters more than it used to — with no
integrator, it is the last human judgment before a path merges itself, and a
path marked `done` without its session note fails the protocol check.

1. **CLOSING ceremony**, run when a path closes, before it merges (with its acceptance): present the owner a compact RECALL derived from repo metadata (register, ledgers, acceptance records, log — never from conversation memory): everything done, the backlog as it stands, what comes next, and what the agent believes needs challenging or completing. Then manage the roadmap backlog through prompted exchange. Answers are promoted into a session note; roadmap (18) amendments stay owner-gated — propose, never apply silently.
2. **OPENING check**, run when a path is about to activate — drafting and executing happen in the SAME session, since nobody drafts a path for someone else to pick up: walk the FEATURES INSIDE that path with the owner — one quick prompted confirmation per major feature ("this is what I am about to implement, this way — still your vision?"). Deltas amend the path BEFORE its base commit pins; answers are recorded in the path file and its session note. Activation still requires the owner's explicit acceptance.
3. Then propose/adjust the path — from a roadmap milestone if it is numbered,
   from its subject if it is labelled — using the template in
   `24_24-doc-templates.md`. After explicit acceptance, land a
   **registration-only trunk commit** containing the accepted path declaration
   (`status: running`, `branch`, pre-registration `base_commit`) and regenerated
   `ACTIVE.md`. It contains no implementation. Create the worktree from that
   commit and begin at S01. Cairn blocks new path branches whose declaration is
   absent from the trunk; CP-OPS-001, CP-MVP-011 and CP-MVP-012 are the finite
   pre-rule exceptions. Activating or closing a path with no recorded ceremony
   is invalid, and the closing half is machine-checked.

An in-app "ceremony tab" (path state as an interactive projection, 35) is a recorded candidate (`atomik-project/brainstorm/2026-07-21-ceremony-tab.md`); until it exists, the ceremonies live in prompted exchange + session notes.

## Working alongside the owner (session protocol)

Recorded owner directives (2026-08-03 memory audit, sessions B/C; promoted into this page at the 2026-08-04 ceremony gate). The owner dogfoods the LIVE repository while agent sessions run; these rules keep the two from trampling each other:

```text
staging discipline
  review git status --porcelain before every commit;
  stage explicit paths per work unit — never a blind `git add -A`;
  untracked owner files mid-session are normal and first-class:
  surface them, commit or discard only with the owner's consent

reporting form (owner directive 2026-08-03, "continuity in my focus workflow")
  status and next-step reports to the owner = short THEMED sections,
  each with its OWN `- [ ]` checklist of owner-side tasks —
  never one global undifferentiated list

owner experiments are bench inputs
  an owner-reported external-tool experiment is a first-class bench
  input: pin the exact artifact, version, and configuration before
  comparing anything against it

step/session boundary (owner directive 2026-08-24)
  commit + successful push = completed work unit;
  after every completed step, agent names the remote commit and offers
  "continue here" or "fresh session for <next action>";
  the fresh session reads branch + ledger + handoff brief and starts directly;
  owner supplies no recap, transcript, prompt paste, or repeated decision;
  if durable state conflicts, the agent reconciles files instead of asking the
  owner to reconstruct the previous context window

path/checkout boundary (owner directive 2026-08-24)
  a fresh chat reuses the worktree while the path is running;
  a completed path does the opposite: merge + push + remote verification first,
  then clean-status proof + non-forced removal of its secondary worktree;
  cleanup runs from another checkout and never targets the main/owner worktree;
  removing the folder never implies deleting the retained path branch
```

## Standing prohibitions

These apply across all paths and are restated inside `CP-MVP-001.md` where milestone-specific:

```text
no work outside an accepted coding path
no undocumented core module
no hidden database-only notes or JSON-only canonical source records
no remote content with Node integration; no generic IPC bridge
no provider keys in renderer or remote views
no mandatory vector database before lexical retrieval is evaluated
no raw prompt/output telemetry by default
no unsupported claim labeled source-backed
no automatic crawl/index from provider-grounding links
no mass file rewrites on app open
```

## Completion report

When reporting a step or path as done, follow the final response requirement of
`agent_documentation_contract.md`, which includes the updated coding path step
and Work Ledger state. A step report also names the successfully pushed commit
and offers the fresh-session boundary; without the push it must say
"implemented locally, not complete." A path-closure report additionally names
the remote merge verification and the exact worktree-cleanup verdict; a failed
cleanup is reported separately and does not rewrite a successful merge.
