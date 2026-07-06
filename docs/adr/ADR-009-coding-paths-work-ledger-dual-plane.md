# ADR-009: Durable coding paths, work ledger, and the dual-plane repository

Status: accepted
Date: 2026-07-05

## Context

Document 22 was a static first-milestone recipe. Actual implementation state — which route was chosen, which documents were consulted or skipped, what is finished, what comes next — lived only inside agent conversation threads. This violated the project's own constitution ("the project should never depend on hidden chat history as the only place where a decision exists") for exactly the class of state that changes most often.

Large agent context windows do not remove the problem. A context window is an execution buffer: documents are not active merely because they would fit, long sessions may be compacted, and instruction files may be size-limited. The capability figures reported in the originating conversation (window size, instruction limits, compaction behavior) were deliberately left unverified and unrecorded: the decision is independent of their exact values, and the design must stay correct as they change.

Separately, the project needed a decision on how the code repository and the Atomik-editable knowledge space relate.

## Decision

Atomik adds a durable **execution-state plane** beside the knowledge plane and the ephemeral context plane.

1. A **Coding Path** (`atomik-project/coding-paths/CP-*.md`) is a first-class durable file type describing one bounded implementation task: goal, definition of done, documentation coverage (Required / Conditional / Deliberately excluded, each exclusion with a reason), execution steps, and checkpoint.
2. The **Work Ledger** is the persisted checkpoint inside the path (base commit, changed files, test state, next action, blockers). An optional `.state.json` sidecar may mirror it for tooling but never replaces it.
3. The **compressed brief is demoted** to a generated, disposable handoff view produced from path state; it is never the agent's primary memory.
4. Document 22 becomes a **bootstrap protocol** (read AGENTS.md → project index → active path → verify ledger against reality → read Required docs → execute one step → persist). Its former MVP instruction migrates to `CP-MVP-001.md`.
5. **Interactive path artifacts are projections**: rendering or editing a path in a UI patches the path file, mirroring the canvas and Truth Lens invariants.
6. The repository is **one Git repository with two planes**: the code plane (`apps/`, `packages/`, `docs/`) and the knowledge/execution plane (`atomik-project/`), which is an ordinary Atomik project bundle editable in Atomik and consumable directly by coding agents. Accepted ADRs remain canonical in `docs/adr/`; `atomik-project/brainstorm/` is explicitly provisional. **No nested Git repository or submodule by default.**

## Consequences

- Any session can resume from files alone; conversation loss costs nothing durable.
- Silent scope drift becomes visible: every consulted or skipped document is recorded.
- One executed step produces one meaningful diff (code + tests + docs + ledger + log).
- Atomik gains a dogfooding surface before the app exists: the execution plane is already a project bundle Atomik will later open natively.
- `.gitignore` and commit defaults extend to `atomik-project/**` and `coding-paths/*.md`.
- The agent documentation contract's boundary list and final-response requirement gain execution-state entries.

## Alternatives considered

### Rely on large context windows

Rejected. Buffer is not memory; compaction and instruction limits are real and volatile; the agent's self-constructed route would still exist only in the thread.

### Compressed brief as primary agent memory

Rejected. A brief is lossy and hides its omissions. Retained only as a generated portable view.

### Nested repository or submodule for atomik-project/

Rejected for now. Nesting splits agent guidance discovery from code, and makes atomic code-plus-documentation commits difficult. Bedrock 27 already requires careful boundary detection for nested repos; it does not require them. Revisit only if the planes need separate access control or licensing.

### External task tracker or database

Rejected. Hidden runtime state for execution would contradict file-first durability and Git reviewability.

## Migration / rollback

The former document 22 content becomes `CP-MVP-001.md` unchanged in substance. Briefs remain generable at any time. If the mechanism proves too heavy, a path can degrade to a plain checklist note without losing the recorded history; the protocol steps are advisory prose, not runtime dependencies.

## Links

- `35_35-coding-path-execution-state.md`
- `22_22-agent-handoff.md`
- `26_26-okf-agent-context.md`
- `27_27-git-compatibility.md`
- `24_24-doc-templates.md`
