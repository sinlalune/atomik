---
type: Atomik Learning Note
title: 'Learning: the AI patch loop — contracts first, intelligence later'
description: Beginner-first walkthrough of S08 — the operation/bundle/patch contracts, why mock-first, and why the AI channel cannot write.
tags: [learning, ai, patches, contracts, mock, pipeline]
timestamp: 2026-07-06T00:00:00Z
---

# Learning: the AI patch loop — contracts first, intelligence later

**Who this is for.** You read note [05](./05-editor-codemirror-and-optimistic-saves.md).
After this one you can read `electron-main/ai-mock.ts`,
`renderer/src/editor/AiPanel.tsx`, and the AI section of
`shared/ipc-contract.ts` — and you'll know why the "AI" in the app today
is deliberately stupid.

**Scope.** CP-MVP-001 S08: selection → mocked AI operation → structured
response bundle → patch preview → accept/edit/reject. The heart of the
product (06), minus real intelligence.

## 1. Why build the loop before the brain

The temptation is to start with a provider API key and a prompt. The
bedrock inverts it (01, 18): the durable value of atomik is not "a model
answers" — every chat app does that. It is what happens AROUND the answer:

```text
the answer arrives as a STRUCTURED BUNDLE, not a wall of prose
file changes arrive as PROPOSALS you preview, edit, accept, or reject
one accepted operation becomes ONE clean Git diff
```

A mock provider exercises 100% of that machinery with 0% of the cost,
latency, and non-determinism. When a real provider arrives (M7+), it
slots behind the same channel and the whole loop — panel, bundle
rendering, patch preview, accept path — is already battle-tested. This is
**contract-first development** at feature scale: the S02 security tests
pinned settings; here the pipeline types pin a whole product loop.

## 2. The three contracts, in plain words

From `shared/ipc-contract.ts` (06's shapes, MVP-sliced):

```text
AiOperation        what you asked: the selection(s), your instruction
                   (free text is first-class; presets only prefill it),
                   and a target — replace the selection, append to the
                   note, or create a new note
AiResponseBundle   what came back: typed blocks (answer, question, ...)
                   plus patchProposals — and, already present but empty,
                   claims/evidence/verification/uncertainties/
                   actionTraceIds. Those arrays are S09/S10's seats,
                   shipped now so nothing reshapes later.
PatchProposal      the file changes on offer: replace-range / append /
                   create, each with the proposed text, status pending
                   until you decide
```

Block `kind`/`role` are open strings on purpose (06's implementation
warning): new block kinds must degrade to readable text, never require a
schema migration.

## 3. The invariant that matters: the AI channel cannot write

`runAiOperation` in main is **pure compute** — it validates the operation
(untrusted renderer input: caps on instruction length, selection size,
range sanity) and returns a bundle. There is no code path from it to the
filesystem. Accepting a patch flows through what you already trust:

```text
replace / append  ->  dispatched into the EDITOR BUFFER, then saved
                      immediately through the editor's own save (mtime
                      handshake, byte fidelity). The editable preview WAS
                      the review; accepting is the decision. Ctrl+Z +
                      save reverts — it's an ordinary undoable edit.
create            ->  createNote — exclusive wx, never clobbers; the
                      tree refreshes and the new note opens.
```

So "the AI edited my file" is structurally impossible; only "I accepted a
reviewed change" exists (06's safety rule: no silent writes; the patch
preview is the review). Two extra guards in the panel: the proposal text
is EDITABLE before accepting (accept/edit/reject, S08's words), and if
the buffer changed while you reviewed, applying asks first.

Dogfooding note: the first version applied to the buffer WITHOUT saving —
"accepted" then evaporated behind the read view and the discard guard.
Owner testing caught it within the hour; accept-saves-immediately is the
repair. The review moment is the preview, not a second save step.

## 4. Why the mock lives in the main process

The mock could have been ten lines in the renderer. It sits in main
because that seat is architectural (12): real providers hold API keys and
make network calls — strictly trusted-layer business. Placing the mock
there means S09's ActionTrace (emitted where execution happens) and M7's
provider adapter change nothing renderer-side. The seat costs nothing
today and buys the whole boundary later.

Determinism is also deliberate: same operation in, same block content
out — which is what makes `tests/ai-mock.test.ts` possible, and what
makes the pipeline debuggable while it grows.

## 5. Walk the loop yourself

1. Open a note → **Edit** → select a sentence → **AI** button.
2. Pick a preset (or type your own instruction), choose **append**, Run.
3. Read the bundle: an answer block, a question block, and the patch
   with its editable proposed text.
4. Edit the proposal (add a word), **Accept** → applied AND saved:
   `git diff` right away shows one file with exactly the accepted text.
   `Ctrl+Z` then save reverts — it stays an ordinary undoable edit.
5. Run another one with **new note** (the destination path is prefilled
   beside the current note — visible, editable) → accept → the tree
   refreshes and the new note opens (wx: run it twice, the second create
   fails — nothing clobbered).
6. In DevTools, send garbage:
   `await window.atomik.runAiOperation({ id: 'x' })` → rejected in main.

## 6. Vocabulary you now own

```text
response bundle    structured multi-block answer + proposals, not prose
patch proposal     a file change with a status, awaiting your decision
mock-first         build and test the loop with a fake brain
provider seat      the trusted-layer slot real AI adapters will fill
pure compute       a channel that can read its input and nothing else
accept/edit/reject the three exits of every proposal (06)
```

## 7. What arrives next

- **S09** — the minimal ActionTrace: one JSON line per operation in
  `.atomik/usage/private/actions.jsonl` + a compact badge. The
  `actionTraceIds: []` you saw in the bundle is its seat.
- **S10** — mechanical truth labels: `source-backed` only when
  deterministically derivable (anchor/quote match), everything else
  `model-only`. The empty `claims`/`evidence` arrays are theirs.
