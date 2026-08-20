---
type: Atomik Coherence Audit
title: Coherence audit — CP-RENDER-REPAIRS @ d44d381
timestamp: 2026-08-20T17:39:16.026Z
atomik:
  path: CP-RENDER-REPAIRS
  branch: path/cp-render-repairs
  head: d44d381d6244b1025914056cbfc732ae9d0055cb
  base: f58093e
  verdict: drift noted, proceeding
---

# Coherence audit — CP-RENDER-REPAIRS @ d44d381

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

No after one closure correction. The audit found that ADR-014 §4 still said a
multi-line display delimiter must occupy its own line, while the accepted path
and both scanners now deliberately accept `$$` followed by expression text and
a later line ending in `$$`. ADR-014 now states the implemented grammar and the
shared read/live discovery rule. Its UI section also records the host-owned
canvas lifecycle rather than leaving pan/zoom and the moved-node overlay as
architecture known only to source comments.

**The Electron/security boundary held.** No IPC channel, preload method, fetch
surface, provider context, file format, or canonical write was added. Mermaid
exploration transforms the SAME DOM node `safeSvgNode` accepted. Expand moves
that node rather than cloning or reparsing it, returns it before renderer
teardown, and never relaxes `foreignObject`, external-resource, event-handler,
or CSP guards. Vega warnings use the existing `RichRenderHandle.diagnostics`
channel and do not turn a warning into a refusal.

**The UI/accessibility contract held in behavior.** Every new diagram action
has one accessible name and title; its visible label appears on hover and
focus; the viewport names its keyboard contract; Escape/Close restore the
modal's node and focus; reduced-motion removes label animation. Chrome colors,
spacing, borders and focus treatments consume existing tokens. The canvas's
140–460 px content bounds and overlay viewport caps are behavioral geometry,
not a new reusable chrome scale.

One UI-system drift remains recorded rather than hidden: the imperative DOM
toolbar cannot consume the React components in `icons.tsx`, so
`diagram-action.ts` owns one small static SVG path table. It is centralized
for all four diagram actions and never receives authored content, but it is an
exception to bedrock 36's “icons from icons.tsx” wording. If a second
imperative toolbar appears, the icon primitives should be split into a shared
code-native source instead of growing another table.

### Does it duplicate something another running path is building?

No, with real overlaps inspected.

CP-OPEN-DOCK merged into `master` while this ceremony was being recorded. This
branch therefore rebased from its original `f58093e` base onto the new trunk
tip `7f8d026`; all eight commits replayed without conflict. Both paths touch
`styles.css` and the editor/shell area notes, but Open Dock owns workspace
opening/docking while this path owns rich block presentation. The combined
result passed typecheck, 1,101 tests, production build and the real-Electron
rich smoke.

Two unmerged branches are actually running even though this branch's generated
`ACTIVE.md` cannot see them:

- **CP-MVP-011** overlaps `chat-file.ts`, `styles.css`, and the editor/shell
  notes. Its `chat-file.ts` additions persist agent-trace/unanswered metadata;
  this path changes only the earlier `chatSlug` naming seam. Its CSS additions
  style consulted Wikimedia material and tool receipts; this path's selectors
  are confined to rich diagram blocks and overlays. Same files, distinct
  contracts, no duplicated implementation.
- **CP-MVP-012** is a declared dependent branch of CP-MVP-011 with no code step
  yet. Its apparent overlap is inherited from CP-MVP-011, not parallel work it
  has built. It already records that it cannot merge before its parent.

CP-MVP-011 will need to rebase after this merge. Its overlapping hunks are
separate today; any conflict is mechanical documentation/CSS placement, not a
competing design.

### Did it introduce architecture that belongs in an ADR and has none?

No after amending ADR-014 in this closure unit.

The multi-line display grammar and the diagram exploration lifecycle change
the accepted rich-renderer contract, so they now live in ADR-014: one shared
grammar for read/live discovery; host-owned transforms over one sanitized
projection; the same node moved into and out of the overlay; bare-wheel page
scroll safety; Vega kept outside the spatial-canvas interaction model.

The other changes are local repairs inside existing contracts. Vega warnings
populate the diagnostics field ADR-014 already defined. `chatSlug` strips app
bookkeeping before applying its existing naming policy. Neither creates a new
boundary, format, persisted state, or architectural choice needing another
ADR.

### Is anything now documented in two places that will drift apart?

Yes, but the known copies are now aligned and mechanically pinned where they
can be.

The display grammar appears in `syntax.ts`, ADR-014, the editor area note and
the capability-block tests. The audit caught two stale copies before merge:
ADR-014 still described the old delimiter rule, and the historical
CP-AI-CAPABILITIES section of the editor note still said three warnings “now”
ship. Both were corrected. The executable pin proves the repaired parser finds
the former trap and proves the prompt no longer says it exists; the prompt's
size ceiling fell from 1,700 to 1,450 with the deleted warning.

Diagram behavior necessarily appears at three levels: ADR-014 owns the durable
lifecycle boundary, the editor/shell notes explain operations, and this path
ledger records why the owner changed the form during the bench. Tests pin the
fit/zoom arithmetic, the bare-wheel promise, keyboard/naming surface,
moved-node lifecycle, and teardown. The numeric content bounds are not copied
into a prompt or format contract.

There is one execution-plane finding outside renderer scope. While
CP-RENDER-REPAIRS carried `status: running`, `ACTIVE.md` said no path was
running, and the branch's `cairn-check` passed because derived-view freshness
is enforced only on trunk. CP-MVP-011 and CP-MVP-012 are likewise visible only
from their own branches. A view generated solely from files already merged to
trunk cannot enumerate unmerged running paths. This path does not redesign
Cairn during renderer closure; the finding belongs to the CP-OPS-001 pilot.

The final status transition exposed a second side of the same protocol gap.
The written merge sequence requires the path to set `status: done` in the
change that lands it, but rule `branch-path` rejects any `path/*` checkout whose
declared status is not `running`. Therefore the final done-state branch cannot
itself produce an all-green `cairn-check`; the same commit passes once merged
and checked on trunk. The renderer/code gates were run green on rebased head
`d44d381` while the path was still `running`, and the trunk check is repeated
after merge. This contradiction is a CP-OPS-001 validator defect, not a reason
to falsify the durable done state.

## Verdict

**Drift noted, proceeding.**

The accepted renderer, security and UI boundaries hold; the stale ADR/module
wording found by the audit was repaired before merge; the concurrent branch
overlaps are distinct and the rebased combined result is green. Two advisory
findings carry forward without blocking this path: centralize code-native icon
primitives if another imperative toolbar appears, and repair both Cairn
contradictions — invisible unmerged running paths and the final `done` branch
being rejected by `branch-path` — during the CP-OPS-001 pilot.
