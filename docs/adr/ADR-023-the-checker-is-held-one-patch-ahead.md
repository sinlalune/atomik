---
type: Atomik ADR
title: 'ADR-023: The checker is held one patch ahead of its release, and the patch is a link exemption this repository cannot otherwise declare'
description: Cairn 1.1 dropped the two link exemptions Atomik's 0.2 checker carried, and ruled them the adopter's own. The adopter has no way to declare them, because the release offers no configuration field for a portrayal or a frozen history. This repository therefore edits the one kit file it most wants current, and records what that costs and what retires it.
tags: [adr, cairn, protocol, links, fork, kit, exemption]
timestamp: 2026-09-22T00:00:00Z
adr:
  id: ADR-023
  status: accepted
  date: 2026-09-22
---

# ADR-023: The checker is held one patch ahead

Status: accepted
Date: 2026-09-22
Accepted: 2026-09-22, owner
Context: CP-OPS-003 S05

## Context

The adoption of Cairn 1.1.0 at `37f56a5` installed `tools/cairn-check.mjs` from
the kit. The next command the adoption itself prescribes — `npm run
cairn-check` — failed, with five blocking `links` findings in files the
adoption had not touched:

```text
docs/fixtures/capture_source_dossier.md → ./original.jpg
docs/fixtures/capture_source_dossier.md → ./transcript.md
docs/fixtures/capture_source_dossier.md → ../../../notes/query-key-value-vectors.md
docs/fixtures/truth_claim_fixture.md    → ../sources/web/wikipedia-about/source.md
atomik-project/log.md                   → ./original.pdf
```

Atomik's own 0.2 checker had exempted exactly these two classes and said why.
Cairn dropped both in `e18bbe4` — Cairn's `CP-CAIRN-001` S02, where the journal
became a folder and took the expression naming them with it — and the same
path's S06 ran `adopt` against Atomik and met these five findings. Its ruling
stands and is right about ownership:

> Those exemptions were Atomik's, and they left in S02; the links are Atomik's
> adoption work, and `adopt` said so rather than passing over them.

A protocol should not carry one repository's exemptions.

## The problem the ruling leaves

The work it assigns cannot be done.

- `docs/fixtures/` holds sample documents **portraying another vault**. Their
  links point into that imaginary vault by design. A fixture whose links
  resolve has stopped portraying another vault and started describing this one.
- `atomik-project/log.md` says in its own first lines **FROZEN 2026-08-14 —
  archive only. Every entry below is history and stays exactly as written**,
  and this protocol forbids rewriting a history elsewhere in the same breath.

So the repair is: edit a file the repository declares unrewritable, or delete
the evidence. And the ruling's own premise — *those exemptions were Atomik's* —
has nowhere to live. Release 1.1 offers no `roots` entry, no rule option and no
configuration field with which a repository can say *these paths are
portrayals, and this file is frozen*. The only expression available is to edit
the checker.

## Decision

**This repository holds `tools/cairn-check.mjs` one patch ahead of release
1.1.0.** The patch restores the two exemptions at the top of the `links` rule:
**one hunk at line 3677** — a two-line `linkExempt` predicate, one changed
`for` line that filters by it, and the comment that says why. `diff` against
the release's file at `bff7e2a` reports that hunk and nothing else.

The fork is declared, not hidden:

1. The patched region names this ADR, and carries the correct attribution.
2. `cairn.lock.json` reports the file as edited, which is true and must stay
   true. Its digest is never hand-synced; an edited kit file that reads as
   pristine is a lock that has stopped being evidence.
3. `npx cairn-protocol update` therefore never rewrites this file, which is the
   mechanism that protects the patch and the cost that comes with it: every
   later improvement to the checker must be taken deliberately.

## What was rejected

- **Repairing the five links.** It destroys what each file exists to be, and
  for the journal it is a rewrite of a history the protocol forbids rewriting.
- **Deleting the fixtures.** Same, with evidence lost as well.
- **Carrying the exemption upstream in Cairn's own checker.** The CP-CAIRN-001
  S06 ruling refused it and is right: a protocol that hard-codes one adopter's
  folder names is worse than an adopter that edits one file.
- **Waiting.** The gate is the repository's, and a red gate teaches a writer to
  read past red.

## What retires this ADR

Cairn PR #23, merged 2026-09-21, carries the observation as an adopter field
note: give a repository a way to declare what the ruling already says is its
own — a list in `cairn.config.json` of paths whose relative links the `links`
rule does not resolve, each with its reason beside it. A note there is evidence
for a protocol change, never authority for one, so the ask is filed and not
granted.

When a release carries that field, this repository:

1. writes the two classes into `cairn.config.json` with their reasons;
2. runs `npx cairn-protocol update --take tools/cairn-check.mjs`, which
   restores the release's file and makes the lock read pristine again;
3. supersedes this ADR with one that records the exemption as configuration.

Until then the patch stands, and `cairn-check` is green on a repository whose
fixtures still portray another vault and whose journal is still frozen.
