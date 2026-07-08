---
type: Atomik Coding Path
title: Seats hardening — CUDA tiers, the OCR seat, and the opt-in cloud rung
description: Execute the owner's 2026-07-08 seat decisions on the evidence of CP-MVP-004's evaluation — whisper on CUDA with CPU fallback, Qwen3-VL 4B (Apache) seated for printed-page OCR with the proven pre-resize harness, and Mistral OCR API as an explicit per-capture opt-in fallback rung.
tags: [coding-path, m3-completion, ocr, transcription, cuda, device-tiers, cloud-rung]
timestamp: 2026-07-08T13:00:00Z
atomik:
  id: CP-MVP-005
  status: active
  current_step: S01
  base_commit: 94559f7
---

# Goal

Turn CP-MVP-004's dated evaluation into seated runtime reality per the
owner's decisions (2026-07-08, recorded in the S07 addenda):

1. **whisper → CUDA tier**: the transcription seat gains the RTX 5070
   (bench build exists, one dated memo datum at 8.3 s), with an
   AUTOMATIC fallback chain CUDA → CPU → mock. The CPU floor story for
   other machines is unchanged.
2. **OCR seat = Qwen3-VL 4B Q4_K_M (Apache-2.0)** via llama-mtmd-cli
   sidecar, using THE PROVEN HARNESS: pre-resize the image to the token
   budget in main (≈2 500 tokens, dimensions multiples of 28) — never
   `--image-max-tokens` (llama.cpp large-image path stalls the 4B;
   dated refs in S07 addendum 5). CUDA build primary, CPU build
   fallback, mock last. Best transcript of the bench: 9.5 s GPU /
   154 s CPU on the Adobe-scan page.
3. **Mistral OCR API = the only additional fallback**, as an EXPLICIT
   per-capture opt-in action (never silent): benched ceiling
   (letter-perfect on scans, ~2.4 s, id pinned `mistral-ocr-4-0`).
   RapidOCR and Unlimited-OCR take no seat (owner decision; RapidOCR's
   lossiness proven intrinsic on clean scans; unlim needs a draft PR
   build and collapses on low-pixel inputs).

Dated pointer for a future refresh round (out of scope here): Qwen3.5
(2026-03-02) is natively multimodal and claims to outperform Qwen3-VL —
a successor bench belongs to a later path, not this one.

# Definition of done

- **Speech CUDA tier**: whisper.cpp CUDA binary seated with a real
  fixture transcription verified and dated walls recorded; adapter
  fallback chain CUDA → CPU → mock proven by tests (missing binary,
  failing binary); model/runtime identity in traces says which tier
  ran; CPU-only machines see no behavior change.
- **OCR seat**: an image dossier gains a real `transcript.md` through
  the Qwen3-VL 4B sidecar — bounded job (execFile, timeout + SIGKILL,
  tmp workdir, media in / text out, no vault access), pre-resize via
  Electron `nativeImage` in main (no new heavy dependency), CUDA →
  CPU → mock seat selection at startup, model files in the state dir
  (git-ignored, sha256 recorded), identity + provenance frontmatter
  (visibly derived, correction state) and trace exactly like the
  whisper seat; the correction flow works unchanged on OCR output.
- **Cloud rung**: a per-capture explicit user action sends ONE image to
  Mistral OCR and lands the result as a clearly cloud-derived
  transcript (28: provider identity + model id pinned in frontmatter
  and trace); the key lives main-process only (env/.env.local — never
  the renderer, never the repo); absent key = the action explains
  itself and nothing leaves the machine; no automatic or silent cloud
  calls anywhere; no raw prompt/output telemetry.
- Every new IPC channel obeys 13 §IPC (typed, minimal surface).
- Tests/typecheck/build green; module notes, the 34 record, this
  ledger, and log.md updated in the same work unit as each step.
- Acceptance run against the M3 acceptance intents this path touches.

# Documentation coverage

Completeness rule (35): every bedrock page 00–35 accounted for.

## Required

