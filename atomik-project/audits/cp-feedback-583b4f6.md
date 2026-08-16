---
type: Atomik Coherence Audit
title: Coherence audit — CP-FEEDBACK @ 583b4f6
timestamp: 2026-08-16T16:29:16.434Z
atomik:
  path: CP-FEEDBACK
  branch: path/cp-feedback
  head: 583b4f6edfe44c186e10d7b3fa886df8d485aa4a
  base: b32df20
  verdict: drift noted, proceeding
---

# Coherence audit — CP-FEEDBACK @ 583b4f6

Run after the rebase, before the merge. ADVISORY: nothing here blocks. Its job
is to catch what no deterministic check can — two paths that each pass every
rule and still pull the architecture in different directions.

## What to read

- the rebased diff for this branch
- every bedrock page and ADR named in this path's documentation coverage
- the module area notes the diff touches
- any OTHER path currently `running` that declares an overlapping surface

## Findings

### Does the diff contradict an accepted decision?

No. The rebased diff stays within the contracts named by the path:

- Bedrock 03 keeps `title` and the one-time `quick` marker in recoverable tab
  params; neither is promoted to durable knowledge.
- Bedrock 04/11/27 remain file-first: a quick note is an ordinary blank
  Markdown file from birth, and its one permitted H1-led rename passes through
  the existing preview/apply relocation transaction. Audit preflight found
  that an ordinary note tab could still place a quick note inside `sources/`;
  commit `583b4f6` closed that source-bundle edge and pinned both vault and
  project fallbacks.
- Bedrock 09/12/13 remain intact: page titles arrive through the existing
  isolated web-view state, are stripped of controls and bidi overrides before
  renderer persistence, never widen IPC/preload authority, and never replace
  the visible full URL. Omnibox output is limited to HTTP(S), with MAIN still
  re-validating every navigation.
- Bedrock 20 plus ADR-011 still have one shared link classifier. `web-source`
  is an additive derived kind for a rebuildable graph projection, not authored
  truth or a migration of Markdown.
- Bedrock 15/36 are followed through pure policy helpers, existing tokens,
  light/dark variants, redundant icon/text cues, keyboard-reachable actions,
  and polite chronological chat-log semantics.

The conditional AI patch, app-kernel, and truth/evidence rules did not trigger:
the diff changes chat presentation, renderer policy, and derived link identity,
not proposal mutation, kernel ownership, or epistemic meaning.

### Does it duplicate something another running path is building?

No feature is duplicated. `CP-MVP-010` builds lexical/graph retrieval,
inspectable context packets, grounded chat, citations, and diagnostics;
CP-FEEDBACK changes message geometry, quick-note birth/naming, web identity,
and the distinction between a raw URL and a captured web source.

There is real integration drift to carry forward. A three-way overlap check
shows both paths edit `ChatView.tsx`, `styles.css`, `graph-core.ts`, its tests,
and the AI/graph/shell/vault module notes. CP-MVP-010 is still unmerged and
must rebase after this self-merge. Its reconciliation must preserve the flat
left-led assistant turn and `role="log"` boundary while adding grounded-chat
controls, and preserve the additive `web-source` kind while extending graph
retrieval. These are compatible contracts, but the future resolution is not
purely file-mechanical, so the drift is recorded rather than called clean.

### Did it introduce architecture that belongs in an ADR and has none?

No. There is no new durable schema, IPC channel, preload capability, provider,
dependency, evidence claim, or source format. The quick-note pending marker and
web title are disposable workspace state; the link kind is a rebuildable
classification; the requested Google default is a renderer URL-normalization
policy behind the existing HTTP(S)-only navigation boundary. The language-note
schema, docking model, and PDF highlight schema remain explicitly reserved for
their own paths and decisions.

### Is anything now documented in two places that will drift apart?

No conflicting source of truth was added. Runtime policy lives in the pure
helpers (`quick-note.ts`, `web/urls.ts`, and shared `graph-core.ts`). The module
notes intentionally divide ownership: AI documents transcript semantics, shell
documents workspace/tab state, sources documents isolated web behavior, vault
documents file birth/relocation, and editor/graph document pill rendering versus
classification. Their small cross-references summarize boundaries rather than
restate a second algorithm. The path ledger and closing session are execution
records, not competing product contracts.

## Verdict

**drift noted, proceeding**

The branch is coherent with bedrock and its accepted scope. The only carried
finding is the explicit CP-MVP-010 integration obligation above; because that
path has not merged, it owns the later rebase and full-gate proof.

*(clean · drift noted, proceeding · needs a conversation before merge)*
