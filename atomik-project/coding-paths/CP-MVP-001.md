---
type: Atomik Coding Path
title: Workbench MVP foundation (M0–M2)
description: Bring Atomik from empty repository to the first daily-usable AI patch loop with the thinnest honest truth and trace contracts.
tags: [coding-path, mvp, m0, m1, m2]
timestamp: 2026-07-05T00:00:00Z
atomik:
  id: CP-MVP-001
  status: active
  current_step: S01
  base_commit: null        # set at S01
---

# Goal

Implement Milestones 0–2 of `18_18-roadmap.md`: secure Electron shell, local Markdown vault and project bundle, and the selection-native AI patch loop with minimal truth labels and a minimal ActionTrace.

**Center of gravity: time-to-M2 is the only currently meaningful metric.** Everything downstream (dogfooding flywheel, friction-driven prioritization, trace history for M11, Truth Lens validation) unblocks only when M2 exists in daily hands.

# Definition of done

- All M0, M1, and M2 acceptance tests in `18_18-roadmap.md` pass.
- **Thinness rule:** M2's implementation effort stays in the same order of magnitude as M1's. If M2 is taking much longer than M1, the ceremony has won — stop and cut scope back to the contracts below.
- The minimal trace is literally one JSON line appended to `.atomik/usage/private/actions.jsonl` plus one compact badge. Nothing more is required to close this path.
- **Mechanical labeling rule:** `source-backed` is assigned only when content is deterministically derivable from the supplied selection/anchor (anchor match or quote hash). All other factual content defaults to `model-only`. The model never grades its own groundedness. `interpretive` / `needs-citation` come only from explicit block metadata.
- **Experiential gate:** the creator uses Atomik as the primary tool for learning notes for two consecutive weeks; every friction point is recorded as project files inside Atomik itself (notes, questions.md, log.md). This gate, not the functional tests alone, closes the path.
- Module notes, log.md, and this ledger updated at every step; each step = one meaningful diff.

# Documentation coverage

Completeness rule (35): every bedrock page 00–35 appears below at least once — Required, Conditional, or Deliberately excluded; 13 appears twice by design (Required + §IPC re-read trigger). No hidden areas.

## Required

- `docs/bedrock/00_00-orientation.md`
- `docs/bedrock/01_01-workbench-first.md`
- `docs/bedrock/02_02-learning-loop.md`
- `docs/bedrock/04_04-file-first-model.md`
- `docs/bedrock/05_05-resource-selection-model.md`
- `docs/bedrock/06_06-ai-patch-pipeline.md` (incl. mechanical labeling rule)
- `docs/bedrock/12_12-electron-mvp.md`
- `docs/bedrock/13_13-electron-security.md`
- `docs/bedrock/14_14-app-kernels.md` (incubation rule)
- `docs/bedrock/15_15-maintainability.md` (definition of done, diff hygiene)
- `docs/bedrock/17_17-self-evolving-docs.md` (same-work-unit rule)
- `docs/bedrock/18_18-roadmap.md` — M0–M2 sections only
- `docs/bedrock/22_22-agent-handoff.md`
- `docs/bedrock/27_27-git-compatibility.md` (atomic writes, commit/ignore defaults)
- `docs/bedrock/35_35-coding-path-execution-state.md`
- `agent_documentation_contract.md`

## Conditional

- `docs/bedrock/16_16-dev-docs-tab.md` — before S03 (Dev Docs tab).
- `docs/bedrock/03_03-workspace-tabs.md` — before S04 (tabs and panes).
- `docs/bedrock/11_11-markdown-page-model.md` — before S07 (editor) and S08 (note-writing patches).
- `docs/bedrock/13_13-electron-security.md` §IPC — re-read before adding ANY new IPC channel or preload method.
- `docs/bedrock/24_24-doc-templates.md` — before creating any module note, ADR, or new coding path.
- `docs/bedrock/26_26-okf-agent-context.md` — before extending context assembly beyond selection-first.
- `docs/bedrock/28_28-truth-evidence-model.md` — before adding any label beyond the four MVP labels.
- `docs/bedrock/33_33-retrieval-local-execution-cost.md` + `operation_trace_contract_v0_1.json` — before adding any trace field beyond the S09 minimum.
- `docs/bedrock/07_07-source-adapters.md` and `docs/bedrock/08_08-capture-source.md` — when spawning CP-MVP-002 (M3).
- `docs/bedrock/10_10-pdf-source-tab.md` — when spawning CP-MVP-003 (M4).

## Deliberately excluded

- `09_09-web-source-tab.md` — M5; its own child path later.
- `19_19-dsl-future.md`, `20_20-relations-future.md`, `21_21-canvas-future.md` — later milestones; extension points only.
- `23_23-references.md` — background bibliography; consult ad hoc, not a contract for this path.
- `25_25-use-cases.md` — pressure-test narrative, not an implementation contract.
- `29_29-verification-grounding-router.md`, `30_30-public-knowledge-dictionary.md` — M7/M10; provider-neutral interface reserved, no provider work here.
- `31_31-truth-lens-ux.md` — M6; M2 ships only the badge row defined in 06.
- `32_32-truth-investigation-record.md` — dated provider facts for M7.
- `34_34-local-execution-investigation-record.md` — M9 evaluation material; no local model runs in this path.
- `archive/04_04-file-first-model_workspace-aware_okf_draft.md` — superseded draft, archived (demotion, not deletion).

# Execution

- [ ] S01 Reconcile the pre-seeded dual-plane layout against ADR-009 (the bundle ships repo-ready); `git init` and first commit if not already done; record `base_commit` in the frontmatter and ledger.
- [ ] S02 Electron + Vite + React + TypeScript with secure main/preload/renderer split; narrow typed contextBridge API only.
- [ ] S03 Dev Docs tab rendering this documentation bundle from files.
- [ ] S04 Tabs and split panes; workspace state in `.atomik/`, disposable.
- [ ] S05 Vault open/read/write for Markdown with atomic, Git-friendly writes; restart survives; no rewrite-on-open.
- [ ] S06 Project bundle open/create with `index.md`, `log.md`, and manifest conventions.
- [ ] S07 CodeMirror editor + Markdown preview; explicit save or safe autosave.
- [ ] S08 Selection → AI operation **mock** → structured response bundle → patch preview → accept/edit/reject into file. One accepted operation = one clear diff.
- [ ] S09 Minimal ActionTrace from the S08 mock: one appended JSON line (location, model/tool id, est/actual tokens when available, latency, external cost, status, outcome, contentRecorded=false) + compact badge.
- [ ] S10 Mechanical truth labels on S08 output per the labeling rule; a mapped citation opens its local source anchor; one challenged claim produces a repair patch preview.
- [ ] S11 Run all M0–M2 acceptance tests from the roadmap; filename/heading/full-text search works without embeddings; cache deletion destroys nothing.
- [ ] S12 Experiential gate: two weeks of daily use; friction recorded as project files; resulting priorities patched into `atomik-project/brainstorm/` or the roadmap; path review and close.

Child paths (spawned from here, not widened into here): CP-MVP-002 capture source (M3), CP-MVP-003 PDF (M4).

# Current checkpoint

```text
base commit : (unset — record at S01)
changed     : none
tests       : none exist yet
next action : S01 — reconcile pre-seeded layout, record base commit
blockers    : none
```

# Blockers

- None recorded.
