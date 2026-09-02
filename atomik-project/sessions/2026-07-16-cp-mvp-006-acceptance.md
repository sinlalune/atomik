---
type: Atomik Session Record
title: CP-MVP-006 acceptance run — web source tab (M5)
timestamp: 2026-07-16T00:00:00Z
path: CP-MVP-006
ceremony: closing
---

# CP-MVP-006 acceptance (2026-07-16)

Machine sweep of 18 §M5 + the path's definition of done, closed on
the owner's directive of 2026-07-16 ("Clore CP-MVP-006 validé").
Owner validation accumulated across three dogfooding days
(2026-07-13 → 2026-07-16) rather than one sitting — recorded per
item below.

## §M5 intents sweep

- **isolated WebContentsView** ✓ — one view per `source-web` tab,
  registry in main; the four required settings + `persist:web-sources`
  partition (on-disk evidence: session lives OUTSIDE the repo), NO
  preload into remote content, http(s)-only enforced main-side,
  deny-by-default permissions, downloads cancelled, popups
  browse-in-place; UA/client-hint presentation per the dated S02/S03c
  decision (Firefox presentation on Google auth hosts only). OWNER
  VALIDATED 2026-07-13: Google login through the wall, COLAB RUNS IN
  THE PANE, web tab splits beside other tabs (panes=2 probe + owner
  workbench use).
- **reader extraction** ✓ — snapshot.mhtml (the page AS RENDERED,
  never a re-fetch) → mhtml parse → linkedom → Readability →
  turndown+gfm; TEXT AND IMAGES (media/ hashed, relative refs);
  structure-first pass preserves heading/table hierarchy (S05e);
  live "Aa reader" mode reads in place with no file; extraction off
  the main process since the perf pass (834 ms freeze → 13 ms).
  PROVEN on a real Wikipedia capture (92 KB md, 116 SVG math renders
  — the study-math case). Delete reader…/re-run round-trip removes
  media/ (lifecycle rule); correction flip serves reader.md as the
  third derived file.
- **snapshot/source.md dossier** ✓ — explicit Import as source only
  (09: never automatic): `sources/web/<slug>/` with source.md +
  snapshot.mhtml (sha256 + bytes) + index.md through the standard
  gates; every page-controlled string sanitized (injection defeated
  in tests); full-bundle cleanup on failure; `sources/web/` entered
  .gitignore in the SAME commit (incident rule). E2E proven
  (ATOMIK_SMOKE_WEB_IMPORT clicks the real button).
- **URL + access date + revision metadata** ✓ — dossier carries
  original/canonical URL, accessed_at, author/publisher/published/
  updated when the page offers them, snapshot hash, license row
  awaiting a human (28's access-date discipline). S06 extends the
  metadata into EVIDENCE: web-reader selections resolve to
  {url, dossierPath, accessedAt, title} on the EvidenceRecord.
- **selection → AI → note** ✓ — reader.md is an ordinary note;
  labelClaims containment + hashes unchanged; S06 adds URL provenance
  end to end (caller-side resolve, fs-free truth/ai-mock; note text
  carries "Source: [title](url) — accessed date · [dossier](…)";
  [page ↗] on source-backed chips; e2e rung ATOMIK_SMOKE_AI_WEB=1 →
  aiWeb=ok on the real app). S06b (owner report, same day): re-quoting
  an @ quote block no longer leaks '>' mid-sentence — display-side
  dequote only, evidence keeps raw bytes. OWNER VALIDATED 2026-07-16
  ("ca marche merci") after the merge.
- **trail creation later** — out of scope by design (18 §M5: trails
  ride the relations work); confirmed untouched.

## Truth/provider boundary sweep

- **import = durable ingestion** ✓ — user-explicit, lands files
  through the vault gates; **grounding = separate transient path** ✓
  — no grounding provider exists yet (M7), and nothing in the web
  path calls providers: remote content never triggers provider calls
  (13 §remote content, S01 pin; no provider code reachable from
  web-view/web-import/web-reader).
- **no automatic crawl/index from grounding links** ✓ — no crawler
  exists; the only fetches are the user's own navigation and the
  media capture of an explicit extraction (through main net gates
  into the bundle).
- **rendering ≠ extraction** ✓ — structural: live view renders the
  page; extraction reads the ON-DISK snapshot; live reader mode
  reuses readerFromHtml on the captured DOM without writing files.

## Definition-of-done deltas worth recording

- The workbench scenario (Colab on one panel + math PDF on the other,
  notes from both) was validated in parts: Colab-in-pane and the
  split on 2026-07-13, selection → AI → note on real quoted material
  on 2026-07-16 (the S06b screenshots). The owner closed the path on
  that accumulated evidence.
- Honest gaps carried forward: dossier license row stays
  human-pending by design; `ProjectView` passes no `onOpenSourceView`
  so dossier links from project notes open as markdown (pre-existing,
  all source kinds — candidate micro-fix, noted in the module notes
  survey of 2026-07-16).
- Owner-driven fixes folded during the path: S03b (flex strip),
  S03c (Google wall → dated UA decision), S04b (three dead-click
  classes), S05b–f (reader quality on real pages), S06b (re-quote).
  The dogfooding flywheel worked as designed.

## Path close

- Tests at close: 348 passing / 38 suites; typecheck/build/smoke
  green; e2e rungs: web=navigated, webImport=ok, webReader=ok,
  aiWeb=ok.
- CP-MVP-006 → done (2026-07-16). CP-MVP-007 (tree file management)
  accepted by the owner the same day and becomes the active path.
