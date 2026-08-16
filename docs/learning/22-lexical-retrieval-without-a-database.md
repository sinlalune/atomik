---
type: Atomik Learning Note
title: 22 — Lexical retrieval without a database: tokenizers, inverted indexes, and BM25
description: How Atomik searches the vault from zero — what a token is, why an inverted index exists, what BM25 actually computes, and why the answer here is 200 lines of TypeScript instead of SQLite. Covers CP-MVP-010 S02.
tags: [learning, retrieval, bm25, tokenizer, inverted-index, search]
timestamp: 2026-08-16T00:00:00Z
---

# 22 — Lexical retrieval without a database

Files: `apps/desktop/shared/retrieval-core.ts` (pure engine),
`apps/desktop/electron-main/search.ts` (the I/O half),
`apps/desktop/tests/retrieval-core.test.ts`.
Decision: `docs/adr/ADR-013-lexical-retrieval-without-a-database.md`.

## Who this is for and what you can do afterwards

You have written `Ctrl-F`-style search before — "does this string appear in
this text?" — and you have heard that real search uses "an index" and
"BM25" and usually a database. Afterwards you can read every line of
Atomik's engine, explain why a note ranks where it ranks, and change the
ranking on purpose instead of by trial.

## The question the engine answers

Not "which files contain this string?" but **"which files best answer this
query, and why?"** Those are different questions, and the second one is the
only one useful to a RAG system, because a context packet has room for
about a dozen entries and must choose.

The old implementation answered the first question:

```ts
if (line.toLowerCase().includes(needle)) …   // the M1 substring scan
```

It could not rank, could not tell a title from a footnote, and could not
find `éthos` when you typed `ethos`.

## Step 1 — a token is a decision, not a fact

Tokenizing is cutting text into the units you will match on. Every choice
is a policy:

```text
"L'éthos"  ->  ethos          fold accents, drop the elided clitic
"oppose-a" ->  oppose-a, oppose, a    keep the kebab label AND its parts
"Ethos"    ->  ethos          lowercase
```

`foldTerm` does the folding in two moves: `normalize('NFD')` splits `é`
into `e` + a combining accent, and the regex `/[̀-ͯ]/g` deletes
the accent. This is the entire trick behind "accent-insensitive search",
and it costs nothing.

The parts rule is where Atomik's own shape shows up. ADR-011 edge labels
are kebab (`oppose-a`), so a label must be findable whole; French elision
(`l'éthos`) must not fill the index with one-letter words. Same run, two
different separators, two different policies — read `keptParts`.

What Atomik deliberately does NOT do: stemming (`jardinage` → `jardin`).
A French stemmer is a dependency and a quality question, so it waits for
the S10 evaluation set to say whether it is worth it. Not knowing yet is a
legitimate state; guessing is not.

## Step 2 — an inverted index is a lookup table you could write by hand

A normal index maps document → words. An *inverted* index maps word →
documents:

```text
"ethos"  -> [ {doc: 0, field: 'title',  tf: 1, pos: [0]},
              {doc: 0, field: 'body',   tf: 2, pos: [0, 7]},
              {doc: 1, field: 'link',   tf: 1, pos: [2]} ]
```

`tf` is how often the term appears in that field of that document; `pos`
is where, as ordinals, which is what makes phrase search possible ("are
these two words adjacent?"). That is the whole data structure. A database
would store the same thing — it would just store it in a file format you
cannot read.

Atomik indexes **six fields** per document (title, heading, path,
frontmatter, link, body) because "where a word appears" is most of what
tells you whether the document is about it.

## Step 3 — BM25, in plain arithmetic

For each query term, each document gets a score built from three ideas:

```text
IDF   rare words matter more than common ones
      log(1 + (N - df + 0.5) / (df + 0.5))
      df = how many documents have the term at all

TF    more occurrences matter, but with SATURATION
      tf * (k1 + 1) / (tf + k1 * …)
      the tenth occurrence adds much less than the second

LEN   a match in a short field is worth more than in a long one
      … (1 - b + b * fieldLength / averageFieldLength)
```

`k1 = 1.2` controls how fast saturation kicks in; `b = 0.75` how strongly
length is normalized. They are the standard defaults, and Atomik keeps
them until measurement says otherwise.

Atomik then multiplies each field's contribution by its weight
(`title: 3 … body: 1`) and sums. That variant is called BM25F. Because the
score is accumulated per field, a hit can report *which fields earned it* —
which is exactly what the UI shows as "why this result", and what makes
the packet's selection inspectable rather than magical (26/33).

## Step 4 — the pure/impure split, again

The same rule as `graph-core` (see note 20):

```text
retrieval-core.ts   pure: tokenize, build, score. No fs. No Electron.
search.ts           walks the perimeter, reads files, maps hits to the
                    SearchResult contract the renderer already speaks
```

Two consequences worth internalizing. First, every ranking rule is testable
in milliseconds without launching the app — `retrieval-core.test.ts` runs
in 7 ms. Second, the index never stores note TEXT, only counts and
ordinals; snippets are extracted on demand from the few files a query
actually returned (`extractMatches`). Small index, no duplicated vault.

## Step 5 — why not SQLite FTS5?

Because the cost is real and the benefit is not, yet: a native module
rebuilt for every Electron version (or an experimental runtime flag), for a
133-file corpus that a full scan handles inside a frame. ADR-013 records
the decision **with the numbers that would reverse it** — cold build > 2 s,
p95 query > 50 ms, index > 100 MB, > ~5,000 notes.

That shape is worth copying: a deferral with a trigger is a decision; a
deferral without one is a habit.

## Take-over exercises

1. Add `console.log` inside `searchIndex`'s scoring loop and run one query
   from the test file. Watch IDF drop for a word that appears everywhere.
2. Set `FIELD_WEIGHTS.title` to `1` and run `retrieval-core.test.ts`.
   Which test fails first, and does the failure describe a real regression
   or only a preference?
3. Add a note to the fixture whose body repeats one word forty times. Show
   that saturation stops it from beating a title match.
4. Make `tokenize` keep one-letter clitics and explain, from the postings
   it produces, why `l` then behaves like noise.
5. Write a query that only a phrase filter can answer correctly, and prove
   with a test that removing the quotes changes the result.
