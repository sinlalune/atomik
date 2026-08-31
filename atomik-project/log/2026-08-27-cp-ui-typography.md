---
type: Atomik Journal Entry
title: CP-UI-TYPOGRAPHY — the app ships its own typeface, and four gates learned something
timestamp: 2026-08-27T00:00:00Z
atomik:
  path: CP-UI-TYPOGRAPHY
  step: S04
---

# CP-UI-TYPOGRAPHY — the app ships its own typeface

Opened from one sentence of owner feedback about the Cairn reader: *"i LOVE this
font can we use the same in atomik?"* Closed five work units later having
answered a different question, because the first answer was wrong.

## What changed

The proportional font stack was written out **four times** in
`apps/desktop/renderer/src/styles.css` — at `:root`, at the live editor's
scroller, at a live-preview notice, and at the inline AI widget. It is now one
token, `--note-text-font`, with four consumers.

Inter v4.1 ships in `apps/desktop/renderer/src/fonts/` under the SIL OFL: the
variable roman **and** the variable italic, weight axis 100–900,
`font-display: block`. The app no longer asks the operating system for a face.

## Why the app ships a font rather than asking the OS for one

This is the decision worth recording, and it reversed the path's own first
answer.

The original stack — `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`
— is a coherent strategy: **let every platform supply its own UI font.**
Universal by adaptation. Bundling is the other coherent strategy: **one face
everywhere.** Universal by control.

The path's first attempt was neither. It led the stack with
`'Segoe UI Variable Text'`, a Windows-only family name, which made the app look
better on one platform and identical on the rest — an OS-specific decision
inside an application chosen for not being OS-specific. The owner ended it:

> "we are building electron for the OS universality capability and you
> implemented an os specific feature/design?"

The diagnostic had been visible from the first hour and was repeatedly treated
as a footnote: **the change could not be seen in `npm run dev`.** Under WSLg
every proportional stack resolves to DejaVu Sans, so the developer's own machine
rendered nothing new. A design change the person making it cannot observe is not
reviewable by them, and this one passed a PR review, a draft closing ceremony and
four green gate runs on exactly that basis.

## Cost

Roughly 740 KB of font in the renderer bundle, and an OFL attribution obligation
carried by `fonts/LICENSE-Inter.txt`. Two files rather than one, because Inter's
variable roman contains no italics and synthetic oblique on markdown `em` is the
defect class S05f already recorded.

Inter is **not** the face from the screenshot that started this. That was Segoe
UI Variable, which is Microsoft's and cannot be redistributed. Inter was chosen
on the universality argument, not because it matches.

## Deviations, and what they taught

Five work units for six lines of CSS. Four of the five were corrections, and each
one exposed something in the protocol rather than in the code.

- **S01 shipped on a truncated measurement.** The opening check stated that
  `:root` held the only `font-family` declaration in the file. It held one of
  four. The claim came from `grep … | head -40` — the failure bedrock 24 §Gates
  names explicitly — and it was written into a record as fact.
- **S01 also claimed five rendering properties "produce the look", and the owner
  chose the scope on that claim.** Four are byte-identical in rendered pixels;
  the fifth, `letter-spacing`, changes advance width by ~0.5% and re-wraps notes,
  which the same record promised would not happen.
- **S03 escalated `route: lightweight` to `full`.** The path had run three units;
  nothing enforced the escalation, because the trunk's checker has no route
  concept. Declaring it anyway is the point — self-declared smallness is the
  bypass the rule exists to close.
- **S04 repaired a gate that disagreed with itself.** CI blocked the merge on a
  stale `ACTIVE.md` while the local run reported OK. Both were correct: the
  derived-view check is skipped when the branch matches `path/*`, and CI checks
  out a detached merge ref whose branch is `HEAD`. `AGENTS.md` promises the local
  and CI commands are the same; here they were not.

The last one generalises, and is the finding this path hands to CP-OPS-002:
`isPathBranch(branch)` was a **proxy** standing in for the real question, *does
this checkout own the derived view*. Under self-merge a path is the last writer
of its own `status`, so at closure it becomes precisely the writer the exemption
assumed could not exist. The same shape — a rule asking about a convenient
stand-in rather than the fact it cares about — produced the defects repaired in
CP-OPS-002 S07k and S07m, and still stands on the trunk in `hasCeremony`, where
any session note naming a path satisfies the closing gate, including the note
written when the path opened.

Recorded for S08: **the failures are all in one direction.** Every one is a rule
passing when it should fail. None is a rule failing when it should pass.

## Verification at the merge candidate

`npm run cairn-check` OK; `npm test` 1109 passing across 79 files; `typecheck`
and `build` green, with both `woff2` files emitted to `out/renderer/assets/`.
Face resolution confirmed with CDP `CSS.getPlatformFontsForNode` — `Inter
Variable`, flagged custom, for normal, bold and italic. `fc-match` cannot see a
font the app loads itself and still reports DejaVu; the shell module note says so.

Coherence audit: *drift noted, proceeding*. The noted drift is a missing ADR for
"the application ships its own typeface", recorded with its trigger rather than
deferred silently — if a second surface ever asks the OS for a face, that is when
it needs one.
