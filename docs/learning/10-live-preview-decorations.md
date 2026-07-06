---
type: Atomik Learning Note
title: 'Learning: live preview — decorating the raw buffer'
description: How the seamless editing mode styles Markdown in place with CodeMirror decorations while the file bytes stay untouched (MVP-001 owner feedback batch).
tags: [learning, codemirror, decorations, syntax-tree, live-preview]
timestamp: 2026-07-06T00:00:00Z
---

# Learning: live preview — decorating the raw buffer

**Who this is for.** You used note 05 to own the editor. This note adds the
layer that makes it *seamless*: `live` mode, where `# Title` looks like a
title and `**bold**` looks bold — while the buffer, the file, and every
save stay plain Markdown, byte for byte.

**Scope.** `renderer/src/editor/live-preview.ts`, the `read / live /
source` mode model, and the MVP-001 owner-feedback batch context. Tests:
`tests/live-preview.test.ts`.

## 1. The one idea: styling is a VIEW concern, never a data concern

Word processors store rich text; the formatting IS the data. Atomik must
not (04/27: files are durable knowledge, one edit = one clean diff). So
live preview is built entirely from **decorations** — CodeMirror's
mechanism for changing how ranges of a document LOOK without changing
what they ARE:

```text
mark decoration      wrap a range in a CSS class  (**bold** -> lp-strong)
line decoration      put a class on a whole line  (# ...   -> lp-h1)
replace decoration   hide a range (or show a widget instead of it)
widget               a DOM element standing in for text (• for '- ')
```

Delete `live-preview.ts` and nothing about any file changes. That is the
whole safety argument, and it is why this feature needed no new bedrock
decision: it lives strictly on the view side of 11's "Markdown is the
durable medium".

## 2. Where the structure comes from: the syntax tree

CodeMirror's markdown language support parses the buffer into a **syntax
tree** (Lezer). The extension walks it:

```text
syntaxTree(state).iterate({ enter(node) { ... } })
  ATXHeading1..6  -> line class lp-h1..h6
  HeaderMark      -> hidden ('#'s + the following space)
  Emphasis marks  -> hidden; content gets lp-em / lp-strong
  InlineCode      -> lp-code; backticks hidden
  Link            -> lp-link; brackets and (url) hidden
  ListMark - * +  -> replaced by a • widget
  Blockquote      -> lp-quote lines; '>' hidden
  FencedCode      -> lp-fence lines; fences stay, dimmed
```

Two deliberate exceptions:

- **Fences stay visible.** A code block whose delimiters vanish is
  disorienting to edit — you cannot see where it ends. Dimmed, not hidden.
- **Frontmatter is opted out wholesale.** The markdown grammar has no
  frontmatter node, so `title: ...` followed by `---` misparses as a
  giant setext heading. `frontmatterEnd()` detects the leading block
  textually, styles it as one dim unit, and suppresses every other
  decoration inside it. Found by looking at a screenshot, not by a test
  — verify like a user (note 01 §7).

## 3. The reveal rule — why editing never fights the styling

Obsidian's core trick: hidden syntax reappears exactly where you are
working. Ours is one sentence: **any line the selection touches shows its
full syntax**. Move the cursor onto a heading and the `#`s come back;
leave and they fold away. Because hiding is a decoration, "coming back"
is just not-decorating — there is no mode flip, no content swap, no
cursor jump.

Implementation shape: the decoration set is a **StateField** recomputed
when the document changes, the selection moves, or the background parser
advances. A field (not a view plugin) because it is a pure function of
`EditorState` — which is what makes it unit-testable without a DOM: the
tests build a headless state, force a full parse with `ensureSyntaxTree`,
and assert on the computed ranges.

## 4. Three modes, one buffer

```text
read    rendered HTML (markdown-it), links navigable — not an editor
live    THE DEFAULT: CodeMirror + livePreview(), proportional font
source  CodeMirror raw, mono — "for IDE lovers"
```

`live` and `source` are the SAME EditorView: the extension sits in a
**compartment**, and switching modes reconfigures it in place — buffer,
undo history, and selection all survive. Only `read` swaps components,
which is why only the `read` switch goes through the save-first gate
(auto-save flushes; manual confirms). The retired `edit` param value from
S07 maps to `source` at load (`noteModeOf`), the same forward-migration
pattern as the retired `home` tab kind.

## 5. Try it yourself

1. **See the bytes stay honest.** Open a note in `live`, style-heavy as it
   looks, then `git diff` the vault: nothing. Type one word, auto-save,
   diff again: exactly that word.
2. **Watch the reveal rule.** Arrow up through a heading — `#`s appear on
   arrival, fold on departure. Select the whole note: everything reveals.
3. **Break the frontmatter guard.** Comment out the `frontmatterEnd` call
   in `live-preview.ts`, run `npm run dev`, open a frontmattered note:
   there is the giant underlined "heading" the guard exists for. Restore.
4. **Prove the field is pure.** In `tests/live-preview.test.ts`, add a
   case for `***bold italic***` and see what the tree produces before
   deciding what "correct" is — tree-first is how the extension was built.

## 6. Vocabulary you now own

```text
decoration       view-side styling/hiding of document ranges
mark/line/replace/widget   the four decoration kinds used here
syntax tree      Lezer's parse of the buffer; nodes have names + ranges
StateField       state-derived value recomputed per transaction
compartment      a slot whose extensions can be swapped on a live view
reveal rule      active lines show their raw syntax
GFM              GitHub-Flavored Markdown (strikethrough, tables, tasks)
```
