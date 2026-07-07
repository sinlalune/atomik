---
type: Atomik Coding Path
title: Local speech runtime — M3 completion (34 evaluation)
description: Replace the mock in the transcription seat with a REAL local speech-to-text runtime chosen through a dated capability evaluation on the owner's machine and recordings; extend to printed-page OCR if a cheap candidate passes the same gate.
tags: [coding-path, m3-completion, transcription, speech, evaluation, local-runtime]
timestamp: 2026-07-07T00:00:00Z
atomik:
  id: CP-MVP-004
  status: active
  current_step: S08
  base_commit: bb59575
---

# Goal

Complete M3's "local speech baseline" promise: the `TranscriptionAdapter`
seat (CP-MVP-002 S06) currently holds an honest mock. This path runs the
34-gated capability evaluation — real candidates, the owner's real
recordings, the owner's real machine (WSL2, CPU-first) — and seats the
winner behind the SAME contract, filling the honest gaps left open:
`audioSeconds`, the optional `segments.json` timestamp sidecar, and
transcripts that actually say what was said.

**Owner reality anchors the evaluation:** French-first speech (with
English technical vocabulary mixed in), short voice memos from phone and
desktop mic, WSLg audio bridge, no assumed GPU.

# Definition of done

- A dated investigation record (34 form) exists with measured results on
  the owner's machine: model/runtime/revision/quantization, WER-proxy via
  correction effort on real memos, real-time factor, peak memory, French
  and English behavior, timestamp quality. Published scores alone decide
  nothing.
- The winning runtime is seated behind `TranscriptionAdapter` as an
  ISOLATED process (12/13 §local inference): bounded jobs only — media
  path in, typed result out — no ambient vault access, cancellation and
  timeout enforced in main, model files OUTSIDE canonical knowledge
  (state dir; never the vault; git-ignored), integrity recorded when a
  trusted checksum exists.
- `transcript.md` carries real content, still visibly derived (frontmatter
  identity + correction state unchanged); the trace fills `audioSeconds`
  and real `wallMs`; runtime-reported counts preferred over estimates
  (33); the mock REMAINS available as the fallback adapter when the
  runtime is missing or fails.
- The S07 correction flow and S04/S08 capture surfaces are untouched —
  the seat replacement is invisible except for transcript quality.
- OCR for printed pages: evaluated with the same discipline IF a cheap
  candidate exists; handwriting expectations recorded honestly (GO/NO-GO
  is an explicit dated decision, not scope drift).
- Privacy decided explicitly: evaluation fixtures are the owner's voice —
  their git status (ignore vs commit) is an owner decision recorded at
  S02, before any fixture lands (the repo is PUBLIC).
- Thinness rule and the continuous dogfooding practice inherited.
- Module notes, learning notes, log.md, and this ledger updated at every
  step.

# Documentation coverage

Completeness rule (35): every bedrock page 00–35 accounted for below.

## Required

- `docs/bedrock/00_00-orientation.md`
- `docs/bedrock/02_02-learning-loop.md` (correction effort IS the metric)
- `docs/bedrock/07_07-source-adapters.md` (adapter contract, sidecars)
- `docs/bedrock/08_08-capture-source.md` (truth treatment of transcripts)
- `docs/bedrock/12_12-electron-mvp.md` §local inference service boundary
- `docs/bedrock/13_13-electron-security.md` §local inference worker/model
  security (re-read before S05; standing §IPC trigger for any new channel)
- `docs/bedrock/14_14-app-kernels.md` (worker seat, incubation)
- `docs/bedrock/15_15-maintainability.md` (dependency discipline: a
  runtime is the heaviest dependency yet)
- `docs/bedrock/17_17-self-evolving-docs.md`
- `docs/bedrock/18_18-roadmap.md` — M3 + M9 boundaries
- `docs/bedrock/22_22-agent-handoff.md`
- `docs/bedrock/27_27-git-compatibility.md` (model files, fixture policy)
- `docs/bedrock/33_33-retrieval-local-execution-cost.md` (§local
  speech-to-text, §evaluation gates, §ActionTrace)
