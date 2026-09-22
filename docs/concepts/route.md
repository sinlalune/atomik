---
type: Cairn Concept
title: Route
description: The declared field that prices a path's ceremony, the four routes it may name, the triggers that force the strict one, and why escalation is one-way.
tags: [cairn, concept, route, ceremony, cost, declaration]
timestamp: 2026-08-27T00:00:00Z
---

# Route

A route is the ceremony a [coding path](./coding-path.md) runs at. Every path
MUST declare one, in a single frontmatter field:

```yaml
route: lightweight
```

The route does not change what a path is allowed to do. It changes how many
records the path produces on its way to being accepted.

## Build the idea

A protocol has exactly one lever for its own cost, and this is it. Ceremony
priced too high is not merely expensive — it teaches people to route around the
protocol, and a protocol routed around enforces nothing at all. Ceremony priced
too low leaves the changes that deserve scrutiny with none.

Making that lever a **declared field** rather than an inferred property is the
part worth arguing about. It means the cost of a change is stated by the person
opening it, before the work reveals how large it really was. That is honest
about who actually knows — and it is also the obvious place to cheat.

## In Cairn

Four routes are named. Three are specified; the fourth is deliberately not.

| `route:` | What it is | Status |
| :-- | :-- | :-- |
| [`lightweight`](./lightweight-path.md) | the default: every record that carries durable meaning, and none that only ceremony separates | specified |
| `full` | the strict route: opening record, standalone [coherence audit](./coherence-audit.md), standalone closing record, separate [administrative closure](./administrative-closure.md) | specified |
| [`foundation`](./foundation-path.md) | the same protocol pointed at documents rather than code, for the hour before accepted intent exists | specified |
| [`emergency`](./emergency-path.md) | named so that the gap is visible; no participant may declare it | **not implemented** |

### Five triggers force `full`

A path MUST declare `route: full` when any one of these holds:

1. it changes the [control plane](./control-plane.md);
2. it changes [architecture](./architecture.md) or a
   [decision record](./decision-record.md);
3. its [`writes:`](./declared-write-surface.md) declaration covers more than one
   implemented area;
4. it is expected to span more than one [work unit](./work-unit.md);
5. repository policy designates the area or the change high-risk.

Triggers 1–3 are **structural**: a checker can derive them from the declaration
itself. Triggers 4 and 5 are an expectation and a policy, so they are declared
rather than derived.

### The backstop, and why it exists

A route made of self-declarations has an obvious failure mode: everything
declares itself lightweight and ceremony evaporates. Trigger 4 is unobservable
as an *expectation* — but **having** spanned more than one work unit is a fact
sitting in the [work ledger](./work-ledger.md):

> A path whose ledger declares more than one `cairn-unit` MUST declare
> `route: full`.

It is the same trigger arriving one unit late, and it cannot be declared away.

### Escalation is one-way

A lightweight path that meets any trigger MUST escalate before its next
checkpoint and record the trigger in its ledger. A path MUST NOT declare itself
*down* a route: a change does not become small by being called small, and
self-declared smallness is exactly the bypass the trigger list exists to remove.

## It does not prove

The route is a proxy for risk, and a coarse one. A single-file change to one
implemented area can be the most dangerous change of the quarter, and nothing in
the route selection will say so. Triggers 4 and 5 remain honour-system at
declaration time; only the ledger backstop catches trigger 4, and only after the
fact. Trigger 5 has no mechanical form at all.

Related: [lightweight path](./lightweight-path.md),
[foundation path](./foundation-path.md), [emergency path](./emergency-path.md),
[coding path](./coding-path.md), [conformance](./conformance.md).
