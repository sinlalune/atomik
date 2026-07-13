---
type: Atomik Coding Path
title: Web source tab — isolated view, explicit import, reader extraction (M5)
description: A web page becomes a first-class source through an EXPLICIT import — isolated live view, snapshot + reader.md as derived representations with full web evidence metadata; the grounding/import boundary stays hard.
tags: [coding-path, m5, web, source, webcontentsview, reader, snapshot, import]
timestamp: 2026-07-13T11:30:00Z
atomik:
  id: CP-MVP-006
  status: draft
  current_step: S01
  base_commit: null
---

# Goal

Milestone 5 (18 §M5): web browsing as an isolated source viewer whose
value lands in FILES — the user opens a page in an isolated web view,
explicitly chooses **Import as source**, and gets the standard bundle
(`sources/web/<slug>/`): `source.md` dossier carrying the 09 evidence
metadata (URL, canonical, title, accessed_at, hashes, license note),
`snapshot.html` as captured evidence, `reader.md` as the derived,
correctable text. Selection → AI → note works on reader text exactly
as it does on extracted PDF text. The truth boundary is part of the
milestone: import is durable source ingestion; provider grounding is a
separate transient path; grounding links are NEVER auto-crawled or
indexed.

Dividends inherited from CP-MVP-003/005: the source-bundle pattern and
its gates, derived-file provenance + ONE ActionTrace per extraction,
the delete/re-run lifecycle as standing practice, the @ citation menu,
source-view routing, the correction-flip hook (reader.md joins
transcript.md and extracted.md), tab params as recoverable UI state.

# Definition of done

- **Isolated web view**: a web tab (new view kind per 03) with URL bar
  + back/forward/reload, remote content in an ISOLATED
  WebContentsView-or-equivalent (S02 decision under 13): no Node, no
  Atomik IPC, no provider keys, no preload bridge into remote pages;
  the URL rides the tab param and restores on reopen (03, learned at
  CP-MVP-003 S07 — recoverable UI state ships WITH the view, not
  later). If live embedding fails, reader/snapshot import of a fetched
  page may still work (09 invariant).
- **Import as source (explicit)**: an Import-as-source action — never
  automatic — creates `sources/web/<slug>/` through the standard
  gates: `source.md` (identity/status + web evidence metadata: URL,
  canonical URL, title, author/publisher when present,
  published/updated when present, accessed_at, snapshot sha256, reader
  sha256, license/copyright note, redirect chain when relevant),
  `snapshot.html` (captured evidence, byte-hashed), `index.md` map.
  `sources/web/` enters `.gitignore` AT bundle-type creation (the
  2026-07-09 incident rule — new user-media zones are protected on
  day one).
- **Reader extraction**: `reader.md` lands as a visibly DERIVED
  representation behind the adapter seam (07) — extraction identity +
  trace id in frontmatter, ONE ActionTrace per run (33); the
  correction flow works on reader.md (the shared flip hook gains its
  third derived file); **Delete reader… / re-run ships in the same
  unit, round-trip tested** (standing practice). Engine is a heavy
  dependency: dated 15 decision with rejected alternatives recorded.
- **Selection → AI → note**: reader.md selections flow through
  labelClaims (evidence: relPath + range + quote hash, unchanged
  mechanism); the @ menu offers web bundles (URL citation, dossier
  link, reader quote blocks read at apply); note links to web dossiers
  route to the source view.
- **The boundary holds**: no grounding-provider links are harvested,
  crawled, or indexed; import requires the explicit user action; live
  view and extracted view stay separate claims (rendering ≠
  extraction, the 09/10 invariant).
- Every new IPC channel obeys 13 §IPC; no new heavy dependency without
  a dated 15 decision; tests/typecheck/build/smoke green per unit;
  **module notes + ledger + log.md in the same work unit as EVERY
  step** (the CP-MVP-003 acceptance finding — no docs-less steps).

# Documentation coverage

Completeness rule (35): every bedrock page 00–35 accounted for.

## Required

- `docs/bedrock/00_00-orientation.md`
- `docs/bedrock/02_02-learning-loop.md` (correction effort on reader.md)
- `docs/bedrock/03_03-workspace-tabs.md` (the web tab IS a new view kind)
- `docs/bedrock/04_04-file-first-model.md` (bundle shape, derived files)
- `docs/bedrock/05_05-resource-selection-model.md` (text anchors on reader)
- `docs/bedrock/06_06-ai-patch-pipeline.md` (selection → AI → note)
- `docs/bedrock/07_07-source-adapters.md` (reader behind the seam)
- `docs/bedrock/08_08-capture-source.md` (evidence treatment precedent)
- `docs/bedrock/09_09-web-source-tab.md` (THE page for this path)
- `docs/bedrock/12_12-electron-mvp.md` (view/service boundaries)
- `docs/bedrock/13_13-electron-security.md` (REMOTE CONTENT — re-read in
  full before S02 and again before the web-view step; this path embeds
  untrusted pages)
