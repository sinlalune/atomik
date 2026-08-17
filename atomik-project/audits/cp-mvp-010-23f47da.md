---
type: Atomik Coherence Audit
title: Coherence audit — CP-MVP-010 @ 23f47da
timestamp: 2026-08-17T14:43:16.367Z
atomik:
  path: CP-MVP-010
  branch: path/cp-mvp-010
  head: 23f47da7a2fd02a9c0d050f75110be8c61c572ac
  base: 2370546
  verdict: drift noted, proceeding
---

# Coherence audit — CP-MVP-010 @ 23f47da

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

No. The path-specific rebased diff (`master...23f47da`; the scaffold's
historical `base_commit` also contains unrelated trunk work) implements the
documents named by the path:

- Bedrock 04/33 and ADR-013 remain file-first. Markdown is the only canonical
  corpus; `.atomik/index/retrieval.json` is lazy, deletable, rebuildable, and
  byte-deterministic. The pure BM25F core has no filesystem, Electron, DOM,
  network, native module, vector store, or new dependency. The dated fixture
  and real-corpus measurements preserve the thresholds that can reopen the
  storage decision.
- Bedrock 20 plus ADR-011 remain the one graph contract. Expansion reads the
  existing typed nodes/edges projection, accepts label weights as data rather
  than inventing an ontology, and excludes unresolved/external targets from
  vault expansion. One maintenance door updates both derived indexes and
  broadcasts after every write verb.
- Bedrock 26/06 are preserved by a bounded, inspectable ContextPacket injected
  through the existing read-only reference-selection composition. The
  renderer requests grounding, but MAIN validates the query/scope and decides
  the packet. No provider key or generic bridge crosses preload (13), and this
  path makes no network request; the external half remains CP-MVP-011.
- Bedrock 28/31's epistemic split is explicit: retrieval score is relevance,
  never truth; a citation is traceability, never automatic correctness;
  invented citation numbers stay visible; and the unsound rendered-text claim
  overlay is disabled until M6 owns a stable Truth Lens contract.
- Bedrock 33's operation-cost rule is met without content leakage. Retrieval
  traces record stages, counts, estimated context tokens, coverage, latency,
  and zero *external* billing; they never record query or excerpt content.
- Bedrock 15/36 are respected: no dependency was introduced, the conversation
  remains one centred measure with role alignment inside it, citation visuals
  use existing tokens/focusable anchors, and the owner accepted the final
  decimal and multi-sentence-quote behavior on the persisted-chat bench.

The audit did find one non-semantic Git-fidelity defect: the script additions
had reserialized the existing em dash in both package descriptions as
`\u2014`. The working close restores the authored character before merge.

### Does it duplicate something another running path is building?

No feature is duplicated. The only other worktree path currently running is
CP-RICH-MARKDOWN. Its branch is one S01 architecture commit ahead of trunk and
builds lazy KaTeX/Mermaid/Vega-Lite/code projections and decoration-only code
diagnostics; CP-MVP-010 builds retrieval, grounding, and citation decoration.

There is declared integration drift rather than duplication. Both paths touch
`apps/desktop/package.json`, `styles.css`, `docs/index.md`, and the editor/shell
module notes. CP-RICH-MARKDOWN's opening record explicitly names CP-MVP-010's
adjacent chat/citation presentation and says that path must rebase after this
self-merge. Its ADR-014 also keeps `noteMarkdown()` synchronous and hydrates
after mount, which is compatible with CP-MVP-010's post-render citation pass;
the later rebase must preserve ordering and the `.chat-turn-body` citation
contract. Distinct session/audit/log files remain conflict-free.

CP-MVP-011 is reserved, not running. CP-MVP-010 deliberately leaves it the
model-driven tool loop, Wikimedia network sources, external citations, and
save-as-source gesture; no provisional network code leaked into this branch.

### Did it introduce architecture that belongs in an ADR and has none?

No. The one reversible architectural choice made here—pure TypeScript BM25F
instead of the earlier SQLite expectation—is accepted and bounded by ADR-013,
including migration and numeric reconsideration triggers. ContextPacket shape,
retrieval ladder/evaluation, derived-index location, truth separation,
ActionTrace privacy, Electron seats, and graph vocabulary already belong to
bedrock 26/33, 04, 28, 13/14, and ADR-011 respectively.

The index-change push, citation DOM decorator, reach control, and packet UI are
implementations of those existing contracts. They add no canonical schema,
source format, provider, generic IPC bridge, dependency, or network authority
that needs another ADR.

### Is anything now documented in two places that will drift apart?

No conflicting source of truth was added. The layers have different jobs:

- ADR-013 owns the engine/storage decision and reversal triggers;
- the lexical-retrieval learning note owns the reusable implementation lessons;
- the dated baseline record owns measured corpus numbers;
- module area notes own current runtime contracts by area;
- D15 is a generated projection of those contracts and measurements;
- the coding path and session files own execution history and owner rulings.

Numeric runtime pins live in code/tests and are explained—not independently
redefined—in the ADR and module notes. The diagram and learning indexes are
shared views and may conflict mechanically with CP-RICH-MARKDOWN, but that path
already owns the later rebase; they do not create a second canonical contract.
The audit's em-dash correction also removes unrelated package-metadata churn.

One execution-plane drift remains outside this path's product scope:
`cairn-active` regenerates only the marked running-path bullet block, while
`paths.md` also calls register status generated and `ACTIVE.md` still contains
static overlap prose from an older pair of paths. CP-MVP-010 updates its
numbered register row so the merged portfolio state is factual, but does not
hand-edit `ACTIVE.md` (explicitly forbidden). CP-OPS-001 owns making the whole
view genuinely derived; this does not alter retrieval architecture or block
the accepted merge.

## Verdict

**drift noted, proceeding**

CP-MVP-010 is coherent with bedrock, ADR-011/013, its accepted scope, and the
owner's closing rulings. The only carried drift is the explicit
CP-RICH-MARKDOWN integration obligation on shared styles/package/docs; that
path is already required to rebase after this merge and duplicates no CP10
feature, plus the CP-OPS-001 derived-view gap recorded above. The one defect in
CP10's own diff—package-description escape churn—is corrected in the closing
change. No conversation is required before merge.

*(clean · drift noted, proceeding · needs a conversation before merge)*
