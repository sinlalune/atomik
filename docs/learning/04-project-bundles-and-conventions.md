---
type: Atomik Learning Note
title: 'Learning: project bundles — conventions, manifests, and safe adoption'
description: Beginner-first walkthrough of S06 — convention over configuration, idempotent ensure, and scoping views without new channels.
tags: [learning, projects, conventions, manifest, okf, idempotence]
timestamp: 2026-07-06T00:00:00Z
---

# Learning: project bundles — conventions, manifests, and safe adoption

**Who this is for.** You read [03 — vault IO](./03-vault-io-and-file-trust.md).
After this note you can read `electron-main/project.ts` and
`renderer/src/project/ProjectView.tsx` and explain every promise they make.

**Scope.** CP-MVP-001 S06: project bundles — `index.md`, `log.md`, and the
`project.atomik-project.json` manifest (04).

## 1. What a project bundle is

A vault holds everything; a **project bundle** is one folder inside it that
gathers active thinking on one subject (04): its own `index.md` (map),
`log.md` (history), later `notes/`, `sources/`, `trails/`. The app needed a
way to recognize and create such folders without inventing a database.

## 2. Convention over configuration — with one explicit marker

Two ways to "know" a folder is a project:

```text
convention-only    "any folder with index.md + log.md"  -> too greedy
                   (docs/ has both and is NOT a project)
explicit marker    "any folder holding project.atomik-project.json"
```

We chose the explicit marker. The manifest is deliberately tiny — id,
title, createdAt, empty `resources`/`pinned` lists, an OKF profile tag —
because 04's rule is that the manifest **binds the folder without replacing
Markdown**: knowledge lives in `index.md`/`log.md`; the JSON only helps the
app load fast. (We dropped the `root` field from 04's example: the manifest
lives *in* the root, so storing the path would just go stale on moves —
deviation recorded in the module note.)

## 3. The most important idea: idempotent ensure

`createProject` does not mean "make new or fail". It means **ensure**:

```text
for each piece (manifest, index.md, log.md):
  exists?  -> leave it byte-identical, untouched
  missing? -> create it, exclusively (wx)
```

Run it on an empty path: a fresh bundle. Run it on a folder that already
has an `index.md` full of your knowledge: it gains only the missing
manifest and log — the test proves the existing file is byte-identical
after. Run it twice: the second call changes nothing and returns the
existing identity (the manifest wins over the title you passed).

This is what makes **adopting** `atomik-project/` — this repository's own
knowledge plane — a safe one-click act. Concept names: **idempotence** (do
it twice = do it once) and **ensure semantics** (converge on a state
instead of performing an action). You will meet them everywhere in
infrastructure code.

## 4. Slugs, or why "Économie & société!" becomes `economie-societe`

Ids must be filesystem- and URL-friendly. `slugify` lowercases, strips
accents (Unicode **NFKD** normalization splits `é` into `e` + a combining
accent, which a range regex then removes), and collapses everything else
into hyphens — with a fallback so no title produces an empty id. Small
function, three tests, zero surprises later.

## 5. Scoping a view without a new channel

ProjectView shows only the project's subtree. The lazy path would be a new
IPC channel (`list-project-files`). Instead a **pure renderer helper**
(`vault/scope.ts: findSubtree`) walks the tree the existing
`listVaultFiles` already returns. One fewer channel to validate and test on
the trust boundary; reads stay on the vault family. Rule of thumb worth
keeping: **derive in the renderer when the data is already there; add a
channel only for new authority.**

Same spirit in `useVaultNote`: when a third view needed open/render/link
logic, the duplicated code was extracted into one hook — after the third
consumer, not before (the reuse threshold you saw in 14's incubation rule).

## 6. Try it yourself

1. **Create a bundle.** +project tab → type a title → create. Then look at
   the three files on disk and `git status`: one untracked folder, nothing
   else.
2. **Adopt this repo's plane.** Open the repo's `atomik-project/` vault (or
   the repo root), +project → it lists nothing yet → create with path...
   actually try DevTools:
   `await window.atomik.createProject('atomik-project', 'Atomik Plane')`
   on a repo-root vault — then check `git status`: only the new manifest
   (and log if missing) appear; `index.md` untouched. Revert with git if
   you were just testing.
3. **Prove idempotence.** Run the same call again — no new diff at all.
4. **Break a title.** `createProject('projects/x', '')` → rejected.

## 7. What arrives next

- **S07 editor**: CodeMirror over vault notes; `mtimeMs` conflict checks;
  explicit save. The bundle you just created becomes somewhere to write.
- **S08 AI patch loop**: operations will target project files
  (`index.md`, `log.md`, notes) through reviewable patches — the bundle is
  the AI's durable destination, never its private database.
