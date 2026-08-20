---
type: Atomik Coding Path
title: Cairn — parallel coding paths, self-merge, and the CI that enforces it
description: Make it possible to run several agents at once on different subjects without losing what the single-active-path discipline protected — by making coding paths themselves the unit of parallelism, one per worktree, each merging itself, with a CI check standing in for the gatekeeper that no longer exists.
tags: [coding-path, process, concurrency, paths, worktree, self-merge, ci, ops]
timestamp: 2026-08-14T00:00:00Z
atomik:
  id: CP-OPS-001
  status: running
  accepted: 2026-08-14
  current_step: closing
  base_commit: cc78d2f
  branch: path/cp-ops-001
  writes:
    - AGENTS.md
    - tools/cairn-active.mjs
    - tools/cairn-active.test.mjs
    - tools/cairn-check.mjs
    - tools/cairn-check.test.mjs
    - tools/gen-d14-workflow.py
    - docs/bedrock/22_22-agent-handoff.md
    - docs/bedrock/24_24-doc-templates.md
    - docs/bedrock/35_35-coding-path-execution-state.md
    - docs/adr/ADR-012-parallel-paths-self-merge.md
    - docs/diagrams/D08_bootstrap_protocol.svg
    - docs/diagrams/D13_concurrent_execution_lanes.svg
    - docs/diagrams/D14_cairn_protocol_workflow.svg
    - docs/diagrams/index.md
    - docs/learning/21-concurrent-lanes-and-worktrees.md
    - atomik-project/coding-paths/paths.md
    - atomik-project/coding-paths/ACTIVE.md
    - atomik-project/coding-paths/index.md
    - atomik-project/coding-paths/CP-OPS-001.md
---

# Goal

The owner's framing (brainstorm 2026-08-14, verbatim): *"its hard to run
mutliple agent in parallele, working on different subject, in a worktree or
not, like maybe doing feedback fine tuning, while going forward on the roadmap,
how can we adjust the structure to make it possible N?"*

The active-path discipline protects architectural coherence, documentation
coverage, resumability and integration order. The pressure point is that the
single active path also behaves as a single execution LANE. Those are two
different jobs, and only the second one is the constraint:

```text
one active INTEGRATION parent  = one coherent strategic direction
N accepted lanes               = bounded parallel execution
one integration gate           = one coherent repository history
```

This is not invented architecture. Bedrock 35 §Session protocol already says
larger work may be *"a parent path containing sequential child paths or one
child path per Git worktree"*. This path operationalizes that seam and clears
what physically blocks it.

> **SUPERSEDED AT S04e (2026-08-14).** The parent/lane model above is the shape
> this path OPENED with, kept for the record. The owner rejected the single
> integrator — *"every workstation or dev should be able to merge into master"*
> — and the lane layer went with it: coding PATHS are now the unit of
> parallelism, one per worktree, each merging itself. Read
> [`paths.md`](./paths.md) for what actually runs; read the goal above only to
> understand why the path opened.

The concrete use case that opened it (owner, 2026-08-14): run CP-MVP-010's main
features, backlog fixes and fine-tuning, provider expansion, and settings-menu
polish AT THE SAME TIME. The overlap audit reduced those four streams to three
lanes — providers and settings share `ai-settings.ts`, `ipc-contract.ts` and
`AppMenu.tsx`, so they run as one.

## Not in this path

- **No constitutional ratification yet.** No ADR, no amendments to bedrock 22,
  24, 35 or `AGENTS.md` until the convention has survived one real pilot
  (S05). Bedrock 35 §Start as one file: *"Structure is added only when real
  multi-path work demonstrates the need."* The convention is nonetheless
  WRITTEN before anything runs — in the execution plane, per owner ruling 2.
- **No scheduler, service, daemon or database.** Markdown-and-Git convention
  plus the smallest possible runtime isolation.
- **No roadmap change.** CP-MVP-010 (M8 back half) remains the next roadmap
  path; it becomes the first delivery lane under this convention.

# Definition of done

*(restated at S04e, after the integrator was removed.)*

- Two Electron dev instances run simultaneously from different worktrees without
  sharing a profile or a port — unit-tested, and pinned live during the pilot.
- No single prose file is a guaranteed per-step conflict for every path.
- The convention exists as a file in `atomik-project/`, complete enough that a
  cold agent **in a different harness, on a different model** can open a path
  and merge it from that file plus `AGENTS.md` alone.
