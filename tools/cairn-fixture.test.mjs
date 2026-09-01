/**
 * Adversarial fixtures — S08 Part 2.
 *
 * Every other suite here exercises `evaluate()` with hand-built arguments. That
 * proves the predicate, and it cannot prove the RULE: a rule wired to nothing,
 * or reading a field the real repository never has, passes a unit test and
 * reports `OK` forever in production. The conformance matrix said so —
 * "the checker suite exercises valid repositories and asserts OK, which a rule
 * that never fires also satisfies".
 *
 * So each fixture here builds a REAL repository with `cairn-init`, proves it is
 * green, introduces exactly ONE violation, runs the REAL checker as a
 * subprocess, and requires that rule to be among the blocking findings. The
 * green baseline is half the assertion: a fixture that blocks for an unrelated
 * reason proves nothing about the rule it names.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'

import { applyPlan, defaultOptions, planInstall } from './cairn-init.mjs'

const CHECK = 'tools/cairn-check.mjs'

/** Rules an adversarial fixture in this file demonstrates rejecting. */
const COVERED = new Set()

function git(dir, ...args) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: 'pipe' })
}

function commit(dir, message) {
  git(dir, 'add', '-A')
  git(dir, '-c', 'user.email=t@example.invalid', '-c', 'user.name=fixture', 'commit', '-qm', message)
}

/** A real, installed, green repository. */
function repository(options = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'cairn-fixture-'))
  applyPlan(planInstall({ ...defaultOptions(), ...options }), dir)
  git(dir, 'init', '-q', '-b', 'main')
  commit(dir, 'install cairn')
  return dir
}

/** Run the real checker and return its structured verdict. */
function check(dir, ...args) {
  try {
    const out = execFileSync(process.execPath, [CHECK, '--json', ...args], {
      cwd: dir, encoding: 'utf8', stdio: 'pipe'
    })
    return JSON.parse(out)
  } catch (error) {
    // A failing gate exits non-zero, which is the point of a gate.
    return JSON.parse(error.stdout)
  }
}

const blocking = (verdict) =>
  (verdict.findings ?? []).filter((f) => f.level === 'blocking').map((f) => f.rule)

function write(dir, path, content) {
  mkdirSync(dirname(join(dir, path)), { recursive: true })
  writeFileSync(join(dir, path), content)
}

