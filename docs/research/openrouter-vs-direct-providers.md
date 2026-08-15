---
type: Atomik Research Record
title: OpenRouter versus direct provider integrations
timestamp: 2026-08-14T00:00:00+02:00
status: investigation-launched
checked_at: 2026-08-14
---

# OpenRouter versus direct providers

## Status and decision boundary

This investigation is launched; it does **not** choose a provider architecture. It is an opening input for a future accepted coding path and, if the provider boundary changes materially, an ADR. CP-MVP-009 is unchanged.

The useful question is not “OpenRouter or every provider one by one?” It is:

> What role, if any, should OpenRouter have inside Atomik's provider-neutral generation boundary: discovery/benchmark tool, optional routing adapter, default gateway, or replacement for direct adapters?

“Infinity of providers” is directionally useful but technically false. On the checked date, OpenRouter's pricing page marketed **500+ models and 80+ providers**, while its live model-count endpoint returned **409**. That disagreement is itself evidence: the catalog is volatile, and catalog breadth is not the same as access to every provider's full native API.

## Current Atomik baseline

Atomik already owns the right primary seam:

- `apps/desktop/electron-main/generation.ts` defines a pure-compute `GenerationAdapter`; accepted writes remain in Atomik's patch-preview lane.
- the live implementation is a direct Mistral chat-completions adapter, with explicit failure and no silent fallback;
- provider keys remain main-side and never cross into the renderer;
- traces already carry provider, model, usage, and estimated billing identity.

The secondary seams are still Mistral-shaped, however:

- `AiEngine` is the closed union `mock | mistral`;
- settings storage, preload/IPC, and the menu expose a Mistral-specific key;
- the model allowlist and price snapshot are Mistral-only;
- main-process dispatch and a broad test suite branch on Mistral.

Therefore OpenRouter would not be a three-line base-URL swap in this repository. The first gateway/provider expansion must make credentials, engine identity, model policy, settings, trace metadata, and tests honestly provider-neutral. After that, adding compatible text-generation models through a gateway may become much cheaper. Native provider products still require their own capabilities and adapters.

## What must be compared beyond the platform fee

| Dimension | OpenRouter gateway | Direct provider adapters | Atomik consequence |
|---|---|---|---|
| Catalog and change velocity | One catalog and API expose many models/endpoints quickly. | Each provider needs discovery, qualification, and maintenance. | Strong gateway advantage for exploration and open-model bake-offs. Never expose the whole live catalog without a curated allowlist. |
| Initial engineering | One broadly compatible adapter, then routing/model policy. | Repeated auth, request/response, error, settings, and test work. | OpenRouter reduces repeated transport work, but moves complexity into normalization and policy. |
| Native feature fidelity | Covers a common subset and some provider-specific extensions; the router may transform requests. | Exact provider contract and faster access to proprietary endpoints/features. | Direct remains valuable for native caching, batch, agents, files, OCR/audio, or any feature whose semantics matter. |
| Reproducibility | Defaults can select different providers, fall back, and span quantizations. | A pinned endpoint/model has fewer routing variables. | Benchmarks require a canonical model plus pinned upstream endpoint/provider, constrained quantization, and fallbacks off. |
| Availability | Can route around an unhealthy endpoint/provider. | Atomik must implement and operate fallback itself. | Strong gateway advantage for an explicitly selected resilient mode. |
| Failure domains | Upstream diversity, but an extra gateway and billing system become shared dependencies. | Fewer hops; each direct provider can fail independently. | Keep a direct escape hatch; never make OpenRouter the only possible cloud boundary without evidence. |
| Latency | Edge routing aims for low overhead; cold regional caches, balance checks, and failed first attempts add tail latency. | One fewer network/decision hop. | Measure warm/cold p50/p95 and timeout behavior on the same upstream model. |
| Data path and privacy | Prompt crosses OpenRouter and the selected upstream endpoint(s); endpoint policies can be filtered. | Prompt crosses Atomik and the chosen provider only. | ZDR is necessary but insufficient; processor chain, categorization, plugins, region, and terms all need review. |
| Region and compliance | In-region EU/US processing is documented as an Enterprise capability. | Depends on provider; current direct Mistral baseline hosts in the EU by default. | Consumer/pay-as-you-go EU behavior must be resolved before private-vault use. |
| Observability | Standard usage/cost plus opt-in router metadata, but metadata has documented gaps. | Provider-native request IDs and telemetry vary. | Atomik must own one durable receipt schema and record the route actually used. |
| Secrets | One OpenRouter key is simple; BYOK lets OpenRouter hold encrypted provider keys. | Multiple keys, but each has a smaller provider/spend blast radius. | Keys remain main-side; add per-key budget/model restrictions and explicit fallback behavior. |
| Billing and procurement | Consolidated credits and accounting across models. | Separate invoices, quotas, tax handling, and accounts. | Compare cash flow, credit expiry/refunds, FX/VAT, spend controls, negotiated discounts, and cost per accepted patch—not token sticker price alone. |
| Support and contracts | Pay-as-you-go support is centralized; contractual SLAs are an Enterprise feature. | Direct commercial relationship and escalation with each provider. | The better route may change with scale and negotiated terms. |
| Exit cost | OpenAI-compatible surface helps portability, but routing policy and OpenRouter metadata are gateway-specific. | Native adapters are provider-specific but explicit. | Keep Atomik's `GenerationAdapter` and internal model/trace contracts as the anti-lock-in boundary. |