- Everything shared is generated or split one-file-per-entry, so no two paths
  write the same file.
- The mechanical rules run in CI, separately from the build gates, and every
  blocking rule passes the test recorded in `paths.md`.
- `D14` draws the whole workflow and is registered with a refresh trigger.
- Module notes, learning notes (first-use rule, 17), one journal file per step,
  and this ledger updated at every step.

# Documentation coverage

## Required

- `docs/bedrock/35_35-coding-path-execution-state.md` — the plane this path
  changes; its parent/child seam and its "start as one file" rule.
- `docs/bedrock/22_22-agent-handoff.md` — the protocol every lane still
  follows; step 9's same-work-unit rule is what makes the module note a
  conflict surface.
- `docs/bedrock/24_24-doc-templates.md` — path template + gate discipline
  (gates run BARE).
- `docs/bedrock/15_15-maintainability.md` — governs the module-note split.
- `docs/bedrock/17_17-self-evolving-docs.md` — same-work-unit doc rule, the
  first-use learning-note rule, and the split's referrer obligations.
- `docs/bedrock/12_12-electron-mvp.md` — main/preload/renderer split that the
  userData and dev-port change touches.
- `docs/diagrams/index.md` — diagram rules for D13.
- `atomik-project/brainstorm/2026-08-14-parallel-agent-execution.md` — the
  provisional proposal.
- `atomik-project/sessions/2026-08-14-cp-ops-001-opening-check.md` — the
  eleven rulings that amend it.

## Conditional

- `docs/bedrock/13_13-electron-security.md` — before adding any IPC channel or
  moving a trust boundary. Step zero adds none; the userData suffix is read
  from the environment in main and never crosses the bridge.
- `docs/bedrock/36_36-ui-design-system.md` — before touching renderer markup or
  styles. Step zero touches none.
- `docs/bedrock/18_18-roadmap.md` — only if a lane is ever proposed that
  changes milestone sequencing.

## Deliberately excluded

- `docs/bedrock/27_27-git-compatibility.md` — owner ruling 6. It is the
  PRODUCT's contract (a user's vault inside a Git repo), not this repository's
  branching workflow.
- `docs/bedrock/19/20/21` (DSL, relations, canvas futures) — no product
  surface changes here.
- `docs/bedrock/28`–`34` (truth, verification, retrieval, execution cost) —
  CP-MVP-010's territory, not this path's.

# Execution

- [x] S01 Lane runtime isolation — env-driven Electron userData directory and
      dev-server port, so two lanes can run the app at once. `electron-main/
      lane.ts` NEW (pure, env-injected); claimed at module scope in
      `index.ts` (setPath must precede ready); `electron.vite.config.ts` reads
      the port half. 6 unit tests. Deviation: the two-instance run is NOT yet
      pinned live — it lands with the S05 pilot, which is the first moment two
      lanes actually exist.
- [x] S02 Split `docs/modules/atomik-desktop.md` per area — six area notes
      (shell, vault, ai, editor, sources, graph) plus a root index holding the
      cross-cutting contracts. Mechanical line-range move, verified: 0 of 1644
      non-blank source lines lost. Live referrers (learning notes 01/02) point
      at the root and still resolve.
- [x] S03 The lane convention (`paths.md`) + `D13_concurrent_execution_lanes.svg`
      and its register row.
- [x] S04 `ACTIVE.md` parent + lanes view; register gains the restated
      invariant, `running lane`, the CP-OPS-001 and CP-MVP-011 rows, and the
      session pointer; brainstorm note promoted with its three artifacts and
      its stale "nothing accepted" outcome corrected. Register reconciliation
      done in the same pass (22 step 4): the M8 front-half row still read
      `active` after CP-MVP-009 closed.
- [x] S04b CI/CD-PROOF (owner directive 2026-08-14, "the most important thing
      is to rely on CI CD proof processes"): `tools/cairn-check.mjs` NEW —
      dependency-free, LLM-free protocol validator; six blocking rules, three
      advisory; 17 tests under Node's own runner (`node --test`), so the tool
      carries no dependency either. `.github/workflows/cairn.yml` NEW — the
      repository's FIRST CI, two separate jobs (gates: typecheck/tests/build
      bare; cairn: protocol). Root npm scripts so the local command is the CI
      command. Caught and fixed on its first run: 34 false "broken links" that
      were bedrock pages illustrating a vault inside code fences — a false
      blocking verdict costs more than a missed one.
