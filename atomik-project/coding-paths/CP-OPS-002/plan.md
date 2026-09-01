---
type: Atomik Coding Path Plan
title: 'CP-OPS-002 — the forward plan'
description: The steps CP-OPS-002 has not executed yet. Explanatory until it is executed, so it is read when planning rather than before every step.
tags: [cairn, ops, plan, coding-path]
timestamp: 2026-09-01T00:00:00Z
atomik:
  path: CP-OPS-002
---

# CP-OPS-002 — the forward plan

Split out of the path record at S08l. A plan is explanatory until it is executed,
so by [ADR-020](../../../docs/adr/ADR-020-protocol-context-weight.md) decision 1
it is not required reading for a resuming session — it is read when planning.
Executed steps move to [`steps/`](./steps/index.md) and leave one index line in
[index.md](./index.md).

### S08 — Make the rules honest, then extract Cairn from Atomik

Opening context: [`docs/cairn/cairn-s08-opening-brief-2026-08-31.md`](../../../docs/cairn/cairn-s08-opening-brief-2026-08-31.md).
Read it before the first unit — it carries four findings that reorder this step,
three of them live and one of them new as of the rebase on 2026-08-31.

S08 was planned as portability alone. It now runs in three parts, because
shipping a portable copy of an unsound checker multiplies the unsoundness by the
number of adopters.

#### Part 1 — the live defects

1. **`hasCeremony` passes from the day a path opens.** It matches any session
   note whose *filename* contains the path id, so the opening check satisfies the
   closing gate — in the rule `paths.md` calls "the only human guard left once
   the integrator is gone". Read the `ceremony:` key instead; bedrock 24 already
   specifies it and this branch already has `ceremonyFromSessions`.
2. **The merge-time journal entry has no predicate.** Required by `AGENTS.md`,
   enforced nowhere. CP-UI-TYPOGRAPHY closed, was audited and was proposed for
   merge with none, and every gate reported `OK`.
3. **The derived-view rule keys on the branch name**, so a local run and a CI run
   disagree on one tree. Key on the path's declared `status`.
3b. **The default local command and the CI command compare different bases** —
   working tree versus HEAD, against branch versus trunk. Nine findings were
   invisible locally for many pushes. `npm run cairn-check` on a `path/*` branch
   must default to the trunk base; a developer should opt *out* of the
   merge-deciding comparison, not into it. Done first, at **S08a**, for the
   reason the item itself gives: until it landed, every "gates green" claim in
   this ledger — including the ones already written — was weaker than it read.
3c. **A record's filename date MUST equal its frontmatter `timestamp:`.** Cheap
   and sound — it compares two things the author wrote, so the checker never
   needs to know what day it is. Found because every CP-UI-TYPOGRAPHY record is
   dated four days before the work happened.
4. **Retention switches itself off during the mandatory pre-merge rebase.** A
   rebase renames every commit, the retained set stops intersecting the branch,
   `findIndex` returns `-1`, and `unretainedCheckpoints` concludes "nothing to
   judge" instead of "everything is unretained". Measured on this branch: 13
   refs, 41 commits in range, 0 intersecting, gate `OK`. The ref namespace has no
   room for the fix — `<path-id>/<n>` cannot name the same unit before and after
   a rewrite — so this is **an ADR before it is code**.

#### Part 2 — make soundness structural

5. An adversarial fixture for every blocking rule, asserting the rule's own name
   in the finding. Twenty-six of them. This is what converts "four bugs fixed"
   into "this class of bug fails the build".
6. A test running one gate in both invocation contexts, asserting one verdict.
7. Generate the conformance matrix, so directive requirement 4 is mechanical.

#### Part 3 — the teaching axis, which the init kit must carry

Owner directive: *decomposing complex into simpler concept units is the only way
to truly understand something*, and the knowledge base must be exportable. This
is a protocol requirement, not a documentation habit.