/** One adversarial fixture: green before, and this rule blocking after. */
function fixture(name, rule, mutate, options = {}) {
  COVERED.add(rule)
  test(`adversarial: ${rule} — ${name}`, () => {
    const dir = repository(options)
    try {
      const clean = check(dir)
      assert.deepEqual(blocking(clean), [],
        `the baseline must be green, or this fixture proves nothing about ${rule}`)

      mutate(dir)
      const found = check(dir)
      assert.ok(blocking(found).includes(rule),
        `${rule} did not fire on a repository that violates it — blocking findings were: ${blocking(found).join(', ') || 'none'}`)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
}

const PATH_RECORD = (overrides = {}) => {
  const fields = {
    id: 'CP-FIXTURE-001',
    route: 'lightweight',
    status: 'running',
    current_step: 'S01',
    base_commit: 'a'.repeat(40),
    branch: 'path/cp-fixture-001',
    ...overrides
  }
  const body = Object.entries(fields)
    .map(([key, value]) => `  ${key}: ${value}`)
    .join('\n')
  return `---
type: Cairn Coding Path
title: Fixture path
description: A path record used by the adversarial fixtures.
tags: [coding-path]
timestamp: 2026-09-01T00:00:00Z
cairn:
${body}
---

# CP-FIXTURE-001 — Fixture path

## Goal

Exercise one rule.

## Definition of done

- [ ] The rule fires.
`
}

const BRIEF = (base) => `---
type: Cairn Brief
title: Handoff — CP-FIXTURE-001
description: Fixture handoff brief.
tags: [brief]
timestamp: 2026-09-01T00:00:00Z
cairn:
  path: CP-FIXTURE-001
  written_by: fixture
  branch: path/cp-fixture-001
  checkpoint: ${base}
  checkpoint_unit: 1
  checkpoint_pushed: true
  base_commit: ${base}
  trunk_seen: ${base}
  writes:
    - src/**
  governs:
    - docs/architecture/index.md@${'b'.repeat(40)}
  verify:
    - npm run cairn-check
---

# Resume CP-FIXTURE-001 here

## Outcome

Exercise one rule.

## State

A fixture repository with one registered path.

## Next action

Violate exactly one rule.

## Blockers

None.

## Tried and rejected

Nothing yet.

## Reading order

1. \`project/coding-paths/paths.md\`

## Verification

\`npm run cairn-check\` reports OK.
`

/** A green repository with one registered path, checked out on its branch.
 *
 *  Reaching green here is most of the work, and it is the half that makes a
 *  fixture mean anything: several rules only evaluate `onPath`, so a fixture
 *  run on the trunk proves nothing about them however loudly it fails. */
function pathRepository() {
  const dir = repository()
  const base = git(dir, 'rev-parse', 'HEAD').trim()
  write(dir, 'project/coding-paths/CP-FIXTURE-001.md', PATH_RECORD({ base_commit: base, ceremony: 'opening' }))
  write(dir, 'project/briefs/cp-fixture-001-handoff.md', BRIEF(base))
  execFileSync(process.execPath, ['tools/cairn-active.mjs'], { cwd: dir, stdio: 'pipe' })
  commit(dir, 'register CP-FIXTURE-001')
  git(dir, 'checkout', '-q', '-b', 'path/cp-fixture-001')
  return dir
}

/** An adversarial fixture that needs a path branch to reach its rule. */
function pathFixture(name, rule, mutate) {
  COVERED.add(rule)
  test(`adversarial: ${rule} — ${name}`, () => {
    const dir = pathRepository()
    try {
      assert.deepEqual(blocking(check(dir)), [],
        `the path-branch baseline must be green, or this fixture proves nothing about ${rule}`)
      mutate(dir)
      const found = check(dir)
      assert.ok(blocking(found).includes(rule),
        `${rule} did not fire — blocking findings were: ${blocking(found).join(', ') || 'none'}`)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
}

fixture('a link that resolves nowhere', 'links', (dir) => {
  appendFileSync(join(dir, 'docs/index.md'), '\nA [dangling](./nothing-here.md) link.\n')
})

fixture('a concept nothing outside the wiki links', 'concept-orphan', (dir) => {
  write(dir, 'docs/cairn/specification/concepts/unused-idea.md',
    '---\ntype: Cairn Concept\ntitle: Unused idea\ndescription: Nobody links this.\ntags: [cairn, concept]\ntimestamp: 2026-09-01T00:00:00Z\n---\n\n# Unused idea\n\nA concept no text needed.\n')
})

fixture('a running path the generated view does not know about', 'derived-view', (dir) => {
  write(dir, 'project/coding-paths/CP-FIXTURE-001.md', PATH_RECORD())
})

fixture('a redaction marker naming no record', 'redaction', (dir) => {
  appendFileSync(join(dir, 'docs/index.md'), '\nRemoved [redacted: 2026-09-01-nonexistent] here.\n')
})

fixture('a path record whose frontmatter breaks the schema', 'schema', (dir) => {
  write(dir, 'project/coding-paths/CP-FIXTURE-001.md', PATH_RECORD({ status: 'inventing' }))
})

pathFixture('a path branch declaring an unknown route', 'route', (dir) => {
  const base = git(dir, 'rev-parse', 'HEAD').trim()
  write(dir, 'project/coding-paths/CP-FIXTURE-001.md',
    PATH_RECORD({ base_commit: base, ceremony: 'opening', route: 'whatever' }))
})

pathFixture('a changed path record carrying no work unit', 'work-unit', (dir) => {
  appendFileSync(join(dir, 'project/coding-paths/CP-FIXTURE-001.md'), '\n- [ ] One more thing.\n')
})

pathFixture('a handoff brief missing its contract', 'brief-schema', (dir) => {
  write(dir, 'project/briefs/cp-fixture-001-handoff.md',
    '---\ntype: Cairn Brief\ntitle: Handoff\ndescription: x\ntags: [brief]\ntimestamp: 2026-09-01T00:00:00Z\ncairn:\n  path: CP-FIXTURE-001\n---\n\n# Resume\n\n## Outcome\n\nx\n')
})

/* ------------------------------------------------------------------ *
 * Invocation parity — S08 Part 2
 *
 * S08a found that the default local command and the CI command compared
 * different bases, so nine findings were invisible locally for many pushes.
 * The fix was a default, and a default is a claim until something compares the
 * two invocations on ONE tree and requires one verdict.
 * ------------------------------------------------------------------ */

test('parity: the local default and the CI invocation agree on one tree', () => {
  const dir = pathRepository()
  try {
    // CI runs `--base <trunk>` explicitly; the local default resolves the same
    // base on a path branch since S08a. Same tree, same verdict.
    const local = check(dir)
    const ci = check(dir, '--base', 'main')
    assert.equal(local.status, ci.status,
      'the local default and the CI invocation must reach the same verdict on one tree')
    assert.deepEqual(blocking(local).sort(), blocking(ci).sort(),
      'the two invocations must report the same blocking rules, or one of them is judging a different comparison')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('parity: a violation is equally visible to both invocations', () => {
  // The direction that actually mattered: a real finding must not be invisible
  // to the command a developer runs before pushing.
  const dir = pathRepository()
  try {
    appendFileSync(join(dir, 'project/coding-paths/CP-FIXTURE-001.md'), '\n- [ ] One more thing.\n')
    const local = check(dir)
    const ci = check(dir, '--base', 'main')
    assert.ok(blocking(local).includes('work-unit'))
    assert.deepEqual(blocking(local).sort(), blocking(ci).sort())
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('parity: opting out of the trunk comparison is reported as narrowing', () => {
  // `--working-tree` is the opt-out, and it must ANNOUNCE itself: a narrowed
  // run that looks like a full one is how "gates green" came to mean less than
  // it read (S08a).
  const dir = pathRepository()
  try {
    const narrowed = check(dir, '--working-tree')
    const rules = (narrowed.findings ?? []).map((f) => f.rule)
    assert.ok(rules.includes('base-parity'),
      'a narrowed run must say so, or its verdict will be recorded as the full one')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

/** Blocking rules with no adversarial fixture yet.
 *
 *  Declared rather than counted, so adding a blocking rule forces a choice:
 *  write its fixture, or add it here deliberately. A coverage number that
 *  nobody has to look at is a number that quietly falls.
 *
 *  Most of these need repository states this harness cannot yet reach cheaply —
 *  a closed candidate with its audit and acceptance, a rewritten published tip,
 *  a detached checkout, a trunk that moved inside a declared surface. They are
 *  a gap, and the gap is stated as one rather than implied away.
 */
const UNCOVERED = new Set([
  'acceptance', 'acceptance-drift', 'advisory-disposition', 'branch-identity',
  'branch-path', 'checkpoint-retention', 'closure-surface', 'coherence-audit',
  'journal-entry', 'migration-debt', 'opening-ceremony', 'path-history',
  'provisional', 'rebase', 'record-date', 'record-integrity', 'registration',
  'registration-base', 'same-work-unit', 'scope-digest', 'scope-drift',
  'transition'
])

test('adversarial coverage is declared, not assumed', async () => {
  const { extractRules } = await import('./cairn-rules.mjs')
  const source = readFileSync(new URL('./cairn-check.mjs', import.meta.url), 'utf8')
  const blockingRules = new Set(
    extractRules(source).filter((rule) => rule.level === 'blocking').map((rule) => rule.name)
  )

  for (const rule of COVERED) {
    assert.ok(blockingRules.has(rule), `${rule} has a fixture but is not a blocking rule`)
    assert.ok(!UNCOVERED.has(rule), `${rule} is covered and must not also be listed as uncovered`)
  }

  const unaccounted = [...blockingRules].filter((rule) => !COVERED.has(rule) && !UNCOVERED.has(rule))
  assert.deepEqual(unaccounted, [],
    'a new blocking rule must either get an adversarial fixture or be listed in UNCOVERED deliberately')

  const stale = [...UNCOVERED].filter((rule) => !blockingRules.has(rule))
  assert.deepEqual(stale, [], 'UNCOVERED names a rule that no longer blocks — remove it')
})
