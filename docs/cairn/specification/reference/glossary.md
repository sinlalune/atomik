---
type: Cairn Reference
title: 'Reference: Cairn glossary'
description: Plain-language and precise definitions for the Git, quality, project-state, and Cairn terms used by the canonical specification.
tags: [cairn, reference, glossary, vocabulary]
timestamp: 2026-08-25T00:00:00Z
---

# Glossary

## Git and workspace

| Term | Definition |
| :-- | :-- |
| **Repository** | A project folder plus its Git history database. |
| **Commit** | A snapshot of all tracked files, with metadata, message, and parent link. |
| **Commit id / hash** | Content-derived identifier for one commit and its ancestry. |
| **Branch** | A movable name pointing to one commit and therefore one line of work. |
| **Trunk** | The shared mainline branch, commonly `main` or `master`. |
| **`HEAD`** | The branch or commit currently checked out. |
| **Detached HEAD** | A checkout pointing directly to a commit instead of through a branch name. |
| **Remote** | Another reachable copy of the repository; conventionally `origin`. |
| **Push** | Send local commits and update a branch on a remote. |
| **Fetch** | Download remote commits and refs without changing checked-out files. |
| **Merge** | Combine two lines of history and normally record a commit with two parents. |
| **Conflict** | Git refusing to guess when two changes overlap incompatibly. |
| **Rebase** | Replay commits on a newer base, producing new commit ids. |
| **`--force-with-lease`** | Update a rewritten remote branch only if the remote still matches the expected state. |
| **Worktree** | A separate working directory for another branch of the same repository. |
| **Upstream branch** | The remote-tracking branch associated with a local branch. |

## Quality and automation

| Term | Definition |
| :-- | :-- |
| **Test** | Executable check of an expected behaviour. |
| **Unit test** | A test focused on one small component or function. |
| **Regression test** | A test preserving a known requirement or previously exposed edge case. |
| **Test suite** | A collection of tests run by one command. |
| **Exit code** | Integer returned by a process; zero conventionally means success. |
| **Bare gate** | A gate run directly so its own exit code remains the verdict. |
| **Continuous integration (CI)** | A clean remote runner that executes checks for repository changes. |
| **Check** | An evaluation that reports a condition. |
| **Gate** | A check with authority to stop progress. |
| **Blocking finding** | Objective failure that contributes to a non-zero checker exit. |
| **Advisory finding** | Visible signal that never changes the checker exit code. |
| **Enforcement tier** | Declared deployment strength: `local`, `ci`, or `protected`. |

## Durable state

| Term | Definition |
| :-- | :-- |
| **Knowledge plane** | Durable architecture, decisions, and module knowledge under `docs/`. |
| **Execution-state plane** | Durable task state under `project/`. |
| **Ephemeral context** | Temporary conversation or process state that may disappear. |
| **Canonical file** | The file intentionally edited when its represented decision or state changes. |
| **Generated view** | A file derived deterministically from canonical inputs. |
| **Disposable projection** | A regenerable convenience view, such as a handoff brief. |
| **Frontmatter** | Machine-readable metadata at the beginning of a Markdown file. |
| **Schema** | Required field names, locations, values, and state-dependent constraints. |
| **ADR** | Architectural Decision Record: context, decision, consequences, and alternatives. |

## Cairn

| Term | Definition |
| :-- | :-- |
| **Coding path** | One accepted bounded task represented by a path file. |
| **Identity tuple** | Path id, status, branch, and base commit registered on the trunk. |
| **Work ledger** | Append-only execution record inside the path. |
| **Checkpoint** | Current verified state, remote commit, next action, and blockers. |
| **Handoff brief** | Regenerable short view of a path's current checkpoint. |
| **Step** | One coherent unit of implementation, tests, docs, ledger, brief, commit, and push. |
| **Session boundary** | A completed, pushed step from which another session can resume. |
| **Opening check** | Owner review and explicit acceptance before path activation. |
| **Closing ceremony** | Owner review and explicit acceptance before integration. |
| **Registration commit** | Metadata-only trunk commit that publishes a running path before branching. |
| **`writes:`** | Expected write surfaces; an overlap and scope-drift signal, never a lock. |
| **Widening** | Recorded expansion beyond the path's initial expected surfaces or coverage. |
| **Rebase gate** | Requirement that path `HEAD` contain the current trunk tip before merge. |
| **Self-merge** | A path integrates its own accepted and verified result without a permanent gatekeeper. |
| **Coherence audit** | Human- or agent-produced architectural review whose existence and binding are machine-checked. |
| **Derived active view** | Generated list of running paths based on registered declarations. |
| **Ledger boundary** | Reading-cost threshold after which completed steps move verbatim into history files. |
| **Path staleness** | Advisory notice that a running path's resolvable branch has been quiet past the configured window. |
| **Runtime identity** | Per-worktree ports, profiles, caches, databases, or sockets preventing live-instance collision. |

Return to the [canonical specification](../index.md).
