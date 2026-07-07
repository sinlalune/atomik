---
type: Atomik Coding Path
title: Capture sources + local speech baseline (M3)
description: Bring the physical world into atomik — QR phone capture of images and short audio, preserved originals, Markdown source dossiers, a replaceable transcription adapter, and the human correction flow.
tags: [coding-path, mvp, m3, capture, sources, transcription]
timestamp: 2026-07-06T00:00:00Z
atomik:
  id: CP-MVP-002
  status: active
  current_step: S04
  base_commit: 09e2e38
---

# Goal

Implement Milestone 3 of `18_18-roadmap.md`: the capture source adapter —
local QR upload session for phone images and short audio, originals
preserved as evidence, `source.md` dossiers per 07/08 conventions, an
image source tab, a replaceable OCR/transcription adapter (mock first),
`transcript.md` visibly derived, and the human correction flow.

**Center of gravity: make the owner's daily use REAL.** CP-MVP-001 closed
on the finding that the workbench without sources has thin daily value;
this path exists to fix exactly that. Capture is the highest-value bounded
source (07: "immediately expands Atomik into the physical world").

# Definition of done

- All M3 acceptance intents of 18 §Milestone 3 hold: original media saved
  as source assets; `source.md` created per conventions; image tab views
  the original beside the dossier; replaceable transcription adapter
  produces `transcript.md` (+ optional timestamp sidecar later); human
  correction flow works; execution location/runtime/model/latency/cost
  recorded per transcription run.
- **Truth slice (08):** the original stays inspectable evidence; the
  transcript is visibly derived (model output vs human correction
  distinguishable in the dossier); model cleanup is never presented as
  verbatim transcription.
- **Security (13 §capture, 08):** one-time expiring session tokens, size
  and MIME limits, temporary inbox, explicit desktop confirmation before
  any vault write. No new write powers for the renderer; the inbox→vault
  import runs in main after explicit approval.
- **Mock-first (S08 pattern):** the transcription adapter contract lands
  with a deterministic mock; a REAL local runtime is chosen only through a
  dated capability evaluation (34 trigger) — not in this path unless the
  evaluation happens explicitly.
- Thinness rule inherited: each step one meaningful diff; the continuous
  dogfooding practice (CP-MVP-001 review) applies — owner frictions are
  fixed as micro-units inside this path.
- Module notes, learning notes, log.md, and this ledger updated at every
  step.

# Documentation coverage

Completeness rule (35): every bedrock page 00–35 appears below at least
once. 13 appears twice by design (Required + re-read triggers).

## Required

- `docs/bedrock/00_00-orientation.md`
- `docs/bedrock/01_01-workbench-first.md`
- `docs/bedrock/02_02-learning-loop.md`
- `docs/bedrock/04_04-file-first-model.md` (source ladder, dossier shapes)
- `docs/bedrock/05_05-resource-selection-model.md` (anchors incl. image/time)
- `docs/bedrock/06_06-ai-patch-pipeline.md` (transcription patches feed it)
- `docs/bedrock/07_07-source-adapters.md`
- `docs/bedrock/08_08-capture-source.md`
- `docs/bedrock/12_12-electron-mvp.md` (main-process server, worker boundary)
- `docs/bedrock/13_13-electron-security.md` (§capture upload security)
- `docs/bedrock/14_14-app-kernels.md` (source-core boundary, incubation)
- `docs/bedrock/15_15-maintainability.md`
- `docs/bedrock/17_17-self-evolving-docs.md`
- `docs/bedrock/18_18-roadmap.md` — M3 section
- `docs/bedrock/22_22-agent-handoff.md`
- `docs/bedrock/27_27-git-compatibility.md` (binary originals modes)
- `docs/bedrock/33_33-retrieval-local-execution-cost.md` +
  `docs/contracts/operation_trace_contract_v0_1.json` — transcription
  traces go beyond the S09 'generate' minimum (audioSeconds, runtime
  identity), so the trigger fires for this path: read before S06.
