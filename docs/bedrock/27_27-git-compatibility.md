---
{
  "id": "27-git-compatibility",
  "title": "Git compatibility contract",
  "status": "foundational",
  "eyebrow": "Versioning",
  "summary": "Atomik vaults and project bundles must be useful inside ordinary Git repositories: canonical knowledge is diffable, caches are ignored, binary originals have clear modes, and accepted AI patches create meaningful diffs.",
  "tags": [
    "git",
    "versioning",
    "files",
    "patches",
    "collaboration",
    "truth-history",
    "verification-diffs",
    "operation-ledger",
    "local-model-cache"
  ],
  "relations": [
    {
      "to": "04-file-first-model",
      "kind": "constrains"
    },
    {
      "to": "06-ai-patch-pipeline",
      "kind": "reviews"
    },
    {
      "to": "14-app-kernels",
      "kind": "adds-git-core"
    },
    {
      "to": "15-maintainability",
      "kind": "enforces-diff-hygiene"
    },
    {
      "to": "18-roadmap",
      "kind": "continuous-constraint"
    },
    {
      "to": "28-truth-evidence-model",
      "kind": "versions-claim-repairs"
    },
    {
      "to": "31-truth-lens-ux",
      "kind": "reviews-repairs-from"
    },
    {
      "to": "33-retrieval-local-execution-cost",
      "kind": "versions-selected-reports-from"
    }
  ],
  "agent": {
    "purpose": "Keep Atomik vault/project files versionable, reviewable, branchable, and recoverable without making Git mandatory.",
    "inputs": [
      "file write",
      "AI patch",
      "project bundle",
      "source import",
      "workspace state"
    ],
    "outputs": [
      "clean diff",
      ".gitignore template",
      "optional Git status/diff UI",
      "rollback path",
      "optional usage report export"
    ],
    "invariants": [
      "Atomik is Git-compatible, not Git-dependent.",
      "Canonical knowledge should be stable, human-readable, and diffable.",
      "Rebuildable state must be ignored.",
      "Opening Atomik must not rewrite files unnecessarily.",
      "Every accepted AI patch should produce a meaningful human-reviewable diff.",
      "Claim/evidence corrections and verification history remain diffable; provider-grounded raw outputs are not committed as a reusable database.",
      "Raw operation traces are private operational state by default; user-approved aggregate reports may be committed."
    ]
  }
}
---

# Git compatibility contract

## Rule

```text
Atomik is Git-compatible, not Git-dependent.
```

A user should be able to put an Atomik vault or project folder inside a normal Git repository and get useful diffs, history, branches, rollback, and collaboration without Atomik owning a hidden database.

## Commit by default

These should be Git-friendly:

```text
notes/
projects/
sources/**/source.md
sources/**/extracted.md
sources/**/quotes/*.md
sources/**/transcript.md
trails/
context/*.md
truth/**/*.md                  # optional promoted claim/verification records
*.atomik-truth.json            # optional precise committed sidecars
knowledge-packs/**/attribution.md
knowledge-packs/**/source-manifest.json
docs/
adr/
schemas/
canvases/*.atomik-canvas
future scenes/*.atomik
index.md
log.md
atomik-project/**                 # knowledge/execution plane (ADR-009)
atomik-project/coding-paths/*.md
# atomik-project/briefs/ may be committed or ignored; briefs are regenerable
```

## Ignore by default

Atomik should generate a default `.gitignore` like:

```gitignore
# Atomik rebuildable state
.atomik/cache/
.atomik/index/
.atomik/embeddings/
.atomik/tmp/
.atomik/thumbnails/
.atomik/extraction-cache/
.atomik/provider-cache/
knowledge-packs/**/indexes/
knowledge-packs/**/embeddings/
.atomik/models/
.atomik/runtime/
.atomik/usage/private/

# Local/private machine state
.atomik/local-settings.json
.atomik/local-workspace.json
.atomik/session.json

# Optional exported aggregate reports can be committed under reports/usage/

# Secrets
.env
.env.local
*.key
```