## Preliminary findings

### 1. Normalization is useful, but it is not semantic equivalence

OpenRouter's provider-routing default has `allow_fallbacks: true`, `require_parameters: false`, and `data_collection: allow`. With parameter enforcement disabled, an endpoint that does not support every requested parameter can still be selected. OpenRouter also has an optional context-compression transform; endpoints with contexts at or below 8,192 tokens currently enable it by default, and it can remove or truncate messages from the middle.

That is incompatible with Atomik's “the sent-request inspector shows what travels” promise unless the UI distinguishes:

1. the request Atomik composed;
2. the routing policy Atomik requested;
3. the upstream provider/model actually selected; and
4. any gateway transformation, retry, cache, guardrail, or fallback that occurred.

For any Atomik route, parameter support must be required and hidden compression must be disabled unless the user deliberately chose a lossy mode.

### 2. Routing is a product behavior, not plumbing

OpenRouter's default strategy considers endpoint health and price, and fallbacks are on. That is valuable for availability but changes the experiment: “same model slug” can mean different infrastructure, quantization, latency, privacy policy, or failure path.

Two policies must never be conflated:

- **pinned/reproducible** — canonical dated model, exact allowed provider/endpoint where possible, fallbacks off, supported parameters required, quantization constrained;
- **resilient/routed** — a reviewed allowlist and explicit fallback order, with every attempted and selected route captured in the trace.

No silent movement between those policies is acceptable.

### 3. Privacy is the first hard gate

OpenRouter documents that prompt/response retention is off unless the customer opts into logging or product-improvement use, and that request metadata is retained. It also documents sampling a small number of prompts for anonymous categorization. Section 6.5 of its current terms grants OpenRouter a continuing license to process anonymized inputs for that categorization/metrics purpose, while saying the inputs are not retained after categorization unless logging was enabled.

ZDR filters upstream inference endpoints, but OpenRouter explicitly excludes optional plugins and tools from that guarantee and considers some in-memory prompt caching compatible with ZDR. BYOK changes the upstream credential; it does not remove OpenRouter from the data path.

The current direct Mistral baseline is materially different: Mistral says data is hosted in the EU by default, pay-as-you-go API inputs/outputs are not used for training, and ZDR can be requested for stateless endpoints including chat completions. That does not make direct Mistral universally “private”; it makes the chain and its terms different and easier to enumerate.

Before any real-vault OpenRouter test, the owner must explicitly accept the categorization/license boundary or obtain a contractual exclusion. Until then, live experiments use synthetic fixtures only.

### 4. Traceability is promising but not complete by default

OpenRouter returns native token counts and charged cost in normal usage data. Opting into router metadata can expose requested/selected models, region, attempts, BYOK status, endpoints, and pipeline stages. This fits Atomik's ActionTrace direction well.

However:

- router metadata is disabled by default;
- cache hits intentionally omit it;
- some early failures and masked internal errors omit it;
- the schema can gain fields and pipeline stages without a deprecation cycle.

An accepted patch must never have ambiguous provider/model provenance. The prototype must prove that a generation-record lookup, a cache policy, or another receipt path closes every metadata gap; otherwise that routed mode fails the gate.

### 5. A gateway catalog is not a provider's whole platform

The current direct Mistral API exposes native controls such as prompt-cache keys, predictions, random seeds, reasoning modes, and JSON-schema output, in addition to separate stateful and multimodal product surfaces. Other providers have their own equivalents and non-equivalents.

OpenRouter is strongest where those systems share a stable inference contract. A model being listed does not prove parity for provider-native agents, conversations, files, batch processing, fine-tuning, OCR/audio, caching economics, safety controls, or preview/beta features. Every Atomik capability needs its own compatibility claim; “supported provider” must not imply “all provider features supported.”