- `docs/bedrock/14_14-app-kernels.md`
- `docs/bedrock/15_15-maintainability.md` (reader engine + embed
  approach are dated decisions)
- `docs/bedrock/17_17-self-evolving-docs.md`
- `docs/bedrock/18_18-roadmap.md` §M5 (+ M6 boundaries)
- `docs/bedrock/22_22-agent-handoff.md`
- `docs/bedrock/27_27-git-compatibility.md` (snapshots in the vault;
  .gitignore decision recorded)
- `docs/bedrock/28_28-truth-evidence-model.md` (web evidence metadata,
  access-date/revision-dependent claims)
- `docs/bedrock/29_29-verification-grounding-router.md` (the M5 truth
  boundary: import vs grounding — read the boundary sections even
  though the router itself is M7)
- `docs/bedrock/33_33-retrieval-local-execution-cost.md` (extraction traces)
- `docs/bedrock/35_35-coding-path-execution-state.md`
- `docs/agents/agent_documentation_contract.md`

## Conditional

- `docs/bedrock/01_01-workbench-first.md` — if page loading/embedding
  threatens daily-use responsiveness.
- `docs/bedrock/11_11-markdown-page-model.md` — if reader.md shape
  questions arise.
- `docs/bedrock/24_24-doc-templates.md` — before new module notes.
- `docs/bedrock/26_26-okf-agent-context.md` — not expected.
- `docs/bedrock/32_32-truth-investigation-record.md` — if provider
  display/licensing behavior needs recording during import metadata work.
- `docs/bedrock/34_34-local-execution-investigation-record.md` — if a
  reader-engine comparison bench is run.

## Deliberately excluded

- `10_10-pdf-source-tab.md` — shipped (mvp, CP-MVP-003).
- `16_16-dev-docs-tab.md` — shipped.
- `19_19-dsl-future.md`, `20_20-relations-future.md`,
  `21_21-canvas-future.md` — later milestones; trails ("trail creation
  later", 18 §M5) ride the relations work, NOT this path.
- `23_23-references.md` — ad hoc.
- `25_25-use-cases.md` — narrative.
- `29` router IMPLEMENTATION, `31_31-truth-lens-ux.md` — M6/M7.
- `30_30-public-knowledge-dictionary.md` — M10.

# Execution

- [ ] S01 Bootstrap (22): reconcile ledger vs repo; record `base_commit`;
      re-read 09 + 03 + 05 + 13 (remote-content sections in full).
- [ ] S02 Engine decisions (15, dated; 13-constrained): (a) the embed
      approach — WebContentsView vs webview tag vs BrowserView, with the
      isolation posture (partition, permissions, no preload into remote
      content) written down; (b) the reader-extraction engine —
      Readability vs alternatives; (c) the snapshot format — raw HTML vs
      single-file; record what was NOT chosen and why. No install
      without the record.
- [ ] S03 Web view tab: new view kind, URL bar + nav controls, isolated
      embed per S02, URL in the tab param + restore; navigation events
      stay inside the view (no vault writes); tests.
- [ ] S04 Import as source: explicit action → `sources/web/<slug>/`
      bundle (source.md with the 09 evidence metadata + snapshot.html
      hashed + index.md) through the gates; `sources/web/` into
      `.gitignore` in the SAME commit that creates the bundle type;
      dossier opens on import; tests.
- [ ] S05 Reader extraction: reader.md derived (identity + trace id,
      ONE ActionTrace, wx no-clobber) behind the adapter seam;
      Delete reader…/re-run in the same unit, round-trip tested;
      correction flip extends to reader.md (one hook, three derived
      files); extraction status on the dossier; tests.
- [ ] S06 Citations + selection → AI → note: @ menu offers web bundles
      (URL citation, dossier link, reader quote blocks); web dossier
      links route to the source view; selection → AI → note carries
      URL provenance; tests.
- [ ] S07 Acceptance run against 18 §M5 intents + the truth/provider
      boundary; owner validation on real pages; review and close.

# Current checkpoint

```text
base commit : null — not started; set at S01
changed     : path PROPOSED 2026-07-13 at CP-MVP-003 close (M4 done,
              owner-validated). Drafted from 18 §M5 + bedrock 09 per
              the register's opening rule. Awaiting owner acceptance;
              execution begins at S01 only after acceptance (22).
tests       : 262 passing / 28 suites at proposal time
next action : owner reviews/accepts this path; then S01 bootstrap
blockers    : none recorded. Standing note: provider key store found
              EMPTY 2026-07-09 — re-enter via ⚙ before cloud-rung work
              (not expected on this path's critical line).
```

# Blockers

- None recorded.