Workspace state is nuanced:

```text
.atomik/workspace.json
  optional to commit for a shared project layout

.atomik/local-workspace.json
  ignored by default
```

## Binary originals

Git can store PDFs, images, audio, and video, but it is not always pleasant.

Atomik should support three modes:

```text
commit originals
  good for small personal research projects

Git LFS for originals
  good for PDFs, images, audio, video, datasets

metadata-only / local originals
  good for private or huge source files
```

The Markdown material remains diffable:

```text
original.pdf              binary, maybe LFS
source.md                 diffable
extracted.md              diffable
quotes/key-passage.md     diffable
notes/my-understanding.md diffable
```

## Required write constraints

Atomik must avoid doing things that make Git noisy.

It should not:

```text
rewrite frontmatter randomly
sort fields differently on every save
change IDs when a file is opened
update timestamps everywhere on read/render
normalize all Markdown when one note changed
mix cache/index writes into canonical diffs
```

It should:

```text
preserve user formatting when possible
sort machine-generated fields deterministically
only update timestamps on meaningful content changes
write AI results through explicit patch proposals
make one accepted AI operation produce one clear file diff
```

## Rename refactor diffs

A note rename that updates its backlinks is a sanctioned multi-file diff: deliberate, atomic, labeled as a refactor (see 20 — Rename and link integrity). It must never be mixed with content changes in the same commit.

## Git as a feature later

At MVP level, Atomik does not need a full Git UI. The first priority remains local vault/project + Markdown editor + selection-native AI patch loop.

Later Atomik can expose Git gently:

```text
show changed files
show diff before commit
commit accepted AI patch
restore previous version
compare note versions
branch a project exploration
merge project branches
sync through user's chosen Git remote
```

This would be especially powerful for AI work:

```text
AI proposal -> patch preview -> accept -> Git diff -> commit
```

## Nested repositories

Atomik should tolerate nested Git repositories carefully:

```text
vault/
  projects/
    marx-capital/        # maybe its own Git repo
    ai-formation/        # maybe same vault repo
  sources/
  notes/
```

The app should detect repository boundaries before running status/diff commands.

## Agent checklist

```text
When writing files:
  - write canonical knowledge to Markdown/source/project files
  - ignore rebuildable state
  - avoid formatting unrelated files
  - keep IDs stable
  - update timestamps only on meaningful changes
  - preview AI patches before applying
  - show or preserve a clean diff after acceptance
```

## Truth and verification diffs

A useful correction history looks like:

```text
challenge claim
  -> add/replace citation or narrow wording
  -> append concise verification event
  -> supersede old claim if needed
  -> one reviewable diff
```

Avoid committing raw search-provider result collections as reusable knowledge. Current provider-grounding terms may restrict caching, analysis, collection, and database construction. Durable knowledge should cite separately imported sources and retain only the permitted/necessary operation and verification metadata.

Git history can later answer:

```text
When was this claim introduced?
Which source supported it then?
When was it challenged?
What evidence changed?
Who accepted the repair?
```

Git history records editorial evolution. It still does not itself prove the current claim true.


## Operation trace storage and Git

Action traces are operational evidence, not canonical knowledge content. The default ledger should be local, append-only, content-minimized, and ignored by Git:

```text
.atomik/usage/private/actions.jsonl
```

A user may explicitly export an aggregate, reviewable report:

```text
reports/usage/2026-06.md
reports/usage/2026-06.json
```

Exports should contain counts, model/tool identifiers, dates, budgets, outcomes, and privacy modes—not raw prompts, note bodies, transcripts, or generated content unless explicitly selected. Model binaries, vector indexes, and runtime caches remain rebuildable and ignored.

Backup rule: a complete vault backup remains a folder copy (see 04 — Backup and disaster durability); no committed or ignored state may break that guarantee.