- `docs/bedrock/35_35-coding-path-execution-state.md`
- `docs/agents/agent_documentation_contract.md`

## Conditional

- `docs/bedrock/03_03-workspace-tabs.md` — before S05 (image tab kind).
- `docs/bedrock/11_11-markdown-page-model.md` — before S07 if transcript/
  note shape questions arise.
- `docs/bedrock/13_13-electron-security.md` §IPC — re-read before EVERY new
  channel (standing trigger; the capture server adds several).
- `docs/bedrock/24_24-doc-templates.md` — before the source-adapter doc and
  any new module note (source adapter template lives there).
- `docs/bedrock/26_26-okf-agent-context.md` — only if context assembly
  grows beyond selection-first.
- `docs/bedrock/28_28-truth-evidence-model.md` — only if labels beyond the
  MVP four are tempted (transcript states use dossier metadata, not labels).
- `docs/bedrock/34_34-local-execution-investigation-record.md` — before
  selecting any REAL local transcription runtime (dated capability
  evidence; the mock does not trigger it).
- `docs/bedrock/10_10-pdf-source-tab.md` — when spawning CP-MVP-003 (M4).
- `docs/bedrock/09_09-web-source-tab.md` — when the M5 path opens.

## Deliberately excluded

- `16_16-dev-docs-tab.md` — shipped at S03 of CP-MVP-001; no changes planned.
- `19_19-dsl-future.md`, `20_20-relations-future.md`,
  `21_21-canvas-future.md` — later milestones; extension points only.
- `23_23-references.md` — background bibliography; consult ad hoc.
- `25_25-use-cases.md` — pressure-test narrative, not a contract.
- `29_29-verification-grounding-router.md`,
  `30_30-public-knowledge-dictionary.md` — M7/M10 provider work.
- `31_31-truth-lens-ux.md` — M6; capture exposes truth state through
  dossier fields and the existing badge row only.
- `32_32-truth-investigation-record.md` — dated provider facts for M7.
- `archive/04_04-file-first-model_workspace-aware_okf_draft.md` — superseded.

# Execution

- [x] S01 Reconcile ledger vs repository reality; record `base_commit`.
- [x] S02 Capture session server in main: local HTTP endpoint bound to the
      LAN interface, one-time expiring session tokens, size + MIME
      allowlists, temporary inbox under the state dir (NOT the vault);
      typed channels to start/stop/inspect a session (13 §IPC re-read).
