---
type: Atomik Coherence Audit
title: Coherence audit — CP-PROVIDERS @ b32df20
timestamp: 2026-08-16T09:42:00.000Z
atomik:
  path: CP-PROVIDERS
  branch: path/cp-providers
  head: b32df20381c98ce838c38f4e4da6ce2761d33399
  base: b32df20
  verdict: clean
---

# Coherence audit — CP-PROVIDERS @ b32df20

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

No. The implementation strictly adheres to:
- Bedrock 06 (AI patch pipeline & proposal verification)
- Bedrock 13 (Electron security: 0600 main-only key storage, masked hints over typed IPC, no renderer key exposure)
- Bedrock 14 (ai-core owns generation adapters, execution-core owns action traces)
- Bedrock 15 (Zero heavy SDK dependencies; pure `fetch` clients with native `AbortController`)
- Bedrock 33 (ActionTraces with location, provider-reported usage, and dated price snapshot estimates)
- Bedrock 36 (UI Design System: tokens, themes, glass rules, and accessible controls)

### Does it duplicate something another running path is building?

No. `CP-MVP-010` is focused on graph retrieval (BM25 lexical core + link expansion over nodes/edges tables). `CP-PROVIDERS` focuses on provider expansion and settings management, providing the generation engines that subsequent retrieval and verification pipelines consume.

### Did it introduce architecture that belongs in an ADR and has none?

No. The architecture operationalizes the hybrid hypothesis established in `docs/research/openrouter-vs-direct-providers.md` (OpenRouter gateway with Zero Data Retention + direct first-party adapters behind the existing `GenerationAdapter` contract).

### Is anything now documented in two places that will drift apart?

No. `PROVIDER_CATALOG` in `shared/generation-params.ts` serves as the single source of truth for model metadata and pricing rates across main, renderer, and test suites. Module notes (`atomik-desktop-ai.md`, `atomik-desktop-shell.md`, `atomik-desktop-editor.md`) and learning note `23-multi-provider-ai-generation-and-gateway.md` are aligned.

## Verdict

**clean**
