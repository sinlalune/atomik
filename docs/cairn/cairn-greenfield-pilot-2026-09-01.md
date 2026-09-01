---
type: Cairn Measurement
title: Greenfield pilot — one repository, one whole lifecycle, 2026-09-01
description: The first run of a repository created by cairn-init through registration, one work unit, candidate, audit, acceptance, closure, integration and cleanup — and the nineteen defects the first run found before the second run reached done.
tags: [cairn, pilot, greenfield, measurement, cairn-init, closure]
timestamp: 2026-09-01T00:00:00Z
---

# Greenfield pilot — one repository, one whole lifecycle

The forward plan for CP-OPS-002 named S09 as *"initialize one real ex-nihilo
repository from the kit — the research-paper workspace the brief names — and
fix what the pilot finds before merging."* The extraction brief said the
protocol would be used *"with shared project, including research paper
prototyping."* This is that pilot: a research-paper workspace, created by
`cairn-init`, driven by one participant through every state a path can reach,
reading only the pages the kit installs.

It was run twice. **Run 1** stopped at closure: an honest closing record could
not pass the gate. **Run 2**, on the repaired kit, reached `done` with every
gate green and the secondary worktree removed. Everything between the two runs
is listed below.

## Method

- **Kit.** `npm run cairn-init -- --target <dir> --trunk main --remote origin
  --namespace cairn --profile local --project-root project --docs-root docs
  --source paper`, from this repository at the commit each run names.
- **Remote.** A bare repository beside the workspace, added as `origin`. Every
  push, fetch, upstream check and `merge-base` in the protocol ran against it.
  It is a real remote; it is not a hosted one, and no CI job ran.
- **Reading.** The installed `AGENTS.md`, then the four pages it names, then the
  installed reference pages a participant needs at each state: the path
  template, the human-records schemas, the handoff-brief contract, and the
  operations sequences. Nothing was read from this repository that the kit did
  not install.
- **Work.** One path, `CP-PAPER-001`, on the default `lightweight` route: three
  section files under `paper/`, a word-count check on `npm test`, and the
  module note for the area. One implementation unit, then closure.
- **Verdicts.** Every gate ran bare and its exit code was the verdict. A red gate
  was recorded as a finding and then either repaired in this repository or
  worked around by hand with the workaround recorded.
- **Participant.** One, `cp-ops-002-writer`, holding every role. The
  `role-collapse` advisory that this produces at closure was expected and is
  part of the measurement.

## Run 1 — where it stopped

Repository: `~/projects/cairn-pilot-paper` with `~/projects/cairn-pilot-paper.git`
and the worktree `~/projects/cairn-pilot-paper-cp-paper-001`, retained as
evidence. Installed from `4ffdf47` (S08w).