- `docs/bedrock/00_00-orientation.md`
- `docs/bedrock/02_02-learning-loop.md` (correction effort stays THE metric on OCR output)
- `docs/bedrock/07_07-source-adapters.md` (adapter contract, sidecars, seat interchangeability)
- `docs/bedrock/08_08-capture-source.md` (truth treatment of derived transcripts)
- `docs/bedrock/12_12-electron-mvp.md` §local inference service boundary
- `docs/bedrock/13_13-electron-security.md` §local inference + §IPC + provider-key rules (re-read before S03 and S05)
- `docs/bedrock/14_14-app-kernels.md` (worker seats)
- `docs/bedrock/15_15-maintainability.md` (llama.cpp binary = a new heavy dependency; nativeImage over a new image lib)
- `docs/bedrock/17_17-self-evolving-docs.md`
- `docs/bedrock/18_18-roadmap.md` — M3 completion vs M7 provider boundary (the rung is ONE typed adapter, not the provider framework)
- `docs/bedrock/22_22-agent-handoff.md`
- `docs/bedrock/27_27-git-compatibility.md` (model files, .env.local hygiene)
- `docs/bedrock/28_28-truth-evidence-model.md` (cloud-derived provenance — REQUIRED here)
- `docs/bedrock/33_33-retrieval-local-execution-cost.md` (device tiers, ladder, ActionTrace)
- `docs/bedrock/34_34-local-execution-investigation-record.md` (the dated records feeding these seats)
- `docs/bedrock/35_35-coding-path-execution-state.md`
- `docs/agents/agent_documentation_contract.md`

## Conditional

- `docs/bedrock/01_01-workbench-first.md` — if GPU contention ever makes the workbench sluggish (OCR + speech sharing the 5070).
- `docs/bedrock/04_04-file-first-model.md` — before any new sidecar file shape lands.
- `docs/bedrock/05_05-resource-selection-model.md` — only if OCR regions become selectable anchors (not planned; the seat outputs plain text).
- `docs/bedrock/06_06-ai-patch-pipeline.md` — if OCR output starts feeding patch proposals.
- `docs/bedrock/11_11-markdown-page-model.md` — if transcript shape questions arise.
- `docs/bedrock/24_24-doc-templates.md` — before new module notes.
- `docs/bedrock/26_26-okf-agent-context.md` — not expected.

## Deliberately excluded

- `09_09-web-source-tab.md`, `10_10-pdf-source-tab.md` — M4/M5 (CP-MVP-003 reserved).
- `16_16-dev-docs-tab.md` — shipped.
- `19_19-dsl-future.md`, `20_20-relations-future.md`, `21_21-canvas-future.md` — later milestones.
- `23_23-references.md` — ad hoc.
- `25_25-use-cases.md` — narrative.
- `29_29-verification-grounding-router.md`, `30_30-public-knowledge-dictionary.md`, `31_31-truth-lens-ux.md`, `32_32-truth-investigation-record.md` — M6+ truth/provider framework; the cloud rung deliberately stays a single typed adapter beneath that framework.

# Execution

- [x] S01 Bootstrap: reconcile ledger vs repository reality; record
      `base_commit`; verify the owner-decision record (S07 addenda 4–5 +
      Mistral reference) is complete as this path's evidence base.
- [x] S02 Speech CUDA tier: verify the bench CUDA whisper-cli on a real
      fixture (dated walls, CPU-vs-CUDA row in the 34 record); install
      to the state dir; adapter fallback chain CUDA → CPU → mock with
      tests; tier identity in traces.
- [x] S03 OCR seat (13 re-read first): `ocr-adapter` sidecar on the
      whisper-adapter pattern — nativeImage pre-resize (≈2 500 tokens,
      multiples of 28), llama-mtmd-cli bounded job, CUDA → CPU → mock
      startup selection, model + binary in state dir (sha256), identity
      frontmatter + trace; wire into the image-dossier flow behind the
      existing adapter seam.
- [ ] S04 OCR correction-flow pass on the real Pascal/Pascal 2 dossiers;
      owner validates transcript quality end to end in the app.
- [x] S05 Cloud rung (13 §IPC + §keys re-read): explicit per-capture
      "cloud OCR" action → main-process Mistral call (key from
      env/.env.local; absent key = explanatory no-op), result lands as
      cloud-derived transcript (28 provenance, model id pinned); tests
      incl. no-key and refusal paths; no silent calls.