- [x] S03 QR display + minimal phone upload page (file input with
      `capture` hint degrading to picker; works for image/*).
- [ ] S04 Desktop confirmation flow → explicit import: inbox item →
      `sources/captures/<date-slug>/` with `original.*`, `source.md`,
      `index.md` per 07/08 (ensure/wx semantics; no silent vault writes).
- [ ] S05 Image source tab: view the original beside the rendered dossier
      (03 trigger for the new tab kind).
- [ ] S06 Replaceable transcription adapter contract + deterministic MOCK
      (ai-mock seat pattern): `transcript.md` visibly derived, dossier
      records model/runtime/version + correction state, ActionTrace line
      with the transcription fields (33 + trace contract read first).
- [ ] S07 Human correction flow: transcript edited in the editor; dossier
      correction state flips model-output → human-corrected; original
      always one click away.
- [ ] S08 Audio companion: same session accepts short audio; original
      preserved; same adapter contract produces the transcript.
- [ ] S09 M3 acceptance run recorded in sessions/; priorities patched;
      path review and close (continuous-gate practice).

Child path spawned from here, not widened into here: CP-MVP-003 PDF (M4).

# Current checkpoint

```text
base commit : 09e2e38 (branch master — CP-MVP-001 close + CP-MVP-002 open)
head        : 09fbe7a — 21 pre-S02 dogfooding micro-units committed
              (continuous-gate practice; owner instruction), one commit
              each; full narrative in log.md. Units 1–8 (feedback brief):
              .md implied in display names; resizable tree panels; shell
              relict removed; chromeless frame with tabs as the window
              top row; auto-save default with manual toggle;
              per-perimeter search in all modes; index/log pills per
              folder; live-preview seamless editing (read/live/source,
              live default). Units 9–14: IDE gutters dropped in live;
              blocks render in live (code highlighting, clickable
              checkboxes, rules, tables, Ctrl/Cmd+click links); the WSLg
              maximize saga root-caused upstream (wslg#1015) — shadow off
              on Linux, native Wayland (ozone-platform-hint), maximize
              MEANS fullscreen under WSLg, window state pushed
              (`window-state-changed`). Units 15–18: live adopts the
              reading geometry; bare-bracket link parity; quote-inset
              parity; shared note-rendering tokens in :root feed BOTH
              read and live (parity fixed at the root). Units 19–20:
              vault switching ships (`vault-changed` push; views drop
              stale state; restore guard poisoned against the old vault;
              missing note reads as a human message). Unit 21: strip
              actions + window controls pinned outside the tab scroll.
              Preload surface: 18 invoke channels + 2 push subscriptions.
              S02 done 2026-07-07: `electron-main/capture-session.ts`
              (incubating capture-core) — node:http endpoint bound to the
              first non-internal IPv4 (never 0.0.0.0; loopback offline),
              open ONLY while a session is active; one-time expiring
              tokens (crypto-random, timing-safe compare, 5 min TTL, die
              on stop/expiry/quit/restart; uniform 403, no oracle); size
              cap 25 MB (Content-Length + streamed count); MIME allowlist
              jpeg/png/webp/heic/heif with magic-byte validation of the
              received bytes against the DECLARED type; temporary inbox
              `.atomik/capture-inbox/<sessionId>/` (server-chosen names +
              meta sidecars; client names sanitized display metadata) —
              vault untouched, import is S04's confirmed step. Three new
              typed channels (13 §IPC re-read): start/stop/get-capture-
              session; surface now 21 invoke + 2 push. Smoke gains
              ATOMIK_SMOKE_CAPTURE=1 (lifecycle through the renderer
              world). Known environment limit for S03: WSL2 NATs the LAN
              address — phone reachability needs Windows port-forwarding
              or WSL2 mirrored networking; validate on the owner's setup.
              S03 done 2026-07-07 (03 re-read for the new tab kind):
              the phone page is real — self-contained HTML from
              `capturePage()` (one `<input type="file" accept="image/*"
              capture="environment">`, camera hint degrading to picker;
              fetch-POST of the raw file with the sanitized-name header;
              extension fallback for empty picker MIME; human messages
              per status; upload URL derived from the page's own address,
              token never embedded twice). Desktop: new `capture` tab
              kind in the chooser — `CaptureView` starts/stops the
              session, renders the QR renderer-side (`qrcode` ^1.5.4, new
              dep + @types; the URL is a display capability, not a secret
              from the user), counts down expiry, polls the inbox (2 s)
              and lists received uploads with an "import arrives at S04"
              note. Smoke's capture proof now drives the real tab when a
              fixture mounts one (start → img.capture-qr; qr-rendered
              verified with screenshot — the QR/URL show the WSL2 NAT
              address, so the reachability caveat stands for owner
              testing).
tests       : 161 passing / 17 suites; typecheck + build + smoke
              (capture=ok:...qr-rendered) green
next action : S04 — desktop confirmation flow → explicit import: inbox
              item → sources/captures/<date-slug>/ with original.*,
              source.md, index.md per 07/08 (ensure/wx semantics; no
              silent vault writes)
              owner validation pending on S02+S03: real phone upload on
              the owner's network (WSL2 NAT: needs mirrored networking
              or a port forward)
blockers    : none (note: owner dogfooding files remain untracked by choice —
              atomik-project/projects/test/*, atomik-project/test/,
              docs/projects/test/ — keep/clean stays with the owner; the
              owner-edited brainstorm note 2026-07-06-creation-flows-and-dnd.md
              has a broken frontmatter fence, `---` → `--` on line 1 —
              left untouched, flagged to the owner)
```

# Blockers

- None recorded.