The distinction that makes it work: a **concept note** is organised by one idea
and is a link target; a **learning note** is organised by one build in order and
is not. `docs/learning/` is excellent at the second and does not attempt the
first. Both belong; only one is reusable from elsewhere.

7b. Specify the concept note as an artifact type — shape, frontmatter, and the
   rule that it is about exactly one idea. The four written in S07q are the
   worked examples.
7c. **Link, don't redefine.** Where a term has a concept note, normative and
   learning text SHOULD link it. Redefinition in two places is the same drift as
   four copies of a font stack, applied to prose.
7d. `cairn-init` scaffolds `concepts/` with an index separating borrowed
   vocabulary from vocabulary the project defines, plus the page template.
7e. Generalise `cairn-spec-build.mjs` so **any** project's concept wiki exports
   as one self-contained reader — the "export to another md base" the directive
   asks for.
7f. Rebuild `docs/learning/` on it **incrementally**: when a learning note
   explains an idea that deserves a name, extract the idea and link to it. The
   walkthrough stays.

It lands before portability because `cairn-init` scaffolds it. A form added after
adoption is a migration; a form added before adoption is just the shape of the
thing.

#### Part 4 — portability, as originally planned

8. `cairn.config.json` and the loader — plane roots, source roots, `AREA_MAP`,
   trunk name, and `"enforcement": "local" | "ci" | "protected"` (S06b).
   `cairn-check` prints the declared tier, so "CI observes" versus "CI prevents"
   is generated rather than asserted in drifting prose.
9. The folder rename to the portable role name, which the loader makes real.
10. `tools/cairn-new.mjs` — registration commit, gates and worktree in one
    command. The registration done by hand on 2026-08-31 is the worked example.
    An earlier revision of this item claimed the trunk requires a pull request;
    it does not — `master` carries no branch protection, which is consistent with
    the declared `ci` tier and with `transport.integration: manual-git`. Checked
    identity and landed identity are equal because the tested merge commit is the
    one pushed. Corrected at S08t rather than left as a claim about the host that
    the host contradicts.
11. `cairn-init` seed template and the ex-nihilo bootstrap prompt, scaffolding
    **tiers 0 and 1 only**: the validator, the config, the docs skeleton and the
    workflow file. No host configuration, no account, nothing to click.
12. **Extraction has one authority, and the cutover is deterministic.** The
    portable corpus lives in `docs/cairn/` inside this host today. Publishing it
    must MOVE that authority, not copy it: at no point may the portable protocol
    be maintained by hand in two places, because a hand-synchronised second copy
    is how a specification and its implementation drift apart while both look
    maintained. The cutover names which side is authoritative from which commit,
    and the losing side becomes a generated or linked mirror — never an edited
    one. Recovered from the interrupted S08p session, where it existed only in
    the session and in no file; recorded here before it could be lost twice.

### S09 — Greenfield pilot, coherence audit, closing ceremony, self-merge

Initialize one real ex-nihilo repository from the kit — the research-paper workspace the
brief names — and fix what the pilot finds before merging.

- **S09a — done.** The pilot ran twice; the record is
  [`docs/cairn/cairn-greenfield-pilot-2026-09-01.md`](../../../docs/cairn/cairn-greenfield-pilot-2026-09-01.md)
  and the step is [`steps/S09a.md`](./steps/S09a.md). Two findings are deferred
  and named there: a `brief-stale` advisory, and the initializer's area note.
- **S09b — this path's own closure.** On a `forbidden` host: fetch and merge
  `master` into the branch, run every gate on candidate `C`, scaffold and fill
  the coherence audit bound to `C`, obtain the owner's closing acceptance, land
  the administrative commit, check acceptance drift, integrate from the owner's
  trunk checkout with a `--no-ff` merge that records `done`, regenerates the
  live view and writes the journal entry, verify the remote trunk, and remove
  the clean secondary worktree from another checkout. The operations page now
  states this sequence as the checker enforces it; follow the page.
