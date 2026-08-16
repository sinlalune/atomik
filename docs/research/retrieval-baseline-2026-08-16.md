---
type: Atomik Research Record
title: Retrieval baseline — the lexical engine measured, 2026-08-16
description: The first dated measurement of Atomik's retrieval: recall and ranking on the in-repo evaluation set, and cost on a real 115-file corpus. This is the baseline ADR-013's deferral of SQLite rests on, and the number any heavier stage has to beat.
tags: [research, retrieval, evaluation, bm25, baseline, cost]
timestamp: 2026-08-16T00:00:00Z
---

# Retrieval baseline (2026-08-16)

Bedrock 33 §Evaluation gates asks that a stage be measured before it is
trusted, and that the record carry what was measured, on what, and
against what baseline. This is that record for CP-MVP-010's lexical
engine — the one ADR-013 chose over SQLite FTS5, and the one M9's
embedding experiment will have to beat.

Reproduce with:

```bash
npm run retrieval-eval                                  # correctness
ATOMIK_EVAL_VAULT=/path/to/vault npm run retrieval-eval # cost
```

## What was measured

```text
engine        pure TypeScript BM25F (ADR-013), no native module
              tokenizer: NFD folding, French elision, kebab parts
              subject rules: common-term ceiling 0.5, principal df
              factor 2, title-share naming 0.5
reaches       titles · linked (default) · full
runtime       Node 22 under vitest, WSL2 on the owner's machine
corpora       fixture vault  40 files, in-repo, versioned with the tests
              real corpus    115 markdown files (this repository's docs/),
                             French and English mixed
```

## Correctness — the fixture set

Fourteen cases, each one written because a real question exposed a real
rule during the twelve owner bench rounds of 2026-08-16.

```text
recall@5      100.0%   (13/13 expected notes retrieved)
MRR           0.955
rejects       0 violations (transcripts, prompt files, hub neighbours,
                            boilerplate headings, out-of-scope notes)
coverage      the one no-material case reports its missing term
index build   17.7 ms
index size    103 KiB serialized
query mean    0.3 ms      p95 1.8 ms
```

MRR is 0.955 rather than 1.0 because `accented-query` ranks its expected
note second. That is honest: an unaccented query and its accented form
score slightly differently through the fold, and nothing in this path
pretends otherwise.

## Cost — a real 115-file corpus

```text
files            115          documents 115
distinct terms   10,072
nodes / edges    115 / 80     broken links 1
index build      154–167 ms   (cold, single pass, no cache)
index size       8.4 MiB serialized
query p95        0.4 ms
```

## Against ADR-013's thresholds

ADR-013 deferred SQLite with four numbers that would reopen it. Three
are comfortably clear; one deserves attention before the vault grows.

```text
cold build   > 2 s        166 ms at 115 files      clear (12x headroom)
p95 query    > 50 ms      0.4 ms                   clear (100x)
corpus       > 5,000 notes 115                     clear
index size   > 100 MB     8.4 MiB at 115 files     WATCH
```

The index size is the one that scales badly: position lists dominate it,
and they grow with total word count rather than with note count. Linear
extrapolation puts a 1,000-note vault near 70 MiB and a 1,500-note vault
past the threshold. Two cheap answers exist before SQLite is needed —
drop positions for the `body` field (phrases would still work on titles
and headings), or store them only for the rarest terms — and the honest
statement today is that the decision holds for the vault Atomik actually
has, with a trigger that is now measured rather than guessed.

## What the instrument found on its first run

Two defects, in the hour it took to build it:

1. **A note titled "What is an ethos ?" answered a question about
   Plato.** The naming signal treated any title token as naming its
   note, so `what` became a subject. Fixed by requiring a term to carry
   at least half of a title (`NAME_TITLE_SHARE`), which also retired the
   frequency patch S08l had needed for `to`.
2. **A vault containing the word `constructor` crashed the index.** The
   term map was a plain object, so `terms['constructor']` returned
   `Object.prototype.constructor` and the build died on `.push`. Fixed
   with null-prototype maps and guarded reads, plus the same fix in the
   graph's label registry — `constructor` is a valid kebab label.

Both were invisible to fourteen hand-written unit-test files and to
twelve rounds of human benching. That is the argument for the
evaluation set, more than any number above.

## Open questions this baseline hands forward

- **Reach default.** `linked` (title match plus linked notes) is the
  owner's ruling. Its recall cost — a note that discusses a subject
  without naming it anywhere is invisible — is not yet quantified: the
  fixture set asserts behaviour per reach, but no case measures how
  often a real question needs `full`.
- **Stemming.** French plurals and verb forms are not folded
  (`émotions` ≠ `émotion`). A stemmer is a dependency and a quality
  question; the set is where it would prove itself.
- **Convention files.** `index.md` and `log.md` still rank. Demoting
  them is a weight decision that this set can now measure.
- **Embeddings.** 33 and ADR-007 allow a semantic stage only after the
  lexical baseline is evaluated. It now is, and these are the numbers
  it must beat on accepted value, not on benchmark scores.
