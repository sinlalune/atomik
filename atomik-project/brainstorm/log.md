---
type: Atomik Folder Log
title: Log — atomik-project/brainstorm
description: Recent meaningful changes to explicitly provisional thinking, per the OKF folder convention.
tags: [log, okf, brainstorm]
timestamp: 2026-08-24T00:00:00Z
---

# Log — `atomik-project/brainstorm`

Recent meaningful changes in this scope: explicitly provisional thinking. The companion map is
[index.md](./index.md). An agent reads the index before opening many files, and
this log when recency matters or when re-entering after time away
([bedrock 26](../../docs/bedrock/26_26-okf-agent-context.md)).

Seeded 2026-08-24 (CP-OPS-002 S05c) from Git history: the 15 most recent of 15 commits that touched this folder, newest first, merges omitted because a merge names the path rather than the change.

**Append newest-first, at the top, in the same work unit as the change.** Git
remains the complete record; this is the readable one. If two paths ever start
colliding on this file, it takes the amendment the journal already took — one file
per entry in a `log/` subfolder — which was a concurrency fix, never a size one.

## 2026-08-15

- `92f25cb` CP-OPS-001 S01–S04f — Cairn: parallel coding paths, self-merge, and the CI that enforces it

## 2026-08-04

- `fba010d` brainstorm: persist the 2026-08-04 studio session (three-artifact rule, cross-repo) — the unified canvas as the evolved one-surface-two-layers: live-inline note block + own file; three entity kinds each editing through their canonical door (scene → DSL patches, graph → note diffs/creation, ink → own format, Excalidraw dropped); Illustrator layer/groups orthogonal to kind; per-gesture human edits + AI patch preview; one custom engine — dimension-agnostic core in atomik-dsl, SVG v0, three.js reserved for 3D; D4 reframed = studio v0; register records the opening input for the D4/M12–M13 path + CP-MVP-009 consumer note and carries the ADR-010 + bedrock 19/21 amendment candidates
- `4210b66` brainstorm: persist the 2026-08-03 sessions A/B/C (three-artifact rule) — definitive-vault timing + semantic-graph front half, claims epistemology → LLM judge, websearch tool contract; persistence rule lands in brainstorm/index.md header; register records the opening inputs for M6/M7/M8 + the post-008 path and the owner-gated bedrock patch candidates (03 lifecycle, 22 session protocol, 24 bare gates); module note gains the agent verification & owner-coexistence practices (CDP first-choice, dev-mode StrictMode pins, instance isolation, presentation wedge) and the bare-gates rule

## 2026-07-25

- `994ed7d` CP-MVP-008 S06c17 (owner decision-B redirect: epistemic status must live IN the generated text): truth-chip row retired — answers carry inline labeled <mark>s per claim: claim-highlight.ts NEW (pure, tested) locates raw-markdown claim sentences in the rendered text (inline md stripped; \s* matching because breaks:true renders hard wraps as <br> which contributes nothing to textContent and fuses adjacent words — found via live HTML dump); applyClaimMarks wraps multi-node spans back-to-front; colors ride the truth-chip palette, hover spells the label, source-backed marks click through revealNote (existing tab activates anywhere, else the note opens beside; tested); claims/evidence stay session meta; mock shows no source-backed marks (its quote candidate is the whole selection — real provider extracts candidates from the answer); future per-claim verification tools recorded in brainstorm; AiPanel-retirement question resolved by this redirect; dev-mode CDP pin; 584→593/53 green
- `09cad12` CP-MVP-008 S06c13 (owner correction of S06c12: closing the last vault pane must leave TREE PANEL + CHAT PANE, not an empty vault pane): chat panes now carry the vault tree panel like every pane (S06c2 'no tree at all' amended) — opt-in hidden by default (paneTreeHidden reads absent 'off' as hidden for kind chat, so chat beside a note pane never doubles the tree), and pane-removing closes run ensureVisibleTree (no survivor shows a tree → the first pane that has one shows its); closing the last vault pane beside the chat now collapses it and the chat presents the vault tree — the arrangement persists as a session-start shape; S06c12 in-place landing remains only without a tree-bearing sibling (lone web pane last-tab close still lands on the visible tree); chat-left/artifact-right confirmed already working; DnD/docking directive recorded verbatim in brainstorm/2026-07-25-dnd-docking-and-chat-workflows.md as the candidate next path; dev-mode CDP pin + screenshot; 582→583/52 green

## 2026-07-21

- `6cacfa2` the two ceremonies (owner refinement): closing ceremony (metadata recall + backlog prompted exchange) + opening check (feature-by-feature confirmation inside the path) replace the single review — both exercised live: post-008 candidate = Wikidata-backed local RAG grounding; Git diff view pulled from deferred; 008 confirmed with one amendment (chats persist as vault files); review CLOSED — 008 awaits the acceptance word
- `65252ae` CP-MVP-007 S07k: full conventions + deterministic sync — every folder owns index.md+log.md, the vault root seeds at explicit adoption, and the management verbs keep the parent's managed Contents block and dated log lines current (owner decisions revising option D; sync lives in the verbs so future AI file management records identically)

## 2026-07-16

- `ca4da79` CP-MVP-007 S01: bootstrap — doctrine pinned, decisions addendum, bundle-guard rule

## 2026-07-08

- `35ec031` brainstorm: generation/grounding/agent-harness strategy resume (provisional, owner session 2026-07-08)

## 2026-07-07

- `21d9b2f` brainstorm: record the multi-vault question (per pane/tab?)

## 2026-07-06

- `747fc7a` editor: blocks render in live mode; Ctrl/Cmd+click follows links
- `0c6ac0f` ui(ai-panel): drag-resize + bottom/right dock; record evidence-scope signal
- `7a79935` brainstorm: creation flows (folder-first thinking) and drag-and-drop expectations
- `7f2f917` brainstorm: owner first-use signals on panes/tabs (keep-signal + open question)
- `4675233` v0.6 bedrock: dual-plane repository seed (ADR-009)
