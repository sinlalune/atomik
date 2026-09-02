---
type: Cairn Measurement
title: Manifesto convergence — the protocol measured against its own vision, 2026-09-02
description: The owner's manifesto applied to Cairn as it stands after S09a. Section by section, what the protocol already is, where it has drifted from the vision, what the current state of the art says, and the shape proposed for Cairn 1.0 — with the decisions the owner has to make before the genesis.
tags: [cairn, manifesto, audit, convergence, state-of-the-art, genesis, v1]
timestamp: 2026-09-02T00:00:00Z
---

# Manifesto convergence

The owner wrote two notes as the preamble of S09: the
[manifesto](./manifesto.md), which says what the protocol is *for*, and the
[project note](./cairn-project-note-2026-09-02.md), which says what the protocol
must *become* — its own repository, a kit, a documentation site, and the base of
every queued project. This page applies the first to the protocol as it stands
and answers the second.

It is written to be read once, top to bottom, by the owner. Each section ends
with the decisions that are the owner's to make. Nothing here changes the
protocol by itself: a decision becomes protocol when a work unit lands it.

## 1. What is being measured

Cairn after S09a, on this branch. The numbers are counted, not estimated.

| Surface | Measure |
| :-- | --: |
| Required reading to start a session (`AGENTS.md`, `paths.md`, `binding.md`, execution protocol) | 3,600 words |
| Normative specification (`specification/index.md`) | 17,500 words |
| Concept wiki | 73 files, 19,500 words (21 borrowed, 50 Cairn's own) |
| Implementation reference (9 pages) | 12,600 words |
| Retained design history under `docs/cairn/` (13 documents) | 33,000 words |
| Reference checker | 3,578 lines; 7 tools total 6,200 lines, 11,000 with tests |
| Distinct rule names in the catalogue | 38 (30 blocking rows, 21 advisory rows) |
| Files a fresh `cairn-init` writes into an adopter's repository | 119, of which 86 are the specification |
| Protocol files written for one lightweight path with one unit (greenfield pilot) | 24, for 5 product files |
| Cold readers who would start work from a brief alone (cold-resume pilot) | 7 of 20 |
| Steps in this path's own record | 58 |

Two things stand out before any section of the manifesto is opened.

The **entry chain is light** and it is the part the manifesto describes: four
short pages, roles instead of names, one binding. That is the protocol a
participant meets, and it is good.

The **corpus behind it is not**. The specification, wiki and reference together
are about 50,000 words — roughly 65,000 tokens — and the kit copies all of it
into every adopter's repository. The per-path cost is 24 protocol files for one
unit of work. The manifesto's first sentence names lightness as the defining
property, and by the numbers the protocol has two weights: a light surface and a
heavy body.

## 2. The manifesto, section by section

Each verdict is one of **holds**, **holds in part**, or **does not hold yet**,
followed by the evidence and by what would change.

### What defines the protocol — *"the most lightweight and minimalistic harness-agnostic document-driven coding protocol"*

**Holds in part.** Harness-agnostic holds: the bootloader is `AGENTS.md`, the
tools are dependency-free Node, no vendor file is required, and the greenfield
pilot ran without any agent product in the loop. Document-driven holds: every
state is a Markdown file with frontmatter, and Git is the only database.
Lightweight holds for the entry chain and fails for the body, as section 1 shows.

What would change: a **weight budget** the release is measured against, the way
ADR-020 already made context weight a constraint. The proposal in section 4 sets
targets rather than counts, because ADR-020 also found that a cap that has never
bound is a count, not a constraint.

- [x] Owner: agree that Cairn 1.0 is cut to a stated weight budget before it is published, rather than published and slimmed later.

### The engine — *OKF norms; optimized, distributed, decentralized; the leanest tree; free-standing hierarchy; lightest token footprint through navigation*

**Holds in part.** Distributed and decentralized hold strongly: one writer per
worktree, self-integration, no integrator, no lock service, nothing outside the
repository. Navigation holds: every folder carries an `index.md`, the concept
wiki separates borrowed from own vocabulary, and links are the only pointer.

The tree is not the leanest. Four sibling folders each hold one kind of
per-path event — `sessions/` for opening and closing records, `audits/` for the
audit, `briefs/` for the brief, `log/` for the journal — beside the path folder
that already holds the record and its steps. The manifesto asks for no duplicate
folders with close missions; these are five folders with one mission, *what
happened to this path*. The lightweight route was specified in v0.2 to fold
opening and closing into the record and is still unimplemented on every route
(pilot finding 1), which is why the pilot paid the full price on the default.

The OKF folder log is a tax every unit pays. S09a touched four `index.md` and
`log.md` pairs to land one change; this unit touches five. Git already keeps a
per-folder log natively (`git log -- <folder>`), and the manifesto says a
non-native solution beside a native one is usually not a best practice. The
`index.md` earns its place, because it says *why* a folder matters, which Git
cannot. The `log.md` restates what Git knows.

The portable corpus is split across two roots: `paths.md` is installed under the
project root while the specification is installed under the documentation root.
A free-standing hierarchy would put every portable page in one place.

- [x] Owner: fold per-path events into the path folder (opening and closing acceptance inline in `index.md`, audit questions answered in the closing record, brief merged into the record's live header) — the lightweight route as v0.2 already specifies it, made the only shape.
- [x] Owner: keep `index.md` per folder, retire `log.md` in path folders and the specification, and keep a single journal (`log/`, one file per integrated outcome).
- [x] Owner: one portable root in the kit — `paths.md` moves beside the execution protocol.

### The brain — *a shared concept knowledge base: protocol, project, or coding abstractions; semantic decomposition is the best way to learn*

**Does not hold yet, and this is the pillar the manifesto calls the core.** The
protocol's *own* vocabulary is the strongest part of the corpus: one article per
idea, a template that demands the failure the concept prevents and the predicate
that checks it, a rule that blocks an orphaned concept and one that makes growth
visible. That is the model.

The **project** and **coding** knowledge bases are not portable shapes. In Atomik
they exist as `docs/learning/` and `docs/modules/`, both host doctrine (bedrock
24), and the kit installs neither shape. Worse, the kit points an adopter's new
concepts at the *protocol's* wiki folder, so a project's vocabulary would land
among Cairn's. Forward-plan items 7b to 7f — the concept note as an artefact
type, link-don't-redefine, a generic concept-wiki exporter, learning notes
rebuilt on concepts — are the teaching axis the S08 opening brief called *"a
protocol requirement, not a documentation habit"*, and only 7d landed, partially.

What would change: the concept wiki becomes a first-class portable artefact with
**three scopes** — protocol, project, coding — one template, one index shape, and
one exporter. The protocol's wiki is the worked example an adopter's repository
starts from, not the folder it writes into.

- [x] Owner: confirm the three-scope concept wiki as a Cairn 1.0 deliverable, ahead of any further checker work.
- [x] Owner: decide whether learning notes (one build, in order) are a Cairn artefact or an Atomik one. The manifesto's pedagogy section argues for Cairn.

### The chronology — *idea, then ideation and research, then vision, then specification documents, then a roadmap, then coding cycles that reference those documents, with research loops during the project*

**Does not hold yet, and it is the largest structural gap.** The manifesto
describes six stages. The specification covers one and a half of them: the
coding cycle, and the registration that opens it. Everything upstream —
brainstorm sessions kept verbatim, promotion of a brainstorm into an accepted
architecture page, decision records, a roadmap, and the milestone-to-path
register that maps the roadmap onto paths — exists in Atomik as bedrock 17, 18,
24 and the register in `coding-paths/index.md`, and none of it is portable.

This is also why the corpus is heavy in the wrong place. A protocol that is one
and a half stages deep and 65,000 tokens wide has spent its weight on closure
mechanics, while the stages the owner actually lives in — sitting on an idea,
researching it, turning it into a specification and a roadmap — are the ones a
new adopter has nothing for.

What would change: the specification is **reorganised on the chronology**. Six
chapters, one per stage, the coding cycle being one of them and shrunk. Upstream
stages need few rules and light shapes: a brainstorm note is verbatim and
provisional; a promotion is one reviewed unit that adds an architecture page and
a decision record; a roadmap milestone is a row that either has a path or says
it does not yet. The register already does this in Atomik.

- [x] Owner: accept the chronology as the spine of the Cairn 1.0 specification.
- [x] Owner: name which upstream shapes are portable from Atomik as they are (brainstorm note, decision record, roadmap register) and which are Atomik-only (bedrock's product pages).

### The approach — *symbiosis with modern tools; native over invented; robustness, stability, simplicity in balance*

**Holds in part, and the trend is right.** ADR-022 is the manifesto in action:
the retention namespace, its generations and its three-state verdict were an
invented solution to a problem the protocol had created for itself by mandating
a rebase, and removing the cause removed eleven rules' worth of apparatus. The
rejected-approaches list in the brief shows the same instinct repeatedly.

Two non-native solutions remain. **Integration is `manual-git`**: a path merges
itself with a local `--no-ff` merge, and the protocol re-implements by hand what
a pull request gives natively — a review that is recorded, a required status
check, a merge that is the same object CI tested, and branch protection. The
closing acceptance record, the acceptance-drift predicate and the "integrate the
exact ready tip" sequence are three pages of operations that a pull request with
one required check replaces. **Ceremony records are hand-written files**
(opening note, audit, closing acceptance) with schemas the checker validates
field by field; a pull request's description and approval are the native form
of the same judgement.

Registration before branching stays: it is cheap, it is real, and it is what
makes the live view complete. It has no native equivalent.

- [x] Owner: make the pull request the default integration transport in Cairn 1.0 (`manual-git` kept as the no-forge fallback), with `cairn-check` as the one required status check.
- [x] Owner: let closing acceptance be the review approval plus the journal entry the merge writes, rather than a separate hand-written record.

### The code — *isolated steps: planning, coding, reviewing, tests; the simplest and cleanest implementation; absorb ecosystem change*

**Does not hold yet.** Cairn sequences at the *path* level — open, units, audit,
accept, integrate — and says nothing at the *unit* level beyond "code, tests,
docs and ledger move together". There is no planning step inside a unit, no
review step, and no coding stance at all: the protocol governs records, not
code. The manifesto asks for both, and the state of the art (section 3) has a
ready shape for each.

- [x] Owner: add a coding stance to Cairn — the decision ladder in section 3 — as a skill, not as a rule the checker enforces.
- [x] Owner: define the work unit as plan → change → self-review → verify, with the plan and review as short sections of the step record rather than new files.

### The engagement — *production-level workflow, beginner-friendly surface*

**Holds in part.** The entry chain is beginner-sized. The specification is
written as a learning route, which is the right idea, but it is 17,500 words
before the wiki, and the kit hands all of it to an adopter on day one. The
project note asks for four documentation layers — manifesto, beginner overview,
quick starts, exhaustive reference — and only the last exists.

- [x] Owner: the kit installs the thin surface (bootloader, config, tools, templates, skills) and *links* the specification at the pinned release; it stops copying 86 pages into every repository.

### The pedagogy — *everything written or generated is effortlessly comprehensible*

**Holds in part.** The concept template and the borrowed/own split are
exemplary. The prose of the specification and of this path's records is precise
but dense: step titles are aphorisms, and the records are written as
investigations. That is knowledge, and it is not effortless. The measurement
culture — two pilots, twenty cold-resume trials, every claim counted — is rare
and should be visible in the public documentation as a feature, in plain words.

- [x] Owner: a writing rule for Cairn 1.0 pages — one idea per page, the plain definition first, examples before rules — applied to the rewrite, not retrofitted onto history.

### The project — *the lightest but most efficient layer of project context; agnostic from previous or future implementation context*

**Holds in part.** The born-sliced record, the pinned `governs:` and the brief's
answerable-alone contract are the right design, and the cold-resume pilot showed
exactly which two fields were missing. The cost is the number of artefacts: for
one path, a record folder, a brief, two session records, an audit, a journal
file and a regenerated view. The brief's own rejected-approaches entry — *a
self-sufficient brief is a second copy of the path record* — is the argument for
merging it into the record's live header rather than keeping it as a file the
protocol must remind writers to refresh (pilot finding 7).

- [x] Owner: one path, one folder — record with inline live header and resume section, optional plan, steps. Nothing else per path except the journal entry at integration.

### Threats and opportunities

The manifesto's first threat is *"searching for more control in the volume of
tests and complexity of workflows."* The S07 to S09 arc is that threat and its
justification at once: the drive for honest predicates produced 275 subtests, a
retention scheme later removed whole, and nineteen pilot findings — and it also
found real defects a public release would have shipped. The lesson is not that
the rigour was wrong. It is that the rigour should apply to a **smaller surface**:
fewer rules, each sound, rather than more rules made sound one by one.

The third threat, *not embracing progress outside the protocol*, is the one
currently open. Section 3 names four developments the protocol has not absorbed.

## 3. Proof against the current state of the art

The project note asks whether Cairn is already out of date. Checked against what
is in use in September 2026:

| Development | What it is | Cairn today | Verdict |
| :-- | :-- | :-- | :-- |
| `AGENTS.md` | The de-facto cross-vendor bootloader file; tens of thousands of repositories; thin root plus per-package files is the recommended shape | Cairn's bootloader *is* `AGENTS.md`, and it points rather than contains | **Aligned.** Cairn was early. |
| Agent Skills (`SKILL.md`) | Open standard released December 2025, adopted by most agent products within a quarter; a skill is a folder with a short instruction file loaded on demand, under about 5,000 tokens | Not used. Cairn's procedures live in operations pages the reader must find | **Not absorbed — the single largest gain available.** Progressive disclosure is the manifesto's token principle made standard. Cairn's procedural half — open a path, complete a unit, close a path, brainstorm — should ship as skills. |
| Spec-driven development (Spec Kit, OpenSpec, BMAD, Kiro) | Toolkits that scaffold specify → plan → tasks before code; Spec Kit is the most portable, OpenSpec the lightest and change-centric | Cairn's chronology is spec-driven development plus durable execution memory, but the upstream stages are not in the specification | **Complementary, not competing.** None of them keeps honest execution state or candidate-bound closure. Cairn should be compatible — a path may reference a spec from any of them — and should not rebuild their scaffolding. OpenSpec's change folder is the closest cousin of Cairn's path folder. |
| Beads | Git-backed graph issue tracker for agents: hash ids, dependency edges, `ready` work computed from the graph, a database beside the code | Paths are Markdown records; dependencies between paths are prose (CP-MVP-012 "depends on" CP-MVP-011) | **A graph is not necessary; one edge is.** A `depends_on:` field in the path record and a live view that shows which registered paths are unblocked covers the need. A database beside Markdown is the non-native solution the manifesto warns about. |
| Ponytail | A skill that makes an agent build only what the task needs: a decision ladder (does it need to exist → already in the codebase → standard library → platform → installed dependency → one line → minimum code), read the real flow before choosing, deletion over addition, a three-line explanation cap | No coding stance at all | **Adopt the stance, and turn it on the protocol itself.** "Deletion over addition" is section 4. |
| Worktree per task, parallel agents | The default baseline in 2026 guides | One path = one worktree = one writer, self-integration | **Aligned.** Cairn was early here too. |

Cairn is not out of date in its execution half; it is ahead of the tools on
durability and closure honesty. It is behind on packaging — skills — and thin on
the upstream half the tools have made ordinary.

- [x] Owner: ship Cairn's procedures as Agent Skills in the 1.0 repository.
- [x] Owner: add `depends_on:` to the path record and "unblocked" to the live view; no graph database.
- [x] Owner: state compatibility with spec-driven toolkits in the overview rather than competing with them.

## 4. The final form — Cairn 1.0

A proposal, applying Ponytail's own ladder to Cairn: does it need to exist,
does something native cover it, can it be one thing instead of three.

### The spine

Six chapters on the chronology. The coding cycle is chapter five, and it is the
current specification cut down.

```text
1 Idea and ideation    brainstorm notes: verbatim, dated, provisional
2 Research             research notes and sources: what was read, what it means
3 Vision and specs     architecture pages and decision records: reviewed promotion
4 Roadmap              milestones → paths register: every milestone accounted for
5 Coding cycle         path record, units, candidate, review, integration
6 Learning loop        concept wiki (protocol · project · coding), learning notes
```

### What stays, what goes

**Rules.** Keep a blocking rule only where the manifesto's own test holds: an
objectively checkable condition whose breach leaves the repository wrong.
Proposed keep list — `links`, `schema`, `derived-view`, `registration` and
`registration-base`, `branch-path`, `transition`, `work-unit`, `scope-digest`,
`acceptance` (absorbing `closure-surface`, `advisory-disposition` and
`coherence-audit`, which become the pull request's checklist), `record-integrity`,
`path-history`, trunk containment (`rebase`), `journal-entry`, `scope-drift`,
`concept-orphan`. Proposed retire or demote — `checkpoint-retention` (dead under
the default policy; a `retained` plugin if a host ever needs it),
`migration-debt` and `ledger-size` (host debts, scheduled to retire already),
`brief-schema` (the brief merges into the record), `base-parity` (one invocation
form remains), `redaction` and `record-date` to advisory, `same-work-unit` and
`area-note` merged. Roughly 38 names become about 20, every one with its
adversarial fixture kept.

**Concepts.** 50 own concepts become about 30 by merging what the specification
only ever uses together: the six state pages into `lifecycle`; the six role
pages into `roles`; blocking, advisory and inconclusive findings into `finding`;
`proxy-predicate`, `unsound-gate`, `adversarial-fixture`, `gate-parity` and
`instruction-parity` into one `soundness` page that lives with the tools, since
they are about engineering the checker, not about using the protocol. The 21
borrowed terms stay: they are the beginner's on-ramp.

**Records per path.** `index.md` (declaration, inline opening acceptance, live
header, resume section), optional `plan.md`, `steps/`. Closing is the pull
request; the journal entry is written by the integration. No separate brief,
session, audit or folder log.

**Routes.** `lightweight` as designed and finally implemented, and `full` for
protocol or control-plane work. `foundation` folds into `full` with
documents-only writes; `emergency`, named and unimplemented since v0.2, is
dropped rather than carried.

**Weight budget.** Specification under 8,000 words; entry chain under 3,000;
kit under 30 files; one lightweight unit under 6 protocol files. Targets, measured
at release, stated in the conformance page.

### The repository

```text
cairn/
  AGENTS.md            the repository bootloads itself: Cairn is developed on Cairn
  manifesto.md         the owner's statement, edited edition
  README.md            beginner overview and the three quick starts
  spec/                index.md on the six-chapter spine · concepts/ · reference/
  skills/              cairn-brainstorm · cairn-open · cairn-unit · cairn-close · cairn-code
  kit/                 what init installs: AGENTS.md template, config, path template, workflow
  tools/               cairn-check · cairn-active · cairn-init · cairn-update, with tests
  site/                the React Markdown renderer with Mermaid, built from manifesto, README and spec
  project/             Cairn's own paths, register and journal
```

### Distribution — the benchmark the project note asks for

| Mechanism | Install | Update | Verdict |
| :-- | :-- | :-- | :-- |
| Template repository (clone or "use this template") | one click | none; the adopter's history begins with Cairn's, and every later change is a manual merge | Rejected. |
| Git submodule or subtree | native Git | subtree pulls; submodules are friction every clone pays | Workable for the specification only; wrong for files the adopter edits. |
| `npx cairn init` / `npx cairn update` | one command, no dependency in the adopter's tree, `cairn.lock.json` already records release and per-file digests | `update` diffs digests, rewrites pristine files, reports edited ones — the migrator the lock file was designed for | **Recommended.** It is what Spec Kit and OpenSpec adopters already expect. |
| Skills marketplace install | the procedural half, per agent product | per product | Complement to the command, for the skills only. |

Version check: `cairn.lock.json` names the release; `npx cairn@latest status`
compares it with the published one and lists what an update would touch. The
site publishes one page per release.

### The cutover — forward-plan item 12

Authority moves once. The genesis commit of the `cairn` repository is the cut;
from it, Atomik is an adopter with a lock file, its `docs/cairn/` history stays
as history, and its `tools/` are installed copies. Nothing portable is edited by
hand in two places from that commit on.

- [x] Owner: approve the six-chapter spine, the keep and retire lists, and the weight budget as the opening acceptance of the genesis path — with the right to strike any line.
- [x] Owner: choose `npx cairn` as the distribution mechanism.
- [x] Owner: name the genesis commit as the authority cutover and Atomik as the first adopter.

## 5. The protocol as a project

What Cairn genuinely adds, and what a public reader has not seen elsewhere:

1. **Registration before branching, with a generated live view** — the portfolio
   is always complete, and no one maintains it.
2. **Candidate-bound closure** — acceptance names one exact object id, and
   integration lands that object.
3. **The soundness discipline** — a rule is a sentence turned into code, the join
   is where defects live, and only an adversarial fixture proves a rule works.
4. **Born-sliced records with pinned reading** — what to read *at which version*,
   measured by cold readers rather than asserted.
5. **Portable protocol, host binding, executable configuration** — one text, one
   workflow, whoever reads it.

Those five are the story, and they are worth telling for the owner's stated
purposes — sharing the protocol and standing on it as a product builder. The
measurement habit around them is the credibility: a protocol that publishes its
own failed first run is unusual.

Three honest risks:

- **Self-reference.** This path's 58 steps were spent almost entirely on the
  protocol itself. The manifesto's last opportunity is *"always leverage what you
  built"*, and the queued projects are the only test that matters now. The
  release criterion should be a weight budget and one adopter, not a defect-free
  checker.
- **The heavy body.** Every adopter today receives 65,000 tokens of specification
  and 38 rules. The cut in section 4 is the manifesto's threat number one
  answered by deletion.
- **One maintainer.** A protocol with a site, a kit, skills and a migrator is a
  product. The dogfooding loop the project note describes — projects feed the
  protocol, releases feed the projects — only works if each release is small.

The recommended sequence: close this path as it stands (S09c), open the genesis
as the first path of the new repository under the shape in section 4, cut before
adding, and let the first queued project be the first adopter.

- [x] Owner: close CP-OPS-002 without further protocol work in it.
- [x] Owner: open the genesis path in the new repository with this page and the manifesto as its opening input.
- [x] Owner: pick the first queued project as adopter number one, and let its friction set the 1.1 agenda.

## 6. What this page does not do

It changes no rule, no page of the specification and no tool. It moves nothing
between repositories. It was written by the path's writer, who also wrote most of
what it audits; the owner's rulings on the checklists above are what make any of
it protocol. The ponytail skill, Agent Skills specification, spec-driven toolkits
and Beads were checked from their public descriptions on 2026-09-02, not run.