### 6. Economics include operational and commercial effects

Checked 2026-08-14, OpenRouter lists a 5.5% pay-as-you-go platform fee. It lists fee-free BYOK allowance up to $25,000 of list-price inference per month for pay-as-you-go and $200,000 for Enterprise, then a 5% fee. It also centralizes usage reporting and spend controls.

The comparison must additionally include:

- prepaid-credit cash flow, refund window, and possible credit expiry;
- VAT/GST, currency conversion, invoice quality, and reconciliation;
- direct-provider batch/cache discounts, volume commitments, and credits;
- rate-limit ownership and capacity priority;
- engineering/on-call cost per supported capability;
- cost per **accepted Atomik patch**, not merely cost per million tokens.

The current OpenRouter BYOK documentation contains unrendered fee/allowance values while the pricing page is explicit. Treat the pricing page as the provisional source and recheck both before a decision.

## Candidate architectures

### A — OpenRouter replaces direct providers

Fastest path to catalog breadth and centralized billing. It also creates one gateway dependency, weaker native-feature fidelity, more routing variables, and an unresolved private-vault data boundary.

**Preliminary disposition:** do not adopt as the default hypothesis.

### B — Direct adapters only

Maximum contract, region, and feature control, with independent failure domains. It repeats integration and maintenance work and makes broad model evaluation slow.

**Preliminary disposition:** retain as a supported path, but not as the only research/catalog strategy.

### C — Hybrid: OpenRouter is one adapter, not Atomik's architecture

Keep Atomik's provider-neutral `GenerationAdapter`; keep direct Mistral; add an OpenRouter adapter only after the investigation gates pass. Use a curated, dated allowlist rather than a live “all models” picker.

Provisional roles:

- OpenRouter for synthetic-fixture evaluation, rapid model bake-offs, compatible commodity inference, open-weight endpoint choice, and an explicitly enabled resilient route;
- direct adapters for strict residency/privacy, exact reproducibility, provider-native capabilities, negotiated high-volume economics, or when gateway metadata cannot prove the route;
- local generation remains a separate evaluated seat, not a gateway fallback.

**Leading hypothesis:** C. This is a research hypothesis, not an accepted decision.

## Live investigation design

No live request is authorized by this record. A live rung requires an accepted coding path, an explicit owner-provided key/credit decision, and synthetic fixtures.

### Phase 0 — contract and catalog audit

Status: preliminary pass complete.

- freeze a dated snapshot of pricing, model catalog, provider endpoints, data policies, terms, status/SLA, BYOK, and regional routing;
- reconcile the 500+ marketed models versus 409 live-count result;
- get a written answer on anonymous categorization opt-out and pay-as-you-go EU processing;
- identify one exact current model available both directly and through a named OpenRouter upstream endpoint.

### Phase 1 — Atomik integration inventory

- define provider-neutral engine, credential, model-capability, pricing-snapshot, and trace contracts;
- classify fields as common, gateway-only, or provider-native;
- specify model deprecation/disable behavior without mutable aliases;
- preserve main-only credentials and explicit no-fallback semantics;
- decide how the sent-request inspector labels Atomik payload versus gateway/upstream execution.

### Phase 2 — controlled same-model A/B

Run a balanced fixture corpus through:

1. direct provider, pinned model;
2. OpenRouter, same canonical model and exact upstream provider, fallbacks off;
3. OpenRouter, same model with reviewed multi-provider routing;
4. OpenRouter, a small curated cross-model fallback set.

For the pinned OpenRouter arm, request all of the following explicitly:

- `require_parameters: true`;
- `allow_fallbacks: false`;
- `data_collection: deny` and `zdr: true`;
- exact provider/endpoint and acceptable quantization where the API supports it;
- context compression disabled;
- router metadata enabled;
- no server-side tools, plugins, presets, prompt logging, or input/output reuse.

The corpus covers current Atomik instruction + selection generation, multi-selection provenance, French and English, long conversations, replace/append/new-note proposals, JSON/structured-output behavior, cancellation, and budget ceilings. It contains no owner-vault content.

### Phase 3 — failure and lifecycle matrix

Exercise auth rejection, insufficient credits, unsupported parameters, context overflow, 429, provider 5xx, gateway 5xx, timeout, cancellation, endpoint removal, model deprecation, cache hit, failed first route, and exhausted fallbacks.

For every case, verify:

