---
type: Atomik Session Record
title: CP-AI-CAPABILITIES closing ceremony — the model was told, and it listened
timestamp: 2026-08-20T00:00:00Z
tags: [closing-ceremony, ai, prompt, capabilities, wikilink, bench]
branch: path/cp-ai-capabilities
path: CP-AI-CAPABILITIES
ceremony: closing
---

# CP-AI-CAPABILITIES closing ceremony

Run with the owner 2026-08-20. Acceptance given plainly: *"bench is validated
on my side"* — the whole bench, rounds A through D, not round A alone.

## Recall, from the repository

Derived from the path file, its ledger, the two bench rounds recorded in
`2026-08-20-cp-ai-capabilities-s03-bench-round1.md`, and the opening check.

```text
S01  two capability blocks, composed through the plan, drift-tested
S02  pointing wikilinks in chat, resolved through the vault's own pipeline
S03  owner bench on real generations; three traps found and warned about;
     generation defaults raised to match what the blocks ask for
```

**What the bench actually proved.** The model reached for the right projection
every time — mermaid for structure, vega-lite with inline `data.values` for
data, display math for the derivation, prose where prose was right. Before S01
it had never been told any of that existed. The prompt half of this path works.

**What the bench found instead.** Five defects, none of them in the prompt:

```text
1  bar mark on a log scale draws zero-height bars   upstream Vega-Lite
1a the adapter swallows Vega's own warning          Atomik
2  $$…$$ in a Mermaid label refuses the diagram     upstream + our SVG guard
3  multi-line $$ needs $$ alone on its own line     Atomik
4  chatSlug does not strip <!--…-->                 Atomik
5  a large diagram cannot be explored               Atomik
```

Traps 1, 2 and 3 are now warned about in `rendering-capabilities`, each pinned
to the code that causes it. Round 2 confirmed the warning took: every display
block in the following generation put `$$` alone on its own line.

**What it cost.** `rendering-capabilities` 1,572 chars (~393 tokens) on EVERY
request; `note-conventions` a further ~118 on note generation. Roughly double
the previous system message. Both are ordinary overridable blocks — the owner
can cut either from the system-plan UI with no code change. The asserted
ceiling was raised 1,400 -> 1,700 deliberately, in the open.

## Owner directives taken at the ceremony

- Default engine leads with `google` / `gemini-3.7-flash`.
- Default output budget 2000 -> 5000, in main and the renderer, pinned equal.
  Recorded as a widening: neither was in the accepted scope.

## Backlog leaving this path

Defects 1a, 3, 4 and 5 are unfixed and deliberately so — every one is a
renderer or plumbing repair, and this path's Deliberately excluded list rules
out new renderers, fences and relaxed limits. They go to a follow-on labelled
path, and **how they are grouped is a question for that path's own opening
check**, not one to settle in passing here.

The Excalidraw question the owner raised sits with them but is not one of them:
what a fork would deliver is the Scene IR that bedrock 19 already reserves —
`source -> parser -> AST -> validator -> scene model -> layout engine ->
renderer` — and bedrock 19 rejects implementation-specific scene JSON in the
same words that describe `.excalidraw`. It is roadmap material, unpersisted
beyond this line, and no amendment is proposed from this path.

## Roadmap

No amendment proposed. This path was labelled, claimed no milestone, and
nothing it found changes what 18 says.

## Verdict

Accepted. Path merges itself.
