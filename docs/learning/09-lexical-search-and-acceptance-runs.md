---
type: Atomik Learning Note
title: 'Learning: lexical search and the acceptance ritual'
description: Beginner-first walkthrough of S11 — why search starts without embeddings, and how an acceptance run becomes a durable record.
tags: [learning, search, retrieval, acceptance, testing]
timestamp: 2026-07-06T00:00:00Z
---

# Learning: lexical search and the acceptance ritual

**Who this is for.** You read the earlier notes. This one is shorter: one
retrieval concept, one engineering ritual.

**Scope.** CP-MVP-001 S11: the search slice and the M0–M2 acceptance run.

## 1. Why search ships WITHOUT embeddings

The fashionable move is a vector database on day one. The bedrock forbids
it (01/18: "no mandatory vector database before lexical retrieval is
evaluated") for reasons you can now verify in `electron-main/search.ts`:

```text
a lexical scan is ~60 lines, zero dependencies, zero index to corrupt,
zero model to download — and for a personal vault it is instant
```

The retrieval ladder (00) climbs deliberately: plain scan (today) →
ripgrep / SQLite FTS5 when vaults grow (M8) → OPTIONAL local embeddings
only after a measured evaluation proves they earn their cost (M9). Each
rung replaces the previous behind the same `searchVault` contract.

One epistemic guardrail to keep forever (04): **retrieval relevance is
not epistemic support**. Finding a note that mentions your query does not
make its content true — search results and truth labels are separate
systems on purpose.

## 2. How the search works (all of it)

Case-insensitive scan over every vault `.md` (same denylist as the tree):
filename match, then line-by-line — a line starting with `#` is a
`heading` match, anything else `text`, each with its 1-based line number
and a capped excerpt. Caps everywhere (query length, matches per file,
total files, file size) because even a naive scan must refuse to melt on
a pathological vault. In the UI: the tree panel's search box (debounced,
Esc to clear) — results replace the tree, click opens the note.

## 3. The acceptance ritual

S11's second half produced no feature: it produced a RECORD —
`atomik-project/sessions/2026-07-06-s11-acceptance-run.md`. The method:

```text
take the acceptance lists VERBATIM from the roadmap (18)
run each line against reality: a test name, a smoke marker, a git
  status output — evidence, not vibes
three honest statuses:
  PASS        verified now, evidence pointed at
  STRUCTURAL  holds by architecture; no runtime surface exists yet
              (e.g. "remote content has no Node access" — there IS no
              remote content until M5; the settings are pinned+tested)
  DEFERRED    explicitly postponed WITH the reason and the re-entry
              point (budget/cancellation → meaningless for an instant
              mock; named as M7's entry criterion)
```

The forbidden status is the silent one. This is the same no-hidden-areas
rule the coding path applies to documents (35), applied to acceptance:
you may not check everything today, but you may never *lose track* of
what you didn't check.

The strongest test of the run was destructive: wipe the ENTIRE `.atomik`
state dir between two launches — layout, settings, trace ledger, all
gone. The app restarts on defaults; the vault is untouched; git agrees.
That is the file-first promise (04) executed literally: rebuildable state
is legitimately absent from any backup.

## 4. What arrives next

**S12 — the experiential gate** — is not an agent step: two consecutive
weeks of daily use by the owner, every friction recorded as project files
(the flywheel you have already been turning). The path closes on that
review, not on green tests: "Functional tests alone do not close these
milestones" (18).
