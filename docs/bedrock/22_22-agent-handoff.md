---
{
  "id": "22-agent-handoff",
  "title": "Coding agent bootstrap protocol",
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
      "active coding path",
      "work ledger checkpoint",
      "repository and test state"
    ],
    "outputs": [
      "executed path steps",
      "updated work ledger",
      "code + tests + docs in one work unit",
      "log.md entries",
      "generated brief on handoff only"
    ],
    "invariants": [
      "Navigate Bedrock for knowledge; follow a Coding Path for execution; persist progress in the Work Ledger; generate a brief only as a portable view of that state.",
      "Never begin implementation without an active coding path; propose one first if none exists.",
      "Never silently invent architecture outside the bedrock.",
      "Read every Required document of the active path; honor Conditional triggers; respect Deliberately excluded entries.",
      "Verify repository reality against the ledger before executing; reconcile mismatches explicitly.",
      "Every executed step updates code, tests, documentation, the ledger, and log.md in the same work unit.",
      "Do not hide canonical knowledge or execution state in caches, embeddings, or chat memory.",
      "Provider keys and private context stay behind typed secure boundaries.",
      "Emit a minimal ActionTrace from the first AI mock; no raw prompt/output telemetry by default.",
      "Stage explicit paths per work unit; never blind-add the live repository the owner is dogfooding."
    ]
  }
}
---

# Coding agent bootstrap protocol

## Role of this document

This page is the re-entry procedure for any implementation session — human, coding agent, or both. It replaced the earlier static first-milestone recipe: that content now lives as the first concrete coding path, `atomik-project/coding-paths/CP-MVP-001.md`, where its progress can actually be tracked.

```text
Bedrock docs   = what the architecture should be
code + tests   = what currently exists
Coding Path    = what this task will change, in what order, and where it stands
```

## The protocol

![Coding agent bootstrap protocol (D08)](../diagrams/D08_bootstrap_protocol.svg)

```text
1. Read AGENTS.md.
2. Read atomik-project/index.md.
3. Open atomik-project/coding-paths/ACTIVE.md and follow it to the active path.
4. Verify reality against the Work Ledger:
   git status, base commit, dirty files, test state.
   If they disagree, reconcile and record the correction before anything else.
5. Read the documents listed under Required in the path's documentation coverage.
6. Note the Conditional triggers; read those documents when a trigger fires.
7. Confirm the Deliberately excluded list; do not silently widen scope.
8. Execute ONE path step at a time.
9. After each step, in the same work unit:
   update tests, update the Work Ledger checkpoint,
   update module notes / affected docs, append to log.md,
   and when the step first mobilizes a technology or pattern,
   add or extend the matching docs/learning/ note (17 first-use rule).
10. Generate a brief into atomik-project/briefs/ ONLY when handing work
    to another session, agent, or person.
```

## Between paths: the two ceremonies

Do not start coding without an active path. The gap between paths is governed by two ceremonies (owner directives, 2026-07-21, refining the earlier single review). Both are INTERACTIVE — short prompted questions with options, never essay forms — and both persist their answers verbatim into files.

1. **CLOSING ceremony**, run when the active path closes (with its acceptance): present the owner a compact RECALL derived from repo metadata (register, ledgers, acceptance records, log — never from conversation memory): everything done, the backlog as it stands, what comes next, and what the agent believes needs challenging or completing. Then manage the roadmap backlog through prompted exchange. Answers are promoted into a session note; roadmap (18) amendments stay owner-gated — propose, never apply silently.
2. **OPENING check**, run when the next path is about to activate: walk the FEATURES INSIDE that path with the owner — one quick prompted confirmation per major feature ("this is what I am about to implement, this way — still your vision?"). Deltas amend the path BEFORE its base commit pins; answers are recorded in the path file and its session note. Activation still requires the owner's explicit acceptance.
3. Then propose/adjust the path from the roadmap milestone using the template in `24_24-doc-templates.md` and begin at S01. Activating a path with no recorded ceremonies for its gap is invalid.

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

When reporting a step or path as done, follow the final response requirement of `agent_documentation_contract.md`, which now includes the updated coding path step and Work Ledger state.