- [x] S05b Owner refinements (directive 2026-07-08): (1) the bench's
      SCAN FILTER seated in the OCR pipeline — illumination flattening
      + percentile stretch on raw bitmaps, dependency-free, after the
      resize; (2) Settings → AI menu (gear, top row): Mistral key via
      input field, stored main-only in the state dir (0600, masked
      hint back, raw key never returns); .env.local reading REMOVED —
      env var stays as dev override; (3) CUDA demotion made VISIBLE
      (console.warn with the cause — S04 finding: silent fallback is
      undiagnosable).
- [x] S05c Owner request (2026-07-08): the cleaned scan LANDS IN THE
      DOSSIER as scan.jpg beside the transcript (segments.json seam:
      adapter reports scanJpeg, the pipeline owns the vault write,
      cleanup on dossier race) — linked from transcript body and the
      dossier's extracted representations; plain write (machine
      derivative, regenerable; the transcript's wx stays the re-run
      gate); the ORIGINAL stays the evidence.
- [ ] S06 Acceptance run + path review and close (owner).

# Current checkpoint

```text
base commit : (set at S01)
changed     : path opened 2026-07-08 on owner directive — the OCR seat
              decision CP-MVP-004 deferred: whisper CUDA w/ CPU
              fallback; Qwen3-VL 4B seated w/ pre-resize harness;
              Mistral OCR API as the only extra fallback, explicit
              opt-in per capture. Evidence base: CP-MVP-004 S07
              addenda 1–5 + Mistral ceiling reference (all committed).
tests       : 234 passing / 23 suites (S02 added the fallback-chain
              trio); typecheck green
              S01 done 2026-07-08: base_commit 94559f7; working tree
              carries only owner dogfooding files + git-ignored
              .env.local (key hygiene checked); evidence base complete
              (addenda 1–5 + Mistral ceiling, all committed).
              S02 done 2026-07-08: CUDA whisper seated — self-contained
              install .atomik/speech/cuda/ (adapter exports
              LD_LIBRARY_PATH; the S05 CPU install's silent dependence
              on the bench build tree found and fixed the same way);
              automatic CUDA → CPU → mock chain, sticky per-session
              demotion, tier identity in runtimeVersion (+cuda).
              Measured: owner memo 1.83 s (sealed transcript
              reproduced byte-equal), 181 s fixture 5.7 s vs 14.7 s
              CPU (2.6×). -l auto trap re-met in manual verify and
              recorded again.
              S03 done 2026-07-08 (13 §local-inference + §IPC re-read):
              ocr-adapter.ts + routeByMedia(audio, ocr) + sidecar.ts
              (shared bounded-exec, LD_LIBRARY_PATH self-containment).
              Pre-resize via injected nativeImage resizer (≈2500
              tokens, /28, no upscale) — the proven harness is
              structural, --image-max-tokens never used. Installed
              self-contained .atomik/ocr/{cpu,cuda,models} from the
              benched PR#24975 NO_VMM builds; sha256 recorded.
              Installed-seat verify: 3.85 s CUDA on the pre-sized
              Leibniz page; CPU-tier install verify run at close of
              unit. Tests 234→237; typecheck green. HEIC gap honest.
              S05 done 2026-07-08 (13 §IPC + keys re-read): the cloud
              rung — mistral-ocr-adapter.ts (model PINNED
              mistral-ocr-4-0), typed channel transcribe-source-cloud,
              explicit "Cloud OCR" button beside "Transcribe" (its
              title says it SENDS the image), key main-process only
              (env → .env.local), absent key = explanatory refusal,
              result visibly cloud-derived through the ordinary
              pipeline (frontmatter + dossier + trace). Tests 237→238;
              typecheck/build/smoke green.
              S05b done 2026-07-08 (owner directives): scan filter in
              the OCR pipeline (scan-filter.ts, pure, tested on a
              synthetic unevenly-lit page); Settings → AI menu
              (ai-settings.ts store 0600 + typed channels + gear
              popover; raw key never returns to renderer); .env.local
              removed from key resolution; CUDA demotions now warn
              with their cause. Owner's first S04 attempt aborted (dev
              reload mid-run, no trace — the demotion-visibility gap
              this fixes). Tests 238→242 / 25 suites;
              typecheck/build/smoke green.
next action : S04 — owner validates the in-app flows on the real
              Pascal dossiers (restart app: Transcribe = local Qwen
              seat; Cloud OCR = explicit Mistral rung; tier readable
              in transcript.md runtime_version), correction flow end
              to end. Then S06 acceptance + close.
blockers    : none recorded
```

# Blockers

- None recorded.
