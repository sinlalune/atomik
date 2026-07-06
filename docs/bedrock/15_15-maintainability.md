---
{
  "id": "15-maintainability",
  "title": "Maintainability and module learning notes",
  "status": "foundational",
  "tags": [
    "maintainability",
    "learning",
    "docs",
    "diffs",
    "truth-contracts",
    "provider-snapshots",
    "retrieval-evaluation",
    "local-runtime",
    "operation-trace",
    "execution-economics"
  ],
  "relations": [
    {
      "to": "14-app-kernels",
      "kind": "governs"
    },
    {
      "to": "17-self-evolving-docs",
      "kind": "requires"
    },
    {
      "to": "22-agent-handoff",
      "kind": "instructs"
    },
    {
      "to": "27-git-compatibility",
      "kind": "requires-clean-diffs"
    },
    {
      "to": "28-truth-evidence-model",
      "kind": "documents"
    },
    {
      "to": "32-truth-investigation-record",
      "kind": "preserves-research-through"
    },
    {
      "to": "33-retrieval-local-execution-cost",
      "kind": "documents-and-evaluates"
    }
  ],
  "agent": {
    "purpose": "Require implementations to teach their architectural role instead of only adding code, and to keep file changes reviewable.",
    "inputs": [
      "new module",
      "changed boundary",
      "new interface",
      "file format update",
      "retrieval strategy change",
      "local runtime/model change",
      "ActionTrace schema change"
    ],
    "outputs": [
      "module learning note",
      "ADR if needed",
      "tests",
      "agent digest",
      "clean diff",
      "capability/evaluation record",
      "updated cost/privacy acceptance tests"
    ],
    "invariants": [
      "No core brick without explanation.",
      "Document alternatives and rejected options.",
      "Docs update in same change as code.",
      "Junior architect comprehension is a quality gate.",
      "Opening or formatting the app must not rewrite unrelated files.",
      "Volatile provider pricing/terms are dated and rechecked instead of being copied as timeless facts.",
      "A local or semantic capability becomes a default only after a reproducible workload/device evaluation.",
      "Trace schemas minimize content and distinguish estimates, runtime/provider reports, and billing."
    ]
  }
}
---

# Maintainability and module learning notes

## Principle

```text
Every brick teaches.
Every architectural decision leaves a trace.
Every core module has a learning note.
Every coding-agent change updates the docs.
Every accepted AI patch should produce a meaningful diff.
```

## Module learning note sections

Every core package/module should have a Markdown note:

```text
What this module owns
Why it exists
What it must not own
Public contracts
Data flow
Alternatives considered
Common mistakes
Tests
Example usage
Future extension points
Agent checklist
```

## When to write an ADR

Write an ADR when changing:

```text
platform choice
storage model
project bundle model
source adapter contract
source dossier format
context packet or retrieval strategy format
execution policy, budget, or ActionTrace contract
local runtime/model distribution boundary
IPC/preload API
AI operation contract
claim/evidence/verification contract
provider grounding/privacy/cost policy
knowledge-pack/dictionary contract
patch format
persistent file format
Git behavior
DSL grammar later
canvas format later
security boundary
```

## Definition of done for core work

```text
code compiles
tests pass
module note updated
ADR added if boundary changed
docs manifest updated
agent digest updated
example or fixture added
junior-readable explanation included
Git diff is meaningful and not noisy
```

## Diff hygiene

Implementation should avoid:

```text
rewriting frontmatter ordering unrelated to a change
updating timestamps on read
normalizing all files when one file changed
changing generated IDs unnecessarily
mixing cache updates with canonical knowledge patches
```

Good Atomik behavior:

```text
one accepted AI operation = one clear file diff
```

## Truth and provider documentation quality gate

For truth-related work, definition of done also includes:

```text
claim/evidence schema updated
Truth Lens behavior documented
citation anchors tested
provider and local-runtime capability/price/license/terms checked_at updated when relevant
retrieval/model evaluation corpus and device profile recorded when defaults change
privacy, local-resource, and external-cost implications recorded
ActionTrace and cancellation/budget tests updated
unsupported/disputed/stale states covered by fixtures
no legal or pricing statement presented without a dated official source
```

A provider-fact update should produce a narrow diff to the dated research/policy record, not rewrite unrelated architectural prose.


## Retrieval and local-capability quality gate

Before changing a default retriever, embedding model, speech model, autocomplete model, runtime, or quantization, record:

```text
exact revision and license
runtime and target hardware/OS
representative Atomik corpus, language, and task
baseline and evaluation method
quality/recall/acceptance or correction outcome
latency, first-result latency, peak memory, storage/startup cost
external cost and local resource observations
failure, cancellation, privacy, and rollback behavior
```

A vendor leaderboard or one developer laptop is useful evidence, not a universal product default.