- [x] S04c OWNER CHALLENGE ABSORBED (2026-08-14, "I still dont understand the
      single truth files, because for me if an agent is merging it can
      reconstruct those files on the go... I am a little bit dubious that we
      are over reacting"): FOUR real merges run instead of argued — journal
      appends CONFLICT visibly, adjacent table rows CONFLICT visibly, DISTANT
      table rows merge cleanly AND CORRECTLY, and only "parent closed by one
      lane while another adds itself" merges into a silent contradiction. The
      challenge was right; three of four claims did not reproduce. Consequences:
      `single-truth` downgraded blocking → ADVISORY with an honest reason
      (statements of record, a review concern, not merge mechanics); `journal`
      stays blocking for a DIFFERENT reason (a lane writing it records work as
      integrated before it is — a factual error); `tools/cairn-active.mjs` NEW
      derives the lane list in `ACTIVE.md` from the path files, so the one real
      failure mode is impossible rather than forbidden, with a `lanes-derived`
      blocking check on the trunk only. Shareable doc moved INTO the repo
      (`docs/cairn/index.html`) — it had been published from a scratch
      directory, contradicting Cairn's own first principle. 23 validator tests.
- [x] S04d JOURNAL RULE DROPPED + FULL-WORKFLOW FIGURE (owner, 2026-08-14:
      "confirm dropping journal to advisory, no lane age, work unit is ok...
      I need a good exhaustive workflow diagram, you can check that the whole
      protocol is ok while you reason on the diagram"). The journal rule failed
      its own test — the argument was circular and no untrue statement ever
      reaches the trunk — so `log.md` falls through to the statements-of-record
      advisory and BLOCKING drops 6 → 5, every survivor mechanical. Criterion
      recorded in `paths.md`: a rule may block when it is objectively checkable
      AND breaking it leaves something WRONG IN THE REPO, not merely
      unconventional. `D14_cairn_protocol_workflow.svg` NEW — the whole
      lifecycle as role swimlanes (owner · integrator · lane · CI), GENERATED
      by `tools/gen-d14-workflow.py`, which asserts its own geometry; the
      assertions caught two real placement bugs, the second only because the
      check measures a label's full text EXTENT rather than its anchor. Lane
      age declined by the owner; same-work-unit kept as-is. Drawing it WAS the
      audit: four missing guards recorded in `paths.md` §Holes, worst first —
      nothing marks a lane integrated (so the derived list can lie and
      `lanes-derived` cannot catch it), the gate leaves no artifact, the
      ceremony guard is unchecked, abandoned lanes have no terminal status.
- [x] S04e THE INTEGRATOR IS REMOVED (owner, 2026-08-14: *"for me it not possible
      to have only one integrator, every workstation or dev should be able to
      merge into master... maybe considering coding path to be parallel directly
      instead of parallel lane would be easier to manage"*). The lane layer is
      GONE: coding paths are the unit of parallelism, one per worktree, each
      merging ITSELF. Numbered = roadmap, labelled = everything else; branches
      are `path/<id>`; drafting and executing happen in the same session,
      because nobody drafts a path for someone else to pick up. This CLOSED two
      of the four holes the D14 audit had found — the path sets its own
      `status: done` in the very PR that lands it, and that PR with its CI run
      IS the gate artifact; both holes were created by the integrator. What
      replaced the integrator's real job (writing the shared files): ACTIVE.md
      is fully GENERATED, and the journal became ONE FILE PER ENTRY under
      `atomik-project/log/` with `log.md` FROZEN as the archive — no migration.
      Two new mechanisms per owner directive: the REBASE GATE is automated
      (blocking — a `path/*` branch must contain the trunk tip; it serializes
      the merge, never the work), and the COHERENCE AUDIT replaces the
      integrator's eye on architectural drift — `tools/cairn-audit.mjs`, where
      the AGENT produces the judgment and CI checks only that a filled record
      EXISTS, so a non-deterministic activity gets a deterministic gate and its
      verdict never blocks. New blocking rule: a path marked `done` must have a
      ceremony session note — scoped to the change that closes it, so paths
      that closed before the rule existed are left alone. Ceremonies stay FULL
      for every path (owner: *"better too much evaluation than not enough"*).
      D14 redrawn: three role columns, no integrator. 25 validator tests.
- [x] S04f THE DAY-TO-DAY GUIDE + the visual-documentation PRACTICE (owner,
      2026-08-15). Two corrections absorbed. (a) "visual docs meant creating
      diagram or else to document the IMPLEMENTATION — is that what you design
      in the doc?" — it was not: S04d had written the governance (register,
      refresh triggers, audit) and skipped the practice. Now named: four figures
      every project draws (module map · boundary map · flow of one operation ·
      lifecycle), chosen because they cover what prose is worst at — structure,
      order, boundaries — plus the rule that every module note carries a figure
      and every path introducing a mechanism ships a drawing of it in the same
      commit, with a test against decoration ("could a newcomer answer faster
      from the figure than from the text?"). (b) The layered reader was rebuilt
      on the owner's model: coloured inline highlight → coloured block of the
      same hue, every part expandable, and — the real change — SYNTHESIS
      layering rather than DETAIL layering, each level complete at its own grain
      so a reader may stop anywhere and be correct. Colour encodes WHO ACTS
      (human · agent · automated · artifact), not depth. `docs/cairn/workflow.html`
      is now a nine-stage daily guide, repo init → self-merge, each stage naming
      the actor, what it produces, and what breaks if skipped. Both figures held
      to S04d's own rule: geometry asserted, no overlaps, labels' full extents
      clear. Owner verdict: "the guide is good but the dynamic depth exploring
      needs a little work" — the interaction gaps are recorded as a BRAINSTORM
      (`../brainstorm/2026-08-15-layered-depth-reader.md`) with its three
      artifacts, since the reader is a candidate Atomik surface rather than a
      Cairn decision.
- [x] S05 PILOT — COMPLETE 2026-08-16, and in the vocabulary that
      survived S04e: two PATHS, not two lanes. Both halves of the opening are
      real: **CP-MVP-010** (retrieval over the graph, numbered) and
      **CP-PROVIDERS** (provider expansion + settings, labelled) each ran their
      opening check with the owner, pinned base `2370546`, and took their own
      worktree and branch (`path/cp-mvp-010`, `path/cp-providers`) on the same
      day. That is the first time the convention has actually carried two
      writers at once — the gap ADR-012 names as its own biggest unknown.
      CP-PROVIDERS completed the full closing sequence and landed at `99cac04`
      on 2026-08-16; CP-MVP-010 followed at `783c7c6` on 2026-08-17. Feedback,
      rich Markdown, AI capabilities, Open Dock and renderer repairs then
      repeated it. The merge half is no longer hypothetical.
- [x] S06 RATIFIED (owner, 2026-08-15: *"the pilot will serve to fine tune but
      we are not going back to single path so why not ammend now?"* — and the
      deferral did not survive the question). Bedrock 35 §Start as one file
      guards against adding SPECULATIVE structure; it says nothing about
      leaving a known-false constitution in place. Bedrock 22, 24 and 35
      described a model the project had decided against, which made them stale
      documents, not cautious ones — the same defect class as the register row
      that still read `active` after CP-MVP-009 closed. Amended: 35 §Session
      protocol + §Path register (paths are the unit of parallelism; views are
      derived), 22's protocol steps and §Around every path (ceremonies bracket
      a path, not a gap; the journal is written at merge; step 10 is the
      self-merge sequence) plus its agent-contract invariants, 24's path
      template (status `running`, `branch`, advisory `writes`). `ADR-012`
      records the decision WITH its evidence — the four merges, the retracted
      journal rule, the app that could not run twice — and its four known gaps,
      including that the model has never actually run two paths in parallel.
      `AGENTS.md`'s precedence note is dropped: bedrock no longer contradicts
      `paths.md`, and a future disagreement is now a defect to report rather
      than a rule to follow.
- [x] S07 PILOT FINDING 1 — the validator misread its own input (found by
      CP-MVP-010 S01, folded back here on the owner's ruling 2026-08-16;
      DONE 2026-08-16). `changedFiles` trimmed the whole `git status
      --porcelain` stdout before taking `line.slice(3)`, so the leading space
      of an unstaged first line (`" M path"`) disappeared and the path came
      back missing its first character — `tomik-project/coding-paths/…`. The
      damage was not cosmetic: that list feeds every rule, the BLOCKING ones
      included, and the mangled name also slipped past the
      `startsWith(PATH_DIR)` exemption that keeps a path file out of
      scope-drift. CI never saw it because CI passes `--base` against a clean
      tree, where there are no porcelain lines at all — a defect that only
      exists where the tool is actually used is the worst shape a gate can
      have. Fix: a pure exported `porcelainPaths(raw)` reading raw stdout
      (leading whitespace is DATA in porcelain, not padding), which also
      resolves rename lines to their new path, plus two tests in the
      validator's own suite (27 pass, was 25). The pilot's first real return:
      running the protocol on two live paths found a hole in the protocol's
      own instrument within a day.
      ADDENDUM, same day: the AREA_MAP gained the retrieval seat
      (`shared/retrieval-core`, `electron-main/retrieval`). CP-MVP-010 S02
      landed a file the map could only classify as `shell`, so the area-note
      advisory asked for the wrong module note — and an advisory that points
      at the wrong file teaches people to ignore advisories. A map that names
      areas must grow when an area appears; two cases pin it.
- [x] S08 PILOT FINDING 2 — register before branching. On 2026-08-20 the
      trunk's generated `ACTIVE.md` said "no path running" while
      four clean worktrees carried `status: running`. The generator only read
      path files in its checkout; those files had been created on sibling
      branches, so neither trunk nor siblings could see them. Repair the
      lifecycle: after opening acceptance, land a registration-only trunk
      commit containing the accepted path declaration and regenerated global
      view, then create the worktree from that commit. Add a blocking branch
      check for registration, with a finite grandfather list for CP-OPS-001,
      CP-MVP-011 and CP-MVP-012; update the protocol, ADR, diagrams, learning
      note and this ledger. Move CP-OPS itself off its bootstrap trunk exception
      into `path/cp-ops-001` before writing the repair.

# Current checkpoint

```text
original base: 70f7e27 — S01–S07 began as the one bootstrap exception on trunk
branch base : cc78d2f — CP-OPS moved into `path/cp-ops-001` before S08; the
              owner was actively merging other paths into the trunk, so the
              exception had outlived its reason
current step: S08 complete; CP-OPS is ready for its closing ceremony
evidence    : trunk `ACTIVE.md` passed Cairn while saying no path was running;
              four clean worktrees carried `status: running`. During the
              diagnosis CP-OPEN-DOCK and CP-RENDER-REPAIRS completed ceremony
              and self-merged, proving that merges work while discovery does not.
changed     : opening order now ceremony → registration-only trunk commit →
              branch/worktree; Cairn blocks an unregistered new path branch;
              running schema requires branch + base; CP-OPS-001 / MVP-011 /
              MVP-012 are the finite grandfather list. AGENTS, bedrock 22/24/35,
              ADR-012, paths.md, ACTIVE, the roadmap register, learning note 21
              and D08/D13/D14 all project the same rule.
views       : ACTIVE's marked block was regenerated. Its surrounding migration
              prose and coding-paths/index.md were deliberately updated: ACTIVE
              is the live authority; the register maps milestones and records
              integrated outcomes. diagrams/index.md changed because all three
              refresh triggers fired.
generator   : D14's generator was also hard-coded to the owner's main checkout,
              so running it from a worktree silently wrote the wrong tree. It
              now resolves its own repository. XML validation then found the
              existing unescaped `path/<id>` text; regenerated output is valid.
tests       : Cairn self-tests green (31 cases across 2 files); cairn-check OK
              with expected advisories only; SVG XML green and D14 geometry
              asserts 14 boxes / 2 labels; typecheck green; 78 test files /
              1101 pass / 1 skip; production build green. Gates ran bare.
next action : fetch/reconcile remote state, commit S08 explicitly, publish the
              safe completed trunk and this path branch. Before merge: owner
              closing ceremony, rebase on the then-current trunk, gates again,
              coherence audit, journal, status done, self-merge.
blockers    : none for S08. Merge correctly waits for CP-OPS closing ceremony.
```

This is CP-OPS's third observed prose-checkpoint drift. Cairn can prove that a
ledger changed, never that its sentences remain true. S08 fixes the mechanically
checkable portfolio input rather than pretending prose can be policed. Closing
this long-lived bootstrap path after S08 is the practical mitigation for its
own checkpoint exposure.

# Blockers

None for the completed S08 work unit. The path cannot merge before its closing
ceremony, by design.
