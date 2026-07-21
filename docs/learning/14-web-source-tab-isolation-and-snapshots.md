---
type: Atomik Learning Note
title: 'Learning: the web source tab — isolation, reader extraction, and snapshots as evidence'
description: Beginner-first walkthrough of CP-MVP-006 — how a hostile web page runs inside a pane without reaching the vault, and how one explicit click turns it into hashed, citable evidence.
tags: [learning]
timestamp: 2026-07-21T00:00:00Z
---

# Learning: the web source tab — isolation, reader extraction, and snapshots as evidence

*Covers CP-MVP-006 (shipped 2026-07-16) and the S07e import/preview wave that followed during CP-MVP-007. Backfilled 2026-07-21 while repaying the learning-layer stall (see index §Coverage debt).*

## Who this is for and what you can do afterwards

You read notes 01–11 — especially 01 (Electron's process split), 03
(vault trust), and 11 (never trust bytes you didn't write). New here:
embedding a real browser in a pane as a hostile guest, and turning
pages into evidence files. Afterwards you can say why Colab runs in a
pane yet cannot read your vault, verify a snapshot hash, re-run an
extraction, and extend the gate tests.

## The technologies involved, from zero

**Why a web page is HOSTILE inside a desktop app.** An Electron
renderer is Chromium plus, optionally, Node. With `nodeIntegration:
true`, any script on any visited page could `require('node:fs')` and
read or exfiltrate anything your account can touch — vault, settings,
provider keys. So the embedded page gets the four required settings of
bedrock 13 (`SECURE_WEB_PREFERENCES` in
`apps/desktop/electron-main/security.ts`: no Node integration, context
isolation, sandbox, webSecurity on) and, stricter than the trusted UI,
**no preload at all** — zero bridge surface, no vault API on that side.

**WebContentsView** is the view type actually used (applied by
`guestWebPreferences()` in `apps/desktop/electron-main/web-view.ts`): a
native browser view owned by the MAIN process, composited ABOVE the
renderer's HTML — so overlays must hide it, and the renderer reports
its rectangle. The dated decision
(`atomik-project/sessions/2026-07-13-web-engine-decision.md`) rejected
`<webview>` (officially discouraged), `BrowserView` (deprecated in
electron.d.ts 43.0.0), and `<iframe>` (killed by X-Frame-Options on
Colab-class sites).

**Sessions and partitions.** Chromium groups cookies/storage into
sessions named by a partition string. Web tabs share `WEB_PARTITION =
'persist:web-sources'`: logins survive restarts (the owner's daily
Colab — a stated privacy decision); cookies live under
`userData/Partitions/`, outside the repo, invisible to git. Permissions
are deny-by-default — `WEB_ALLOWED_PERMISSIONS` holds exactly
`fullscreen` and `clipboard-sanitized-write`.

**MHTML — the snapshot as EVIDENCE.** `savePage(abs, 'MHTML')` writes
ONE self-contained `multipart/related` file: the HTML as rendered plus
every image as a MIME part — the byte-preserved page at access time,
sha256-recorded in the dossier. A live page can change or vanish; the
snapshot cannot. `source.md` adds the bedrock-09 provenance set:
`original_url`, `canonical_url` (only when a real http(s) URL),
`accessed_at`, author/publisher/published/updated when offered, and a
license row left for a human.

**Reader extraction** turns the snapshot into Markdown. The real
engines (in `apps/desktop/package.json`): `@mozilla/readability` 0.6.0,
`linkedom` 0.18.13 (a DOM for Node — main has no document), `turndown`
7.2.4 + `turndown-plugin-gfm` 1.0.2 — reading the ON-DISK snapshot,
never a re-fetch that could see different content.

## The architecture concepts mobilized (named)

```text
trust boundary        only typed channels + geometry cross the guest wall
deny-by-default       permissions, popups, downloads, non-http(s) schemes
evidence vs derived   snapshot.mhtml = hashed proof; reader.md = a
                      correctable extraction
explicit import       durable ingestion only on a user action — the
                      truth/provider boundary: provider grounding stays
                      a separate TRANSIENT path (M7); no crawler exists;
                      grounding links are never auto-ingested
rendering ≠ extraction  the live view shows; the extractor reads the
                      captured bytes — two claims, never conflated
```

## Walkthrough of the real code

**`electron-main/web-view.ts`** — pure, unit-tested gates.
`guestWebPreferences()` (four settings + partition, no preload — the
test asserts `'preload' in prefs` is false); `isAllowedWebUrl()`
(http(s) + `about:blank` only — `file:`, `javascript:`, `data:`,
`chrome:` die in main whatever the renderer asked). The login-wall
block: `normalizeChromeUserAgent()`, `GOOGLE_AUTH_HOSTS`, `FIREFOX_UA`,
`isGoogleAuthUrl()` (exact hostname — lookalikes stay out),
`authRequestHeaders()` (client hints removed). S07e adds
`SNAPSHOT_PARTITION = 'snapshot-preview'` (ephemeral, no `persist:`),
`snapshotWebPreferences()`, and `isSnapshotRelPath()`.

**`electron-main/index.ts`, `registerWebViewHandlers()`** — the view
registry and session config (permission handlers, `will-download` →
cancelled, `onBeforeSendHeaders` auth-host header swap). `webViewEnsure`
creates the view, denies popups (allowed `target=_blank` URLs browse
in place), gates `will-navigate`, pushes typed state. The S07e
`importWebUrl` handler loads a HIDDEN guest (same partition and gates,
45 s timeout + 1.5 s settle, destroyed in `finally`) then runs the
exact import path; `webViewShowSnapshot` renders evidence in the
ephemeral partition, ALL navigation prevented.

**`renderer/src/web/WebView.tsx`** — trusted chrome ONLY: URL bar, nav
buttons, honest failure strip, reader toggle, `Import as source` — the
single road from live page to vault. `normalizeInputUrl()` in
`renderer/src/web/urls.ts` is the UX gate; main re-validates anyway.
Geometry: `reportRect()` reports the host rect over `webViewSetBounds`
(ResizeObserver + window resize + a per-render check for divider drags
that only MOVE a pane); tab switch hides the view — a running Colab
survives — close destroys it. `renderer/src/source/SnapshotView.tsx`
reuses this discipline for the preview, and `webImportUrl()` in
`renderer/src/import/format.ts` gates the Import-page URL field.

**`electron-main/web-import.ts`** — `importWebSource()` lands
`sources/web/<slug>/`: `cleanMetaText()` collapses hostile page text to
one capped line without `|` or backticks (injection defeated in
`tests/web-import.test.ts`), `webSlug()` with URL fallback, numbered
siblings, every file `wx`, a failed or EMPTY savePage removes the whole
directory; `sources/web/` entered `.gitignore` in the same commit.

**`electron-main/mhtml.ts` + `web-reader.ts`** — `parseMhtml()` decodes
the multipart (QP/base64, images keyed by `Content-Location`);
`readerFromSnapshot()` → linkedom → **structure-first**
`findContentRoot()` + `stripChrome()` (Readability as fallback, then
whole body — reader.md is never empty) → `normalizeTables()` (regular
tables PROMOTED to pipe tables, `expandCellSpans()` repeating merged
cells, infoboxes flattened) → turndown → `stripLeftoverHtml()` as the
no-tag-soup net; images dedupe by CONTENT hash into `media/`, refs
rewritten relative.
`extractWebReaderAsync()` runs the CPU slab in `reader-worker.ts` (an
Electron utilityProcess, forked per job), records ONE `extract`
ActionTrace; `resetWebReader()` removes reader.md AND media/.

**`electron-main/web-provenance.ts`** — `webProvenanceFor()` maps a
reader.md selection (strict `WEB_READER_RELPATH` regex — traversal
never reaches the fs) to `{url, dossierPath, accessedAt, title}` on the
EvidenceRecord, best-effort; notes cite "Source: [title](url) —
accessed date · [dossier]".

## How it was built (methodology)

**Decisions before installs.** S02 wrote the dated engine record —
embed approach, isolation posture, reader stack, snapshot format, with
rejected alternatives — before `npm install` ran. Then the ladder: S03
isolated view, S04 explicit import, S05 reader extraction + lifecycle,
S06 citations + URL provenance, S07 acceptance — each step proven e2e
(`web=navigated`, `webImport=ok`, `webReader=ok`, `aiWeb=ok`).

**What acceptance proved**
(`atomik-project/sessions/2026-07-16-cp-mvp-006-acceptance.md`): every
§M5 intent — real Wikipedia extraction (92 KB of clean Markdown, 116
SVG math renders in `media/`, the owner's study-math case), Colab
running IN the pane beside a PDF (the workbench directive), and the
truth/provider boundary sweep: no provider code reachable from the web
path, no crawler exists, import is user-explicit, rendering ≠
extraction structurally. Honest gaps carried openly (license row
human-pending).

**The S07e wave** (during CP-MVP-007, owner bench): the Import page's
web card gained a URL field; pasting a URL imports DIRECTLY through the
hidden guest — still one typed URL, one click, one bundle, same gates —
proven on real Wikipedia (`webUrlImport=ok`); and the snapshot renders
as an in-app preview under the ephemeral partition, sharing nothing
with the live session.

## Lessons learned the hard way

- **The Google wall** (S03c): a clean Chrome UA was not enough — the
  client-hint brands (`Chromium` without `Google Chrome`) betray an
  embedded browser; the fix presents Firefox on the two exact auth
  hosts. And the first retry STILL walled: the partition had cached
  Google's verdict — purge it before judging a mitigation dead.
- **Readability rases headings** on Wikipedia's HTML: a real page came
  out with ZERO; structure-first extraction recovered all 16 of them.
- **Dedupe by content, not URL** (S05b): identical bytes under two URLs
  hash to one media name — writing it twice with `wx` is EEXIST; and
  orphan `media/` from a failed run wedged the bundle, so extraction
  self-heals by clearing stale media first.
- **Perf is architecture**: 834 ms of in-main extraction froze every
  IPC; the slab moved to a utility process without changing one gate.

## Try it yourself (exercises)

1. From `apps/desktop`: `npx vitest run tests/web-view.test.ts
   tests/web-urls.test.ts`. Add `'geolocation'` to
   `WEB_ALLOWED_PERMISSIONS`, re-run — which test objects? Revert.
2. `npm run dev`, open a web tab, navigate, click **Import as source**.
   Match `sha256sum snapshot.mhtml` against `snapshot_sha256` in
   `source.md`; then `git status` — why is `sources/web/` invisible?
3. Extract the reader, edit one word of `reader.md` in the app, watch
   the dossier flip to human-corrected. Delete reader…, confirm
   `media/` is gone and `status: imported` returned, re-extract.
4. In DevTools: `await window.atomik.webViewEnsure('probe1',
   'file:///etc/passwd')` → rejected. Find the exact line of
   `web-view.ts` that refused, and the test pinning it.
5. On the Import page, type a bare host, then `javascript:alert(1)`.
   Explain which of `webImportUrl` (renderer) and `isAllowedWebUrl`
   (main) refused each, and why both layers exist.

## Vocabulary you now own

```text
WebContentsView     main-owned native browser view, composited above the UI
partition           named cookie/storage universe; persist: survives restart
ephemeral partition in-memory session; dies with the app (snapshot preview)
preload             the trusted bridge script; the guest has NONE
MHTML               one multipart file: page + subresources, byte evidence
provenance          URL + accessed_at + dossier riding every web evidence
utilityProcess      Electron worker process for CPU slabs off main
```

## What arrives next

- **Note 15 — file management as refactor** (CP-MVP-007): trash seam,
  relocate preview/rollback, bundles as units — it also shipped S07e.
- **The grounding router (M7)**: the other side of the truth boundary —
  provider-grounded TRANSIENT answers that may point at pages you then
  import through exactly this pipeline. Trails ride the relations work.