| State | Gate | What happened |
| :-- | :-- | :-- |
| Fresh install, trunk | OK, 0 advisories | The kit installs 119 files and its first gate is green. |
| Registration, untracked | **OK** | The path record, born in a new folder, was invisible to the gate: `git status --porcelain` lists a new directory as one entry. With the opening record deleted the gate still read OK. |
| Registration, staged | FAIL `links` | The path template's step index links a step file that does not exist yet. |
| Registration, staged, link removed | OK | Committed; parent equals `base_commit`; pushed. |
| Path branch, fresh | OK, with `fatal:` on stderr | The registration probe asked Git for the flat record address first and let the error through. |
| S01 unit | OK | The brief was left unrefreshed by mistake and nothing said so. `npm test` correctly failed a thirty-word title page. |
| Candidate, audit | OK; audit `present and filled` | The scaffold's `base` is the registration base, while the closing schema's `base` is the trunk tip; the reference showed one value in both. The scaffold's own text says *"every bedrock page"*. |
| Closure, honest record, before commit | **FAIL ×5** | `derived-view` (view stale), `acceptance` (empty disposition list read as missing; zero commits after the candidate), `closure-surface` (`writes:` widened during S01 read as a closure change, because the comparison was against the trunk's copy), `advisory-disposition` (`scope-drift` on the audit and closing record themselves, which cannot have fired at the candidate). |

Regenerating the view would have been *"implementation after acceptance"*: the
closure file set admitted `ACTIVE.md` only at `done`. There was no honest edit
that reached `ready`. Run 1 stopped here.

## Findings

Nineteen, numbered in the order they surfaced. *Fixed* means repaired in this
repository at S09a with a test where one was reachable; *stated* means the
documentation now says what is true; *deferred* means recorded and not acted on.

| # | Finding | Where | Disposition |
| --: | :-- | :-- | :-- |
| 1 | The lightweight-route concept says opening acceptance lives in the path record; the checker reads it only from `project/sessions/`. | concept, spec, human-records | stated — the three lightweight reliefs are unimplemented, on every route; matrix row updated |
| 2 | The scope-digest command in the operations page (`sed … \| sha256sum`) does not compute what the checker computes: it includes the next heading, skips normalisation, omits the algorithm prefix. A closure following it is blocked as *"the definition of done moved"*. | operations, human-records | fixed — `cairn-check --scope-digest <file>#<anchor>`; both pages point to it |
| 3 | The path template's step index links `./steps/S02.md` for a step not yet written; `links` blocks the registration commit. | path-template | fixed — the in-progress step is unlinked until its file exists |
| 4 | **An untracked folder is invisible to the working-tree gate.** `git status --porcelain` lists a new directory as one entry, so a born-sliced record — the shape the protocol prescribes — escapes every rule keyed on the changed set at registration. Measured: opening acceptance removed, gate OK; same tree staged, gate FAIL. | checker, three call sites | fixed — `--untracked-files=all`; adversarial fixture |
| 5 | `fatal: path … CP-PAPER-001.md does not exist` printed above an OK verdict: the registration probe tries the flat address first with stderr inherited. | checker | fixed — stderr piped |
| 6 | The brief contract has no answer for the first unit: `checkpoint` must name the last retained checkpoint, and before unit 1 there is none. | handoff-brief | stated — the registration commit with `checkpoint_unit: 0` |
| 7 | A unit landed with the brief unrefreshed and no rule noticed. The protocol requires the refresh in every unit; nothing predicates it. | checker | **deferred** — a candidate advisory (`brief-stale`: path record moved, brief did not) needs its fixture first |
| 8 | The audit's `base` is the registration `base_commit` (the tool writes and verifies it); the closing record's `base` is the trunk tip `T` (the drift predicate diffs from it). The reference showed the same value in both fields. | human-records, cairn-audit | stated — a section explains which record names which base |
| 9 | Host vocabulary inside shipped tools: *"every bedrock page and ADR"* in the audit scaffold; *"bedrock 22 step 9"* in a checker message. | cairn-audit, cairn-check | fixed |
| 10 | The disposition rule's premise *A ⊂ C* is false for advisories the closure itself raises: `role-collapse` needs the closing record to exist; `scope-drift` fired on the audit and closing record, which every closure adds. An honest attestation of C's advisories was rejected. | checker | fixed — lifecycle records excluded from drift; closure-raised advisories excluded from the subset check, still reported |
| 11 | **`ready` was unreachable.** `derived-view` demands the regenerated view, and the closure file set admitted `ACTIVE.md` only at `done`; the operations page never said to regenerate it. | checker, operations, path-template | fixed — the generated view is admitted at closure; both pages regenerate it |
| 12 | `advisory_disposition: []` — the honest list for a candidate with no advisories — was read as *"required"*, because `String([])` is empty. | checker | fixed |
| 13 | **`closure-surface` compared the closure against the trunk's copy of the record**, so every field that legitimately moved while the path ran — a widened `writes:` — was a closure change. This repository's own closure would have hit it. | checker | fixed — compared against the record at the accepted candidate; fixture |
| 14 | A born-sliced record's folder `log.md` was outside the closure file set, so the OKF append at closure was *"implementation after acceptance"*. | checker | fixed |
| 15 | The pre-commit gate at the closure commit saw zero commits after the candidate and an empty file list: it blocked on the count while judging nothing. | checker | fixed — an uncommitted closure counts as the pending commit and its files are judged; fixture |
| 16 | `cairn-init` names an area note in the configuration it does not create, so `area-note` cannot fire until the adopter writes it, while `same-work-unit` demands a module note on the first source change. | cairn-init | **deferred** — the first path writes the note; the initializer could say so |
| 17 | After committing the closure and before pushing it — the documented order — `remote-checkpoint` fires about the closure commit itself, and the disposition rule turned it into a block. | checker | fixed — treated as closure-raised; fixture asserts the unpushed closure is green and still reported |
| 18 | The matrix and the rule catalogue said closure may move `current_step`; the code, deliberately and with its reason, allows only `status` and `subject_commit` at `ready`. | spec matrix, cairn-rules | fixed — the prose now matches the code |
| 19 | `single-truth` advised *"regenerate rather than edit"* over a view that had just been regenerated, at the one moment the protocol requires regenerating it. | checker | fixed — a generated view equal to its generator's output is not an edit; `derived-view` still blocks the hand-edited case |

Ten of the nineteen are checker predicates. Every one of the ten is the same
shape this path has been finding since its audit: a predicate reading a proxy —
the trunk's copy for the candidate's, a directory entry for its files, a string
for a list, one commit's advisories for another's.

## Run 2 — the repaired kit

Repository: `~/projects/cairn-paper` with `~/projects/cairn-paper.git`. Installed
from this repository's working tree as it stood before the S09a commit — HEAD
`4ffdf47` plus the repairs that commit lands, which is why the lock file names
`4ffdf47` as its source. Scripted end to end so it can be replayed; the script
is the pilot's procedure, not a fixture.

| State | Commit | Gate |
| :-- | :-- | :-- |
| Install | `554833c` | OK, 0 advisories |
| Registration | `687a94c` | OK; parent equals `base_commit` |
| S01 unit | `c334a51` = candidate `C` | OK; `npm test` three sections, all over forty words |
| Closure, before commit | working tree | OK, 1 advisory (`role-collapse`) |
| Closure, after commit, before push | `2a53f5e` = `A` | OK, 2 advisories (`role-collapse`, `remote-checkpoint` about `A`) |
| Acceptance drift | — | trunk unchanged since `T` |
| Integration | `b342104` on `main`, verified on `origin/main` | OK; `C` an ancestor; exactly two commits after `C`; journal entry present |
| Cleanup | — | worktree status empty, removed without force, directory gone |

Zero red gates. Every record was written by hand from the installed pages, with
one tool call the pages now name for the digest.

## What it cost

Counted from run 2, for one path delivering three section files and one script:

| Phase | Product files | Protocol files written or edited |
| :-- | --: | --: |
| Registration | 0 | 7 (five record files, opening acceptance, brief) + the regenerated view |
| S01 | 5 | 8 (module note and index, step record, record index and log, steps index and log, brief) |
| Closure | 0 | 6 (audit, closing acceptance, record index and log, brief, view) |
| Integration | 0 | 3 (record, view, journal entry) |
| **Total** | **5** | **24** |

The route was `lightweight`. It cost exactly what `full` costs, because the
reliefs the specification grants it are not implemented (finding 1). That is
the number a general-release claim has to answer for.

## What this pilot does not show

- **One participant, who wrote the protocol.** A cold reader's time to first
  correct action is the cold-resume pilot's question, not this one's; this
  measures whether the lifecycle can be completed at all from the installed
  pages, and the first run's answer was no.
- **A bare local remote and the `local` profile.** No CI job ran, so the
  installed workflow file was not exercised; invocation parity is asserted by
  the fixture suite, not by this run.
- **The trunk never moved.** Acceptance drift, a merge with conflicts, and the
  integration diff on a trunk that advanced past `T` were not exercised.
- **Every role collapsed.** `role-collapse` fired and was left visible, as the
  rule intends; nothing here says anything about a repository with a reviewer.
- **Two findings remain open** (7 and 16) and are listed rather than implied
  away.

## Where the evidence is

Run 1's repository is retained, blocked at closure, at
`~/projects/cairn-pilot-paper`. Run 2's repository reached `done` at
`~/projects/cairn-paper`; its journal entry is
`project/log/2026-09-01-cp-paper-001.md`. The repairs, fixtures and page
corrections are the S09a work unit of
[CP-OPS-002](../../atomik-project/coding-paths/CP-OPS-002/steps/S09a.md).
