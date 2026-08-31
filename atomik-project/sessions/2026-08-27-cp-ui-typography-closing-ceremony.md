---
type: Atomik Session Record
title: CP-UI-TYPOGRAPHY closing ceremony — one bundled face, defined once
timestamp: 2026-08-27T00:00:00Z
tags: [closing-ceremony, ui, typography, design-system, portability]
path: CP-UI-TYPOGRAPHY
branch: path/cp-ui-typography
ceremony: closing
---

# CP-UI-TYPOGRAPHY closing ceremony

Run with the owner on 2026-08-27. The path opened from one sentence about the
Cairn reader —

> "i LOVE this font can we use the same in atomik ?"

— and closes three work units later having answered a different question than
the one asked, because the first answer was wrong in a way the owner caught.

## The exact candidate

```text
candidate     a380f2ad1d03f3f5c3fe6629875f8dc55c704018
base          df875e68c383f6e82b833b755e8925f2fb4651ed
branch        path/cp-ui-typography
retention     refs/cairn/checkpoints/cp-ui-typography/01..03
route         full — escalated at S03; the ledger declares three work units
contains      origin/master (39127e7)
```

## What was accepted

**One proportional face, bundled with the app, defined once.**

`--note-text-font` sits in the `--note-*` block beside `--note-code-font`, and
four rules consume it: `:root`, `.editor-host.live .cm-scroller`,
`.editor-host .lp-rich-limit`, `.cm-inline-ai-rendered`. Each needs an explicit
declaration; each previously wrote the same stack out in full.

Inter v4.1 ships in `apps/desktop/renderer/src/fonts/` under the SIL OFL — roman
and italic, weight axis 100–900, `font-display: block`, both emitted into
`out/renderer/assets/` by the bundler.

## The correction this path exists to record

S01 changed the stack to lead with `'Segoe UI Variable Text'`. The owner's
objection ended it:

> "we are building electron for the OS universality capability and you
> implemented an os specific feature/design ?"

There are two coherent strategies and S01 was neither. **Native per OS** — what
the app already did — is universal by adaptation. **One bundled face** is
universal by control. S01 was the first with a Windows-only name wedged in
front: better on one platform, unchanged elsewhere, in an application chosen
specifically for not being platform-specific.

The diagnostic was available from the first hour and was repeatedly filed as a
footnote: **the change was invisible in `npm run dev`.** Every proportional stack
resolved to DejaVu Sans under WSLg. A design decision the developer cannot
observe on the machine making it cannot be reviewed there — and this one passed a
PR review, a ceremony draft and four green gate runs on that basis.

Two smaller errors preceded it, both in the opening check, both mine:

1. **"the only `font-family` declaration" was false** — one of four, taken from a
   `grep … | head -40` and written down as measurement. The failure bedrock 24
   §Gates names by name.
2. **"five rendering properties produce the look" was false** — the owner chose
   scope on that claim. Four are byte-identical in rendered pixels; the fifth,
   `letter-spacing`, does the one thing the same note promised would not happen.

Three claims stated as measured, two of them wrong, one of them load-bearing for
an owner decision. That is the finding worth carrying out of this path.

## What survived challenge

- **`:root` alone** — leaves the live editor on the old face, breaking the
  invariant `.cm-content` states: *read <-> live never shifts the text*.
- **`font-family: inherit`** — correct at `.cm-scroller`, wrong at
  `.cm-inline-ai-rendered`, whose parent IS the monospace scroller. Bug S05f.
- **A new chrome token** — would extend the vocabulary bedrock 36 enumerates,
  making this an architecture change. The `--note-*` family is delegated there.
- **Mapping `/mnt/c/Windows/Fonts` into WSL fontconfig** — patches the developer's
  machine to resemble one target OS instead of fixing the design.
- **Bundling the roman only** — Inter's variable roman carries no italics;
  markdown `em` would be synthesised oblique, which is S05f again.
- **The four rendering properties, and `letter-spacing`** — dead CSS, and the one
  measured metric change (555.063 → 552.141 px over 65 characters).

## Verification at this head

```text
npm run cairn-check    OK — 1 advisory (coherence audit, run after this note)
npm test               1109 passed | 1 skipped, 79 files
npm run typecheck      pass
npm run build          pass — both woff2 emitted to out/renderer/assets/
```

Face resolution was read with CDP `CSS.getPlatformFontsForNode`, which reports
`Inter Variable`, flagged custom, for normal, bold and italic. `fc-match` cannot
see a font the app loads itself and would still say DejaVu; the module note says
so, because that is the trap the next person will hit.

`note-typography.test.ts` carries eight assertions. The load-bearing ones: no
rule writes a proportional stack inline (a fifth copy fails), no OS-specific
family name appears at all, and both font files begin with the `wOF2` magic so a
placeholder or an LFS pointer cannot pass.

## Known limits, stated rather than buried

- **~740 KB of font in the bundle**, and an OFL attribution obligation carried by
  `fonts/LICENSE-Inter.txt`.
- **Inter is not the face in the screenshot that started this.** That was Segoe UI
  Variable, which is Microsoft's and not redistributable. Inter was chosen on the
  universality argument, not because it matches.
- **The monospace literals are untouched.** `--note-code-font` single-sources the
  note-code face; other monospace declarations still restate their stack. Same
  class of duplication, out of scope, not claimed as fixed.
- **`writes:` widened twice mid-path** — `docs/modules/atomik-desktop-shell.md`
  after the `area-note` advisory, and `renderer/src/fonts/**` at S02. Both
  recorded in the ledger per the drift rule.
- **No visual regression pass was run over the app itself.** The face changes on
  every proportional surface; the tests prove one definition and four consumers,
  not that any particular screen still looks right.

## Roadmap

Nothing follows. Still open and each its own judgement: note heading tracking,
the `--fs-*` chrome scale, and the remaining monospace duplication.

CP-OPS-002 rebases onto this merge at its next step boundary. Its S08 renames
`atomik-project/` to `project/`, which moves this path's record and brief;
closing first keeps that a rename of history rather than a collision.

## Acceptance

Owner accepted the candidate above for integration.
