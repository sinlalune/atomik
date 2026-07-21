---
type: Atomik Coding Path Register
title: Coding path register — vision to execution mapping
timestamp: 2026-07-05T00:00:00Z
---

# Coding path register

The bedrock carries the whole vision; the roadmap (18) sequences it; a coding path executes one bounded slice. This register keeps the mapping complete: every roadmap milestone is accounted for below — active, reserved, or not yet opened. No milestone is silently unassigned. This is the portfolio-level form of the no-hidden-areas rule in 35.

## Opening rule

Paths are opened just-in-time, when their milestone becomes next:

- the TWO ceremonies gate every gap (22 §Between paths, owner directives 2026-07-21): a CLOSING ceremony at path close (metadata recall + backlog management + prompted exchange) and an OPENING check at activation (feature-by-feature prompted confirmation inside the new path, deltas amending it before the base commit pins); activating a path with no recorded ceremonies is invalid
- seed from the milestone section of 18 and the coding path template in 24
- pass the coverage audit: every bedrock page accounted for at least once
- one active parent path at a time; `ACTIVE.md` points to it
- never widen a closing path to absorb the next milestone — open a new one (thinness rule)

Late paths are better paths: they inherit module notes, friction records from the daily-use gate, and the architecture as actually built — none of which exist yet.

## Register

| milestone | scope | path | status |
|---|---|---|---|
| M0–M2 | shell · vault · AI patch loop | CP-MVP-001 | done (2026-07-06) |
| M3 | capture sources + local speech baseline | CP-MVP-002 | done (2026-07-07) |
| M3 (completion) | local speech runtime — 34 evaluation + seating | CP-MVP-004 | done (2026-07-08) |
| M3 (seats) | CUDA tiers + OCR seat + opt-in cloud rung | CP-MVP-005 | done (2026-07-08) |
| M4 | PDF source + strong anchors | CP-MVP-003 | done (2026-07-13) |
| M5 | web source tab + explicit imports | CP-MVP-006 | done (2026-07-16) |
| M1 (friction pass) | tree file management — create/rename/move/delete + DnD | CP-MVP-007 | done (2026-07-21) |
| M2 (completion) | real generation (Mistral Small) + AI interaction pass | [CP-MVP-008](./CP-MVP-008.md) | proposed 2026-07-20 (draft; awaits owner acceptance + CP-MVP-007 close + the [2026-07-21 vision-alignment review](../sessions/2026-07-21-vision-alignment-before-cp-mvp-008.md)) |
| M6 | minimal Truth Lens + challenge/repair | — | not opened |
| M7 | live verification provider | — | not opened |
| M8 | hybrid retrieval + agent context basics | — | not opened |
| M9 | measured local assistance + autocomplete | — | not opened |
| M10 | public knowledge + dictionary MVP | — | not opened |
| M11 | truth maintenance + cost dashboard | — | not opened |
| M12 | Atomik DSL | — | not opened |
| M13 | canvas | — | not opened |

Reserved follow-up (not a row yet, 33/34 discipline): a LOCAL llama.cpp generation seat opens as its own evaluated tier after CP-MVP-008's cloud engine lands — capability-gated like speech was, dated evidence in 34, never a release-wide promise. Decision trail: [../sessions/2026-07-20-generation-swap-decisions.md](../sessions/2026-07-20-generation-swap-decisions.md).

Leading candidate for the post-008 path (owner vision at the 2026-07-21 closing ceremony, to CONFIRM at 008's closing ceremony): **Wikidata-backed generation grounding** — an M8 retrieval slice (lexical-first, 33's ladder) + an M10 Wikidata slice serving as LOCAL RAG for generation ("strengthen the generation through local rag architecture"); Truth Lens (M6) then runs over grounded output; M7's slot is decided at the M6 close. Pulled from deferred into the near-term backlog: Git status/diff view (M8 optional item).

Reserved follow-up (owner decision 2026-07-21, "after the next coding path"): the PACKAGED NATIVE WINDOWS BUILD opens after CP-MVP-008 — one bounded unit (electron-builder config, Windows target, launch path) that closes the three named WSLg gaps at once: real 240 Hz presentation (S07j attribution), DWM rounded corners + shadow (S07q), and hardware-composited glass depth (36 §glass budget). Until then the dev app under WSLg is the daily driver and those three limits are known, recorded, and not app defects.
