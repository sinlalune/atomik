---
type: Atomik Coherence Audit
title: Coherence audit — CP-AI-CAPABILITIES @ 9007e07
timestamp: 2026-08-20T10:42:30.647Z
atomik:
  path: CP-AI-CAPABILITIES
  branch: path/cp-ai-capabilities
  head: 9007e0723a2914df6f0da074d778431cc4d4e0e1
  base: 80b131a
  verdict: drift noted, proceeding
---

# Coherence audit — CP-AI-CAPABILITIES @ 9007e07

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

No, and two places where it came close are worth naming.

**13 (electron-security) held.** The path adds a capability STATEMENT, never a
capability. `rendering-capabilities` describes what the renderer already does
and — importantly — what `safe-svg.ts` and the Mermaid source guards already
refuse. Nothing in the diff relaxes a guard. The bench pushed directly on this:
the answer to "can KaTeX render inside a Mermaid box" is no, precisely because
`foreignobject` stays in `FORBIDDEN_ELEMENTS`, and the block was written to
tell the model that rather than to negotiate it.

**19 + ADR-010 held.** No fenced third-party projection is described as the
Atomik DSL, and the Scene IR stays unmentioned in every prompt. The owner
raised forking Excalidraw during the bench; it was answered as roadmap
material against bedrock 19's own pipeline, and deliberately not persisted as
architecture.

**28 (truth/evidence) held.** Pointing and citation stayed separate: a
pointing wikilink is an ordinary link pill routed by resolved `data-rel`,
citation keeps its numbered marker and chip, and click routing runs citation
FIRST so the two can never be confused at the point of action.

**ADR-011 held.** The typed-edge grammar reaches note generation only. A chat
answer still cannot assert an edge into the graph, which was the whole reason
`note-conventions` is absent from the chat plan.

### Does it duplicate something another running path is building?

No — no other path carries `status: running`. CP-MVP-010, CP-PROVIDERS,
CP-FEEDBACK and CP-RICH-MARKDOWN are all merged, and CP-MVP-011 has not
opened. The declared-write overlap ACTIVE.md warned about (`ipc-contract.ts`,
`electron-main/index.ts`) never materialised: this path added no IPC channel,
so it never touched either hot file.

### Did it introduce architecture that belongs in an ADR and has none?

ADR-015 covers the blocks themselves. Two S03 additions arrived after it and
are recorded only in module notes and this path's ledger:

- **The traps bullet, and its pin direction.** "Warn the model about a defect,
  and pin the warning to the defect so that FIXING it fails the test" is a
  reusable rule, not a one-off. It is currently prose in
  `atomik-desktop-editor.md`. If a second path adopts it, it earns an ADR.
- **The output budget as one number.** `DEFAULT_MAX_OUTPUT_TOKENS` and
  `PARAM_LIMITS.maxTokens.default` are now asserted equal. That is a small
  contract between main and the renderer with a test but no decision record.

Neither blocks the merge. Both are flagged so the next path that touches them
does not rediscover the reasoning.

### Is anything now documented in two places that will drift apart?

Yes, and this is the audit's real finding — it is the same finding the
CP-RICH-MARKDOWN audit made, one layer further along.

The renderer's limits and behaviour now exist in FOUR places: `DEFAULT_RICH_LIMITS`,
ADR-014 §6, the prompt block, and — new in S03 — the prompt block's
descriptions of THREE UPSTREAM BEHAVIOURS the repository does not own
(Vega-Lite's log-scale collapse, Mermaid's katex/HTML-label override, and our
own `$$` parser).

The mitigation is real but partial. Each claim is pinned by a test that reads
the actual behaviour, so a claim cannot silently become false. What no test can
catch is a claim that becomes UNNECESSARY: if Vega-Lite ever fixes the bar/log
baseline upstream, the drift test keeps passing against the new version only if
the behaviour is unchanged — and if it changes, the test fails loudly, which is
the desired outcome. The genuine exposure is the third trap: when the `$$`
parser is repaired in the follow-on path, `discoverDollarMath` starts returning
a span, the pin fails, and whoever fixes it MUST remove the warning. That is by
design and is documented, but it depends on the next path reading its own
failing test correctly rather than adjusting the assertion.

Second, smaller: `atomik-desktop-shell.md` and `atomik-desktop-ai.md` both now
describe the output budget change. The shell note frames it as per-request
cost, the AI note as a main/renderer contract. Different framings of one fact
in two notes is exactly how drift starts.

## Verdict

**Drift noted, proceeding.**

Nothing contradicts an accepted decision and nothing duplicates other work.
The drift is documentary and was taken on knowingly: a prompt that describes
upstream defects is a fourth copy of behaviour the repository does not control.
It is pinned as tightly as it can be, and the pins are built to fail when the
defects are fixed rather than when they persist.

The one thing to carry forward: **the follow-on path that repairs the `$$`
parser inherits an obligation** — its first failing test will be the drift pin,
and the correct response is to delete the warning from the prompt block, not to
loosen the assertion.