- nothing writes without preview and acceptance;
- failures are typed and surfaced, never replaced by a silent model/provider/mock;
- cancellation and budgets cover the entire chain;
- requested, attempted, and selected routes remain inspectable;
- a removed model fails closed and can be disabled by dated policy.

## Scorecard and gates

Record per arm:

- proposal validity and patch-application success;
- source/provenance preservation and blind human preference;
- parameter and structured-output conformance;
- p50/p95 time to first byte and total latency, warm and cold;
- completion, retry, timeout, and cancellation rates;
- input/output/reasoning/cache tokens, charged amount, upstream amount where available, and cost per accepted patch;
- requested and resolved model, provider endpoint, quantization, region, attempts, cache, BYOK, ZDR/data policy, and transformation pipeline;
- operational work: catalog refresh, key rotation, incident diagnosis, and deprecation response.

Hard gates before OpenRouter can carry owner-vault context:

1. explicit owner acceptance or contractual resolution of categorization, licensing, processors, and region;
2. 100% traceable model/provider identity for every accepted result;
3. 100% conformance for required request parameters and Atomik proposal contracts;
4. zero silent fallback, ignored parameters, prompt truncation/compression, or provider substitution;
5. main-only secrets, scoped spend/model permissions, and a tested rotation/revocation path;
6. a direct-provider escape hatch and a documented exit path;
7. a curated model policy with pinned canonical identifiers and dated price/capability snapshots.

## Trace fields the prototype must prove

The existing provider metadata is a good start. A gateway route may require:

- `gateway` and gateway request/generation ID;
- requested model and resolved canonical model;
- selected upstream provider, endpoint variant, and quantization;
- routing mode/policy snapshot and attempted routes;
- fallback reason and attempt count;
- region, ZDR, data-collection, BYOK, cache, and transformation/plugin state;
- provider-reported usage, gateway-charged cost, upstream cost where available, currency, and pricing snapshot;
- receipt completeness status when the gateway cannot return a field.

Raw prompts and outputs remain excluded from telemetry by default. Server-side OpenRouter presets must not become canonical prompt/config storage; Atomik's file-first prompt contract remains the source of truth.

## Open questions

- Can anonymous input categorization and the Section 6.5 license be disabled contractually, and on which plan?
- What exactly is the data path and residency for EU pay-as-you-go traffic?
- Which subprocessors, DPA, audit reports, incident terms, and deletion attestations apply?
- Why does the live model count return 409 while pricing markets 500+, and what does each count include?
- Which current Mistral model has an exact first-party overlap route, and can endpoint/quantization be pinned?
- Can route identity be recovered reliably for cache hits and every error class without storing content?
- Which Atomik-required fields are transformed, dropped, approximated, or unsupported per candidate endpoint?
- At real Atomik volume, do direct batch/cache/volume terms outweigh consolidated gateway operations?
- Who owns end-user billing support, refunds, provider incidents, and model removal?

## Recheck triggers

Re-run the dated audit before implementation and whenever OpenRouter changes pricing, terms, categorization, ZDR, regional routing, BYOK behavior, router metadata, message transforms, catalog semantics, or fallback defaults; whenever a selected provider changes its own data/feature contract; and at each model upgrade.

## Primary sources checked 2026-08-14

OpenRouter:

- [Pricing](https://openrouter.ai/pricing)
- [Live model count](https://openrouter.ai/api/v1/models/count)
- [Provider routing](https://openrouter.ai/docs/guides/routing/provider-selection)
- [Data collection](https://openrouter.ai/docs/guides/privacy/data-collection)
- [Zero data retention](https://openrouter.ai/docs/guides/features/zdr)
- [Router metadata](https://openrouter.ai/docs/guides/features/router-metadata)
- [Message transforms](https://openrouter.ai/docs/guides/features/message-transforms)
- [BYOK](https://openrouter.ai/docs/guides/overview/auth/byok)
- [Latency and performance](https://openrouter.ai/docs/guides/best-practices/latency-and-performance)
- [Usage accounting](https://openrouter.ai/docs/cookbook/administration/usage-accounting)
- [Terms of service](https://openrouter.ai/terms)
- [FAQ](https://openrouter.ai/docs/faq)

Direct Mistral baseline:

- [Data location](https://help.mistral.ai/en/articles/347629-where-do-you-store-my-data-or-my-organization-s-data)
- [Training use by plan](https://help.mistral.ai/en/articles/347617-do-you-use-my-user-data-to-train-your-artificial-intelligence-models)
- [Zero data retention](https://help.mistral.ai/en/articles/347612-can-i-activate-zero-data-retention-zdr)
- [API contract](https://docs.mistral.ai/api)

