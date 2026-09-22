---
type: Cairn Pointer
title: Cairn here
description: Release 1.1.0 of the Cairn protocol, installed in this repository: what to read, and what the kit owns.
tags: [cairn, pointer, generated]
timestamp: 2026-09-22T00:00:00Z
---

# Cairn here

Cairn is the most lightweight and minimalistic harness-agnostic,
document-driven coding protocol.

This repository carries **release 1.1.0**, cut from commit
`bff7e2af18c17a909e67eec4a8e69c1f5855cfe7`. Every link below resolves to the specification at that commit,
so what you read is what you installed.

This page is GENERATED, at `init` and at every `update`. Nothing on it is
written by hand.

## The specification, in six chapters

- [1. Idea and ideation](https://github.com/sinlalune/cairn/blob/bff7e2af18c17a909e67eec4a8e69c1f5855cfe7/spec/index.md#1-idea-and-ideation) — where an idea is captured and turned into something a session can read
- [2. Research](https://github.com/sinlalune/cairn/blob/bff7e2af18c17a909e67eec4a8e69c1f5855cfe7/spec/index.md#2-research) — what is read before a decision, and where the notes land
- [3. Vision and specifications](https://github.com/sinlalune/cairn/blob/bff7e2af18c17a909e67eec4a8e69c1f5855cfe7/spec/index.md#3-vision-and-specifications) — what the product is, and the pages a promotion writes
- [4. Roadmap](https://github.com/sinlalune/cairn/blob/bff7e2af18c17a909e67eec4a8e69c1f5855cfe7/spec/index.md#4-roadmap) — the register of milestones, each with a coding path or none yet
- [5. Coding cycle](https://github.com/sinlalune/cairn/blob/bff7e2af18c17a909e67eec4a8e69c1f5855cfe7/spec/index.md#5-coding-cycle) — how a path opens, runs unit by unit, and closes
- [6. Learning loop](https://github.com/sinlalune/cairn/blob/bff7e2af18c17a909e67eec4a8e69c1f5855cfe7/spec/index.md#6-learning-loop) — the concept wiki, learning notes, and what a cycle leaves behind

## The skills

- [`cairn-brainstorm`](../skills/cairn-brainstorm/SKILL.md) — an idea arrives and is worked into a note
- [`cairn-open`](../skills/cairn-open/SKILL.md) — a path is scoped, accepted and registered
- [`cairn-unit`](../skills/cairn-unit/SKILL.md) — one work unit: plan, change, self-review, review, verify, push
- [`cairn-close`](../skills/cairn-close/SKILL.md) — a candidate is proposed, reviewed and integrated
- [`cairn-learn`](../skills/cairn-learn/SKILL.md) — a learning session, ending in a note with an order
- [`cairn-code`](../skills/cairn-code/SKILL.md) — the stance the change movement is written with

## What this needs beside it

- `DietrichGebert/ponytail` at `v4.9.0` — the coding stance and its review tags, installed in your harness as that repository says. The kit names it and copies nothing of it, so the tag moves only when this release does.

## What the kit owns

`update` rewrites any of these that still holds exactly what the kit wrote,
and never rewrites one you have edited. `npx cairn-protocol status` says
which is which, and `update --take <path>` takes the release's version of one
you name.

- `.github/pull_request_template.md`
- `.github/workflows/cairn.yml`
- `AGENTS.md`
- `atomik-project/coding-paths/ACTIVE.md`
- `atomik-project/coding-paths/binding.md`
- `atomik-project/coding-paths/index.md`
- `atomik-project/index.md`
- `cairn.config.json`
- `cairn.lock.json`
- `cairn/README.md`
- `docs/architecture/index.md`
- `docs/concepts/cairn/index.md`
- `docs/concepts/learning/index.md`
- `docs/concepts/product/index.md`
- `docs/index.md`
- `docs/inputs/index.md`
- `docs/modules/application.md`
- `docs/modules/index.md`
- `package.json`
- `skills/cairn-brainstorm/SKILL.md`
- `skills/cairn-close/SKILL.md`
- `skills/cairn-close/reference.md`
- `skills/cairn-code/SKILL.md`
- `skills/cairn-learn/SKILL.md`
- `skills/cairn-open/SKILL.md`
- `skills/cairn-open/reference.md`
- `skills/cairn-unit/SKILL.md`
- `skills/cairn-unit/reference.md`
- `tools/cairn-active.mjs`
- `tools/cairn-audit.mjs`
- `tools/cairn-check.mjs`
- `tools/cairn-config.mjs`
- `tools/cairn-config.schema.json`
- `tools/cairn-postmortem.mjs`

## To reconcile by hand

Files you edited whose template this release changed. `update` left them
alone and printed the difference; this list stands until an update finds it
empty.

- `.github/workflows/cairn.yml`
- `AGENTS.md`
- `atomik-project/coding-paths/ACTIVE.md`
- `atomik-project/coding-paths/binding.md`
- `atomik-project/coding-paths/index.md`
- `atomik-project/index.md`
- `docs/index.md`
- `docs/modules/application.md`
- `docs/modules/index.md`
- `package.json`
- `tools/cairn-check.mjs`
