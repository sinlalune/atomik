---
type: Atomik Session Record
title: CP-RICH-MARKDOWN closing ceremony — acceptance, hardening ruling, backlog
timestamp: 2026-08-17T00:00:00Z
tags: [ceremony, closure, rich-markdown, acceptance, backlog]
path: CP-RICH-MARKDOWN
branch: path/cp-rich-markdown
---

# CP-RICH-MARKDOWN closing ceremony

Run 2026-08-17, before merge, per bedrock 22. The recall below is derived from
the path file, its six session notes and the branch history — not from
conversation memory.

## Recall presented

Eight steps, S01–S07 executed. Delivered: KaTeX math, secure Mermaid, inline-
data Vega-Lite, broad lazy code highlighting with decoration-only diagnostics,
one projection registry owning the shared lifecycle, and a real-Electron smoke
lane. Receipts: opening check, S01 baseline, S04 Mermaid, S05 Vega-Lite, S06
code/diagnostics, S07 owner bench.

The path's own bench found six defects AFTER every gate was green, all six the
same shape — a second definition of something that already had one. The full
account is in `2026-08-17-cp-rich-markdown-s07-owner-bench.md`.

## Owner rulings

**Acceptance — the path is accepted.** The owner walked the whole bench and
reported "everything is good"; the six defects are accepted as fixed against
the running app.

**Hardening — HONOR the definition of done, do not amend it.** Asked whether to
trim the remaining bench scope, skip it, or honor it literally, the owner chose
to honor it. This is the ruling that produced `tools/rich-bench.mjs` (S01's
deleted baseline made re-runnable) and grew `smoke:rich` into a lifecycle and
accessibility bench. It is worth recording WHY the alternative was tempting and
wrong: the argument for trimming was that the remaining items were
environment-independent logic already covered by tests. The argument that won
is that this is the path whose bench found six defects behind green gates, and
"already covered by tests" is exactly the reasoning that failed here.

**Backlog — CP-AI-CAPABILITIES next, ahead of CP-LANGUAGE-NOTES.** A roadmap
reorder (18), owner-gated and owner-made. The subject: the AI writes into a
surface it has never been told about. Rendering is already wired — chat, inline
AI and the AI note preview all hydrate through the same registry — but no
prompt block mentions math, diagrams, charts, or the ADR-011 edge grammar. The
capability is half-built and the missing half is prompt text, not an engine.

**Chat wikilinks — for POINTING, accepted; not for citation.** The owner asked
whether chat should cite retrieved notes as wikilinks. It must not: chat already
has a citation mechanism the owner benched and ruled on (`shared/chat-citations.ts`,
bench round 6 — "a citation is not a link that happens to be short"), and
wikilinks render as the very link pill that ruling rejected. The owner clarified
the intent was POINTING — "go read that note" — which genuinely has no mechanism
today. It enters CP-AI-CAPABILITIES as a distinct affordance from citation.

## What the agent believes needs challenging

- A real screen-reader pass is the one definition-of-done line this path could
  not close by machine. The a11y floors are asserted mechanically (roles, names,
  focus, `aria-pressed`, MathML presence); none of that is listening to it.
- The trunk the owner dogfoods still cannot start (`Error: Electron uninstall`,
  the binary was never unpacked). Left untouched deliberately — one writer per
  tree — but it means this path's work is unusable there until fixed.
- `paths.md`'s open question stands answered by this path: the coherence audit
  did not find what the bench found. The BENCH did. A path that ships a
  rendering surface should bench before hardening, not after.