- `docs/bedrock/34_34-local-execution-investigation-record.md` (the form
  this path's output takes; dated candidates within)
- `docs/bedrock/35_35-coding-path-execution-state.md`
- `docs/agents/agent_documentation_contract.md`

## Conditional

- `docs/bedrock/01_01-workbench-first.md` — if evaluation work threatens
  daily-use responsiveness (workbench stays first).
- `docs/bedrock/03_03-workspace-tabs.md` — only if a new view kind appears
  (none planned).
- `docs/bedrock/04_04-file-first-model.md` — before the segments sidecar
  lands (sidecars must not hide user knowledge).
- `docs/bedrock/05_05-resource-selection-model.md` — when time anchors
  from segments become selectable.
- `docs/bedrock/06_06-ai-patch-pipeline.md` — if transcription output
  starts feeding patch proposals.
- `docs/bedrock/11_11-markdown-page-model.md` — if transcript shape
  questions arise.
- `docs/bedrock/24_24-doc-templates.md` — before the investigation record
  and any new module note.
- `docs/bedrock/26_26-okf-agent-context.md` — not expected; context
  assembly unchanged.
- `docs/bedrock/28_28-truth-evidence-model.md` — only if labels beyond
  dossier metadata are tempted.

## Deliberately excluded

- `09_09-web-source-tab.md`, `10_10-pdf-source-tab.md` — M4/M5 paths
  (CP-MVP-003 reserved).
- `16_16-dev-docs-tab.md` — shipped; no changes planned.
- `19_19-dsl-future.md`, `20_20-relations-future.md`,
  `21_21-canvas-future.md` — later milestones.
- `23_23-references.md` — consult ad hoc.
- `25_25-use-cases.md` — narrative, not contract.
- `29_29-verification-grounding-router.md`, `30_30-public-knowledge-
  dictionary.md`, `31_31-truth-lens-ux.md`, `32_32-truth-investigation-
  record.md` — M6+ provider/truth work.

# Execution

- [x] S01 Reconcile ledger vs repository reality; record `base_commit`.
- [x] S02 Evaluation protocol + fixtures: pick the owner's real memos
      (French + English-technical), decide fixture GIT POLICY with the
      owner (public repo!), define the 33 §evaluation-gates metric sheet
      (correction effort, RTF, peak memory, timestamps, language
      behavior); fixture manifest recorded.
- [x] S03 Candidate refresh (dated, 34 form): re-verify whisper.cpp /
      faster-whisper / sherpa-onnx today — versions, licenses, French
      support, CPU/WSL2 fit; choose ≤3 to run; record what was NOT chosen
      and why.
- [x] S04 Bench harness: a repeatable script runs each candidate over the
      fixtures and emits the metric sheet per run; results land in the
      dated investigation record; WINNER DECISION recorded with the
      selection rule of 33 (cost per usable corrected transcript).
- [x] S05 Seat the winner: isolated sidecar/worker behind
      `TranscriptionAdapter` (13 §local inference re-read) — bounded jobs,
      cancellation/timeout, model files in the state dir (git-ignored),
      integrity note; mock demoted to fallback; `audioSeconds` + real
      runtime identity in traces.
- [x] S06 Segments sidecar + correction flow check: optional
      `segments.json` (07 sidecar rules; 04 trigger), transcript quality
      pass on the owner's memos; correction flow unchanged end to end.
- [x] S07 OCR GO/NO-GO (dated): printed-page candidates checked with the
      same discipline; seat only if a cheap candidate passes; handwriting
      expectations recorded honestly either way.
- [ ] S08 Acceptance run against the M3 acceptance intents this path
      completes + 33 acceptance lines; priorities patched; review and
      close.

# Current checkpoint

```text
base commit : bb59575 (branch master — CP-MVP-002 close + CP-MVP-004 open)
changed     : S02 done 2026-07-07 — OWNER DECISION: sources/captures/
              git-ignored in full (public repo; voice stays local); the
              committed protocol + fixture manifest carry hashes and
              metadata instead (sessions/2026-07-07-speech-eval-
              protocol.md). Four audio fixtures manifested (phone m4a,
              two desktop webm, one 2020 WhatsApp mp3 — the long one);
              metric sheet per 33 §evaluation gates with correction
              effort as THE quality metric; selection rule: correction
              effort per usable transcript minute, ties to the smaller
              runtime.
tests       : 227 passing / 23 suites
              S03 done 2026-07-07 (web-checked, dated record in
              sessions/2026-07-07-speech-candidates.md): all three run —
              whisper.cpp v1.8.6 (MIT, sidecar binary), faster-whisper
              (MIT, CTranslate2 int8, python venv, PyAV decode),
              sherpa-onnx-node 1.13.3 (Apache-2.0, prebuilt npm addon).
              Rejected with dated reasons: Vosk, Parakeet, Moonshine,
              whisperX, reference whisper. Multilingual base + small
              per candidate; PyAV decodes fixtures ONCE to 16 kHz WAV so
              every candidate sees identical samples. Toolchain verified
              on the machine (gcc/cmake/python/node; Ryzen 7 8700F,
              15 GB, no GPU assumed).
              S04 mechanical half DONE 2026-07-07: 24 runs (3 candidates
              × base/small × 4 fixtures) recorded in the dated record.
              base FAILS the owner's French; small is the floor and all
              three candidates tie on short memos; the long fixture
              discriminates (faster-whisper full transcript; whisper.cpp
              music-suppressed; sherpa hard ~30 s whisper limit). All
              candidates hallucinate on silence. RTF/RAM comfortable.
              S04 SEALED 2026-07-07: the owner's deliberate 30 s memo
              decided — WINNER whisper-small via whisper.cpp (parakeet
              collapsed on real French; faster-whisper = quality
              alternate). Correction pass pending = one homophone.
              S05 done 2026-07-07: `whisper-adapter.ts` — bounded
              sidecar (execFile, hard timeouts + SIGKILL, tmp workdir,
              no vault access): ffmpeg decodes the original to 16 kHz
              WAV, whisper-cli -l auto transcribes; identity + runtime-
              reported audioSeconds flow into transcript/dossier/trace.
              Seat chosen at startup (env-overridable paths, state-dir
              defaults); MOCK stays the fallback when binary/model/
              ffmpeg missing. Binary+model installed to .atomik/speech/
              on the owner machine. OWNER STEP to activate: sudo apt
              install ffmpeg (Electron cannot decode m4a itself — no
              AAC license; same finding as playback).
              S06 done 2026-07-07 (04 trigger honored — the sidecar
              never hides knowledge, transcript.md stays canonical):
              whisper-cli -oj time anchors parsed (tolerant), written wx
              as segments.json beside the transcript when present, linked
              from the transcript body; cleanup on races; trace carries
              reported audioSeconds. Correction flow already owner-
              validated on the real memo.
              S07 done 2026-07-07: GO on capability (RapidOCR read the
              real Pascal photo — usable French in 3.6 s CPU), seating
              DEFERRED as its own decision (python deployment question;
              options recorded in the dated record). Handwriting stays
              honestly untested.
next action : S08 — acceptance run + path review and close (owner)
blockers    : none recorded
```

# Blockers

- None recorded.
