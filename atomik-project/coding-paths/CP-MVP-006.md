---
type: Atomik Coding Path
title: Web source tab — isolated view, explicit import, reader extraction (M5)
description: A web page becomes a first-class source through an EXPLICIT import — isolated live view, snapshot + reader.md as derived representations with full web evidence metadata; the grounding/import boundary stays hard.
tags: [coding-path, m5, web, source, webcontentsview, reader, snapshot, import]
timestamp: 2026-07-13T11:30:00Z
atomik:
  id: CP-MVP-006
  status: active
  accepted: 2026-07-13
  current_step: S04
  base_commit: 5381a12
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

Owner directive at acceptance (2026-07-13): "navigate through internet
like a normal web nav", "enable a reader view or extract text and
image as a source", and the learning-workbench scenario — "a Google
Colab page open on a panel and a PDF explaining the math on another,
everything for learning". That sets the bar: REAL navigation on
app-class pages (Colab is the named bench), extraction captures text
AND images, and the web tab is an ordinary pane citizen so it splits
beside the M4 PDF tab. The workbench scenario is an S07 acceptance
intent, not decoration.

Dividends inherited from CP-MVP-003/005: the source-bundle pattern and
its gates, derived-file provenance + ONE ActionTrace per extraction,
the delete/re-run lifecycle as standing practice, the @ citation menu,
source-view routing, the correction-flip hook (reader.md joins
transcript.md and extracted.md), tab params as recoverable UI state.

# Definition of done

- **Isolated web view, normal navigation**: a web tab (new view kind
  per 03) with URL bar + back/forward/reload, remote content in an
  ISOLATED WebContentsView-or-equivalent (S02 decision under 13): no
  Node, no Atomik IPC, no provider keys, no preload bridge into remote
  pages; the URL rides the tab param and restores on reopen (03,
  learned at CP-MVP-003 S07 — recoverable UI state ships WITH the
  view, not later). Navigation feels like a browser: in-page links
  navigate, history works, loading/error states are honest, and
  app-class pages stay usable — GOOGLE COLAB is the named bench page.
  Session/partition persistence (staying logged in vs ephemeral) and
  the popup/`window.open` policy are DATED S02 decisions under 13, not
  accidents. The web tab is an ordinary pane citizen: it splits beside
  any other tab — the owner's learning-workbench scenario (Colab on
  one panel, a math PDF on the other) must hold. If live embedding
  fails, reader/snapshot import of a fetched page may still work (09
  invariant).
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
- **Reader extraction — text AND images**: `reader.md` lands as a
  visibly DERIVED representation behind the adapter seam (07),
  Markdown-first; page images are captured into the bundle (`media/`,
  byte-hashed, referenced relatively from reader.md — an image the
  reader text needs is source material, not a hotlink that rots);
  extraction identity + trace id in frontmatter, ONE ActionTrace per
  run (33); the correction flow works on reader.md (the shared flip
  hook gains its third derived file); **Delete reader… / re-run ships
  in the same unit, round-trip tested, and removes media/ with it**
  (standing practice). Engine is a heavy dependency: dated 15 decision
  with rejected alternatives recorded.
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

- [x] S01 Bootstrap (22): reconcile ledger vs repo; record `base_commit`;
      re-read 09 + 03 + 05 + 13 (remote-content sections in full).
      DONE 2026-07-13: base_commit 5381a12; 262/28 re-verified at S01;
      dirty tree = owner dogfooding files only. Pins from the reads:
      03 — `source-web` is ALREADY a named MVP tab type and the pane
      ops already promise side-by-side source views (the workbench
      scenario is the pane system working as designed, no new pane
      machinery); 05 — `WebResource` + `'source-web'` ViewKind exist
      in the type sketch, Selection kind 'text' + SourceAnchor
      textRange cover reader anchors (coordinate sidecar stays
      optional, as with PDF); 13 (full) — the four required settings
      apply to the EMBED, the live view must NEVER mutate vault files
      (import runs through a typed main channel), every new
      WebContentsView needs a documented trust boundary + tests
      (security documentation rule), no keys near remote views, remote
      content never triggers provider calls; 09 — two paths kept
      separate (live view vs extracted view), evidence metadata list,
      no auto-crawl from grounding links.
