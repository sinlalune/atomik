---
type: Atomik Session Record
title: CP-MVP-006 S02 — web engine decisions (dated, 15)
timestamp: 2026-07-13T12:45:00Z
---

# Web source tab engine decisions — 2026-07-13

Four decisions, each 13-constrained; facts checked 2026-07-13 against
the LOCALLY INSTALLED electron.d.ts (43.0.0 exact), the official
web-embeds guide (https://www.electronjs.org/docs/latest/tutorial/web-embeds),
and the npm registry.

## 1. Embed approach — CHOSEN: WebContentsView (built-in)

Created and controlled by MAIN, "greatest control over contents"
(official guide), and the API BrowserView is officially deprecated in
favor of (electron.d.ts 43.0.0: "The BrowserView class is deprecated,
and replaced by the new WebContentsView"). One view per web tab in a
main-process registry; the renderer renders a placeholder pane div and
reports its rect (the S06d ResizeObserver precedent) + visibility over
a typed channel; main syncs `setBounds`.

Named costs, accepted: (a) the view composites ABOVE the renderer —
overlays (menus, dialogs, settings) cannot paint over its rect, so
modals must hide/collapse the view (an S03 seam, not an afterthought);
(b) WSLg rendering quirks are possible — the Colab bench in S03 is the
detector.

| rejected | why |
|---|---|
| `<webview>` tag | official guide, fetched 2026-07-13: "We do not recommend you to use WebViews, as this tag undergoes dramatic architectural changes that may affect stability of your application. Consider switching to alternatives, like iframe and Electron's WebContentsView" — the ONE candidate that flows in DOM layout, but Atomik doesn't build M5 on an officially discouraged primitive |
| `<iframe>` | real destinations (Google Colab, most authed sites) send X-Frame-Options / CSP frame-ancestors and die in frames; fine for a widget, dead for a browser pane |
| BrowserView | deprecated alias territory (see above) |
| external browser + import-by-URL only | kills the owner's workbench directive (Colab IN a panel) |

## 2. Isolation posture (13) — written down before any code

- Guest `webPreferences`: exactly the four required settings
  (`nodeIntegration:false, contextIsolation:true, sandbox:true,
  webSecurity:true`) and **NO preload at all** — remote content gets
  zero bridge surface. The trusted UI keeps its own preload; the guest
  is not the UI.
- **Partition: `persist:web-sources`** — persistent BY DECISION: the
  owner's scenario (Colab open daily) needs logins that survive
  restarts. Privacy cost stated plainly: site cookies (incl. Google)
  live on disk under `userData/Partitions/web-sources`, separate from
  the trusted UI session. Keys/credentials of Atomik NEVER enter this
  session. Owner may veto to ephemeral; the default is persistent.
- **Permissions: deny-by-default** via `setPermissionRequestHandler`
  on the partition; allowlist only `fullscreen` and
  `clipboard-sanitized-write` (copying from Colab cells is the
  learning flow). Camera/mic/geolocation/notifications/midi/etc.
  denied. `setPermissionCheckHandler` mirrors it.
- **Popups: deny + browse-in-place.** `setWindowOpenHandler` returns
  deny; `target=_blank` URLs load in the SAME view. NAMED RISK:
  Google login historically walls embedded browsers ("This browser or
  app may not be secure") and sometimes requires a popup. Mitigation
  queued for S03: normalize the session UA to plain Chrome (drop the
  Electron/app tokens). RECHECK TRIGGER: the owner hits a login wall
  on the Colab bench → revisit with a controlled auth child window
  (same partition, same four settings) as the fallback design.
- **Downloads: cancelled** (`will-download` → cancel) for MVP; a
  deliberate save-to-inbox flow is future work, recorded here.
- **The live view can never write:** no preload, no IPC, no vault
  paths. Import/extraction run in MAIN, triggered by the TRUSTED UI
  over typed channels (13 source security rule).

## 3. Reader engine — CHOSEN: @mozilla/readability 0.6.0 (Apache-2.0) over the captured DOM, parsed in MAIN with linkedom 0.18.13 (ISC)

The reader derives from what the user SAW: at import, the guest's
post-JS DOM is serialized (`executeJavaScript` → XMLSerializer), its
sha256 recorded, and MAIN parses it with linkedom and runs Readability
— extraction claims never come from a second fetch that could see
different content (SPA/auth pages), and never from the display path
either (the 10-proven fidelity split, adapted). HTML→Markdown via
**turndown 7.2.4 (MIT) + turndown-plugin-gfm 1.0.2 (MIT)** (tables,
strikethrough). Images: the article's `<img>` srcs resolve against the
page URL and download in MAIN through the existing gate patterns
(count/size caps, MIME + magic checks) into `media/`, hashed,
markdown references rewritten relative — no extra dependency
(Electron `net`).

| rejected | why |
|---|---|
| @extractus/article-extractor 8.1.0 (MIT) | fetch-oriented: re-downloads server HTML — wrong evidence for SPA/authed pages; the reader must derive from the DOM the user saw |
| defuddle 0.19.1 (MIT) | the Obsidian clipper engine; claims stronger math/code handling — genuinely interesting for the owner's MATH-heavy material, but young; NOTED as the 34 re-bench alternative with a NAMED TRIGGER: Readability mangles a math page the owner cares about |
| postlight parser | legacy/maintenance-mode lineage; no advantage over the seat |
| rehype-remark stack | correct but heavy for an MVP importer; turndown is one small dep |

## 4. Snapshot format — CHOSEN: MHTML via built-in `webContents.savePage(abs, 'MHTML')`

Verified in electron.d.ts 43.0.0: `savePage(fullPath, 'HTMLOnly' |
'HTMLComplete' | 'MHTML')`. MHTML = ONE self-contained file of the
page as rendered, zero dependencies, Chromium-loadable later. The
bundle gets `snapshot.mhtml` (sha256 in the dossier). DEVIATION from
09's sketch (`snapshot.html`) recorded here: the sketch predates the
format decision; one self-contained evidence file beats a bare HTML
that hotlinks a living site. `HTMLComplete` (html + resource folder)
rejected as a multi-file sprawl in a knowledge vault; raw serialized
outerHTML rejected as evidence (subresources rot) — the serialized
DOM is instead the READER'S INPUT, hashed but not kept as a second
snapshot.

## Bundle shape this implies (04/09)

```text
sources/web/<slug>/
  index.md          map
  source.md         dossier: URL, canonical, title, accessed_at,
                    snapshot sha256, reader input sha256, license note
  snapshot.mhtml    evidence — the page as rendered
  reader.md         derived, correctable (frontmatter: engine identity,
                    trace id, correction_state)
  media/            reader images, hashed, gate-checked
```

`sources/web/` enters `.gitignore` in the SAME commit that lands the
bundle type (S04; the 2026-07-09 incident rule).

## Recheck triggers (dated facts)

- Electron major bump → re-read the web-embeds guide (webview stance,
  WebContentsView API drift) and re-verify savePage types.
- Google login wall on the Colab bench → UA normalization, then the
  auth-child-window fallback design. **FIRED 2026-07-13 — see addendum.**
- Readability mangles owner-relevant math pages → 34 bench vs
  defuddle.
- Owner needs downloads from the web view → design the save-to-inbox
  flow deliberately.

## Addendum S03c (2026-07-13): the wall fell — diagnosis and the seated mitigation

The owner hit "Impossible de vous connecter — ce navigateur ou cette
application ne sont peut-être pas sécurisés" at Google sign-in, WITH
the normalized UA active. Captured ON THIS MACHINE from the live guest:

```text
ua     : Mozilla/5.0 (X11; Linux x86_64) … Chrome/150.0.7871.46 Safari/537.36   ← clean
brands : Not;A=Brand 8 · Chromium 150                                           ← the tell
```

The client-hint brands say Chromium-WITHOUT-Google-Chrome — the exact
fingerprint of an embedded Chromium; the UA alone was never going to be
enough. The auth-child-window fallback was NOT taken: same engine, same
hints, same wall.

**Seated mitigation (dated):** on the exact hosts `accounts.google.com`
+ `accounts.youtube.com` ONLY, the guest presents as Firefox — pinned
`FIREFOX_UA` (Firefox/140, Linux), `Sec-CH-UA*` headers stripped (a
Firefox profile legitimately sends none), and `navigator.userAgent`
switched per main-frame navigation so page scripts read the same story
as the wire. Everywhere else — Colab included, which wants Chrome —
the normalized Chrome UA stays. This is the community-standard
compatibility path for a HUMAN logging into their OWN account inside an
Electron browser (nativefier#831 lineage; re-confirmed via search
2026-07-13); it is not automation and evades nothing but a
false-positive embedded-webview heuristic.

New recheck triggers: Google walls again despite the Firefox
presentation (→ investigate the flow Google serves, consider the
controlled auth window WITH this presentation); Google flags the pinned
Firefox as OUTDATED (→ bump FIREFOX_UA, one dated line).
