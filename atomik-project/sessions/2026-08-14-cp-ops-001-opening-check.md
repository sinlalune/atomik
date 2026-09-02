---
type: Atomik Session Record
title: CP-OPS-001 opening check — concurrent execution lanes; eleven owner rulings, step zero authorized
timestamp: 2026-08-14T00:00:00Z
path: CP-OPS-001
branch: path/cp-ops-001
ceremony: opening
---

# CP-OPS-001 opening check (2026-08-14)

Run per `docs/bedrock/22_22-agent-handoff.md` §Between paths. The gap's
CLOSING ceremony is already recorded (`2026-08-13-cp-mvp-009-closing-ceremony.md`,
which chose the M8 back half as the next roadmap path). This note is the
OPENING check for a PROCESS path opened INSIDE that gap, before CP-MVP-010
drafts: the owner asked to run several agents concurrently, and the machinery
for that has to exist before the roadmap path activates, not be retrofitted
into a running path.

Input: `../brainstorm/2026-08-14-parallel-agent-execution.md` (provisional).
The check took the form the owner's focus workflow requires — themed sections,
each with its own `- [ ]` checklist — across three exchanges. Answers verbatim.

## The owner's use case (verbatim)

> "I just finished CP-MVP-09 and about to go for CP-MVP-10 so I can give you
> real usecase of what I want to be able to do, I want to be able to do at the
> same time the CP-MVP-10 main features, do some backlog fixes/fine tune, add
> model providers, fine tune the settings menu, etc.. is that the right moment
> to try the multi agent execution, and does that fit what we designed ?"

Four streams named. The overlap audit against real files found only THREE
independent lanes: adding model providers and fine-tuning the settings menu
share `electron-main/ai-settings.ts` (77 lines), `shared/ipc-contract.ts` and
`renderer/src/AppMenu.tsx` — the same panel. Ruling below merges them.

## Rulings (owner, verbatim)

1. **The parent/child split** → **"i agree the split"** — one active
   INTEGRATION parent, N accepted lanes beneath it, one integration gate.
   Operationalizes the possibility already in bedrock 35 §Session protocol
   ("a parent path containing sequential child paths or one child path per Git
   worktree"); no invented architecture.
2. **Ratification order** → owner challenged the agent's pilot-first
   recommendation: *"I don't understand, if we decide of a clean workflow
   together why do you want me to fail on a old audited workflow ?"* Clarified
   and settled: the workflow is decided AND WRITTEN NOW; the pilot runs under
   the new rules from its first minute; only the CONSTITUTIONAL ratification
   (an ADR plus amendments to bedrock 22/24/35 and `AGENTS.md`) waits for one
   real pilot. The convention lives in a real file in the execution plane
   (`atomik-project/`), never in a conversation — nothing runs unwritten.
3. **The module note** → **"I would say per area for scaling but I trust you"**
   — `docs/modules/atomik-desktop.md` (1689 lines, the only module note) splits
   per area. Promoted into step zero rather than being the first pilot lane,
   because all three lanes append to it from their first step.
4. **Declared write surfaces** → **"no lock"** — the `writes:` declaration is
   advisory: an overlap SIGNAL when a lane opens and a diff-versus-declaration
   CHECK at the gate, never an exclusive lock. Evidence that decided it: S07b's
   report was "pills show file names" and the fix was `firstHeadingOf` at the
   root, rewriting the strip, the relation sentences and the wikilink
   candidates in one edit. A root cause is discovered, not declared.
5. **Ceremonies** → **"parent only"**, then **"aprove ceremony"** on the
   carve-out: ceremonies stay at the parent; a lane opens on a one-line owner
   acceptance, and for a feedback lane the bug report IS the acceptance. CARVE-OUT:
   a lane opening NEW ARCHITECTURE gets its own opening check (the provider lane
   does — routing policy, receipts, license gating).
6. **Bedrock 27** → **"I confirm"** its removal from the promotion list. 27 is
   the PRODUCT's Git-compatibility contract (a user's vault inside a Git repo),
   not the development repository's branching workflow. Homes are 35 and 22.
7. **Worktrees** → **"ok"** — not mandatory in doctrine, but for THIS
   configuration effectively required: the owner dogfoods `master` in the main
   working tree, so no code lane may occupy it.
8. **Feedback priority (brainstorm Q2)** → **"OK"** — reproduced owner feedback
   integrates as soon as its gates are green; roadmap lanes rebase onto it.
   This ratifies what the repo already did: S06b, S07b and S07c all preceded S08.
9. **The root log (brainstorm Q7)** → **"ok"** — `atomik-project/log.md` records
   INTEGRATED work only; pre-integration progress lives in the lane's own ledger.
   This preserves what the log already is (commit-scale integrated narrative)
   and removes the repository's worst append-at-the-end conflict magnet.
10. **Providers + settings** → **"ok"** — run as ONE lane, not two. A new
    provider changes what the settings panel must show; splitting them would
    make one lane wait on the other's field additions.
11. **Scope taxonomy** → **"choose b"** — the brainstorm's delivery/feedback/
    investigation taxonomy assumed every lane is a slice of the parent
    MILESTONE. Provider expansion is not (its input, `docs/research/openrouter-
    vs-direct-providers.md`, is registered for "any future cloud-generation/
    provider-expansion path"). Option (b): provider work gets its OWN path
    number, and the invariant is restated as **exactly one active INTEGRATION
    parent**; other accepted paths may run as lanes beneath it. The register
    gains a `running lane` status so the milestone mapping stays honest.

## Staging (approved: "approve stagging", "go for step zero")

```text
STEP ZERO   main tree, serial, before any lane
            lane runtime isolation (userData dir + dev port)
            module note split per area
            the lane convention written into atomik-project/
            ACTIVE.md children view + register running-lane status

THEN        two lanes only
            Lane A  CP-MVP-010 — M8 retrieval          worktree, delivery
            Lane B  backlog fixes / fine-tune          worktree, feedback

AFTER       the first integration passes the gate
            Lane C  CP-MVP-011 — providers + settings  worktree, own opening check
```

Lane C waits because the integrator is the one untested component of the
design: prove the gate at two lanes before asking it to hold three.

## Blockers found by the audit, folded into step zero

- **The app cannot currently run twice.** No `app.setPath('userData', …)`
  anywhere in `electron-main/`, and no port configuration in
  `electron.vite.config.ts`. Two dev instances would share one Electron
  user-data directory keyed on `atomik-desktop` — shared AI settings
  (including provider keys), window state and recent vaults, with two
  processes writing them. This is the brainstorm's question 9, and it is a
  blocker, not a footnote: both the retrieval lane and the provider lane need
  the app running to bench.
- **Hot files that will conflict**: `electron-main/index.ts` (1917 lines) and
  `shared/ipc-contract.ts` (866) — every lane adding an IPC channel touches
  both. Honest read: frequent conflicts, MECHANICAL resolution (two lanes
  appending distinct channels). The module note conflicts as often and resolves
  tediously, which is why the split leads.

## Also requested

> "can you also create a workflow diagram in the documentation for the
> projected structure of it ?"

Recorded as a step-zero deliverable: `docs/diagrams/D13_concurrent_execution_lanes.svg`
plus its register row, under the diagram rules (derived view, self-contained
SVG, refresh trigger).

## State

Gap ceremonies: closing recorded 2026-08-13; this note is the opening check for
CP-OPS-001. Activation authorized by "go for step zero". CP-MVP-010 remains
undrafted and unactivated — it becomes the first delivery lane under the
convention this path lands.