- [x] S02 Engine decisions (15, dated; 13-constrained): (a) the embed
      approach — WebContentsView vs webview tag vs BrowserView, judged
      against the pane system (the view must sit INSIDE a split) and
      the Colab bench; (b) the isolation posture written down:
      partition + its PERSISTENCE (login state is a privacy decision),
      permissions, popup/`window.open` policy, no preload into remote
      content; (c) the reader-extraction engine — Readability vs
      alternatives — including IMAGE capture; (d) the snapshot format —
      raw HTML vs single-file. Record what was NOT chosen and why. No
      install without the record.
      DONE 2026-07-13 (record: sessions/2026-07-13-web-engine-decision.md):
      (a) WebContentsView — webview officially discouraged (guide
      fetched today), BrowserView deprecated in electron.d.ts 43.0.0,
      iframe dies on X-Frame-Options; bounds-sync seam + hide-on-modal
      named as S03 costs. (b) Guest = the four required settings, NO
      preload; partition persist:web-sources (logins survive — privacy
      cost stated, owner may veto); permissions deny-by-default
      (allow fullscreen + clipboard-sanitized-write); popups deny +
      browse-in-place with the Google-login-wall risk NAMED (UA
      normalization queued, auth-child-window as fallback design);
      downloads cancelled for MVP. (c) @mozilla/readability 0.6.0
      over the CAPTURED post-JS DOM parsed in MAIN via linkedom
      0.18.13; turndown 7.2.4 + gfm plugin for markdown; images via
      main net through the existing gates into media/ (no new dep);
      article-extractor rejected (re-fetch ≠ what the user saw),
      defuddle NOTED as the math re-bench alternative. (d) snapshot =
      built-in savePage MHTML, one self-contained evidence file
      (deviation from 09's snapshot.html sketch recorded). Installed:
      4 packages, 0 vulnerabilities; 262/28 + typecheck green.
- [x] S03 Web view tab: new view kind, URL bar + nav controls, isolated
      embed per S02, URL in the tab param + restore; normal navigation
      (links, history, loading/error states) verified on ordinary pages
      AND the Colab bench; the tab splits beside a PDF tab (03 — the
      workbench scenario stands up here); navigation events stay inside
      the view (no vault writes); tests.
      DONE 2026-07-13 (code): tab kind `source-web` — trusted chrome in
      the renderer (WebView.tsx: URL bar, back/forward/reload-stop,
      honest failure strip), one isolated WebContentsView per tab in
      MAIN (registry in index.ts, gates in web-view.ts: four required
      settings + persist:web-sources, NO preload; http(s)-only enforced
      main-side on ensure/navigate/will-navigate/popups; UA normalized;
      deny-by-default permissions; downloads cancelled; popups
      browse-in-place). URL rides the `url` tab param (label =
      hostname); tab switch hides the view (a running Colab survives),
      tab close destroys it; bounds sync = ResizeObserver + window
      resize + per-render check; settings panel takes the overlay
      guard. Seven typed channels + push; preload surface pinned.
      Tests 262→272/30; typecheck/build/smoke green. E2E PROBED:
      ATOMIK_SMOKE_WEB fixture run → `web=navigated(example.org)`
      panes=2 (dev-docs split beside the web tab — restore → ensure →
      real load → typed push → URL bar, the whole chain). OWNER BENCH
      PENDING: Colab login + daily navigation + the workbench scenario
      (web beside a real PDF tab) — the named Google-login-wall risk
      resolves on his machine, not here.
- [ ] S04 Import as source: explicit action → `sources/web/<slug>/`
      bundle (source.md with the 09 evidence metadata + snapshot.html
      hashed + index.md) through the gates; `sources/web/` into
      `.gitignore` in the SAME commit that creates the bundle type;
      dossier opens on import; tests.
- [ ] S05 Reader extraction: reader.md derived (identity + trace id,
      ONE ActionTrace, wx no-clobber) behind the adapter seam, WITH
      page images captured into media/ (hashed, relative references);
      Delete reader…/re-run in the same unit, round-trip tested,
      media/ removed with it; correction flip extends to reader.md
      (one hook, three derived files); extraction status on the
      dossier; tests.
- [ ] S06 Citations + selection → AI → note: @ menu offers web bundles
      (URL citation, dossier link, reader quote blocks); web dossier
      links route to the source view; selection → AI → note carries
      URL provenance; tests.
- [ ] S07 Acceptance run against 18 §M5 intents + the truth/provider
      boundary; owner validation on real pages INCLUDING the
      learning-workbench scenario (Colab on one panel, a math PDF on
      the other, notes taken from both); review and close.

# Current checkpoint

```text
base commit : 5381a12
changed     : path PROPOSED and ACCEPTED 2026-07-13 (owner directive:
              normal web navigation; reader view / extract text AND
              image as source; Colab on one panel + math PDF on
              another — "everything for learning"). Scope revised to
              carry the directive before activation.
              S01 done 2026-07-13: base_commit 5381a12; 262/28
              re-verified; tree = owner dogfooding files only;
              09/03/05/13 read — source-web tab type and WebResource
              already named by the bedrock; 13's embed posture and
              the never-mutate-vault rule pinned (see step).
tests       : 272 passing / 30 suites — tests/typecheck/build/smoke
              green at S03 close; e2e web probe navigated
              S02 done 2026-07-13: WebContentsView + persist:web-sources
              + Readability-over-captured-DOM + MHTML snapshot (dated
              record in sessions/2026-07-13-web-engine-decision.md);
              readability/linkedom/turndown(+gfm) installed, 0 vulns.
              S03 done 2026-07-13: the web tab is REAL — isolated view
              registry in main, trusted chrome in the renderer, url
              tab param, probe web=navigated(example.org) panes=2.
              Owner bench pending: Colab login (the named wall risk),
              daily nav feel, workbench split beside a real PDF.
              S03b 2026-07-13 (owner screenshot, first bench minutes):
              the web tab rendered as a 295px strip — .pane-content is
              a flex ROW and .web-view-tab had no flex:1, so the column
              sized to its intrinsic width. Fixed + screenshot-verified
              full-pane. Owner reached accounts.google.com in the view
              (login page renders; wall not hit at the sign-in step).
              Privacy question answered with on-disk evidence: the
              Google session lives in ~/.config/atomik-desktop/
              Partitions/web-sources/ — OUTSIDE the repo; git sees
              none of it (verified).
              S03c 2026-07-13 (owner screenshot): the GOOGLE WALL fell
              at sign-in ("ce navigateur … pas sécurisés") — the named
              S02 risk, trigger fired. Diagnosed with live evidence:
              UA clean but client-hint brands = Chromium WITHOUT
              Google Chrome (captured from the guest). Seated dated
              mitigation (decision-record addendum): Firefox
              presentation on accounts.google.com/accounts.youtube.com
              ONLY (pinned FIREFOX_UA, Sec-CH-UA stripped, JS-visible
              UA switched per main-frame nav); Chrome everywhere else.
              The auth-child-window fallback was NOT taken (same
              engine, same hints, same wall). Tests 272→274.
              OWNER VALIDATED 2026-07-13: after clearing the POISONED
              partition (the pre-mitigation flag persists in cookies —
              operational note in the decision record), Google login
              SUCCEEDED through the Firefox presentation and COLAB
              RUNS IN THE PANE. The named S02 risk is closed; the
              workbench scenario is alive. S03 fully owner-validated.
next action : S04 — Import as source: explicit action → sources/web/
              <slug>/ bundle (source.md with 09 evidence metadata +
              snapshot.mhtml hashed + index.md) through the gates;
              sources/web/ into .gitignore IN THE SAME COMMIT as the
              bundle type (incident rule); dossier opens on import;
              tests. Owner can bench S03 meanwhile.
blockers    : none recorded. Standing note: provider key store found
              EMPTY 2026-07-09 — re-enter via ⚙ before cloud-rung work
              (not expected on this path's critical line).
```

# Blockers

- None recorded.
