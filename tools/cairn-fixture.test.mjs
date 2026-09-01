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
 * Greenfield pilot — S09
 *
 * The pilot drove a repository created by `cairn-init` through one whole
 * lifecycle and found that the closure sequence could not be completed on an
 * honest record. Every fixture below was red, or silently green, before the
 * repair it names. The harness reaches `ready` the way the operations page
 * says to, so the baseline is itself the regression test.
 * ------------------------------------------------------------------ */

const SLICED_RECORD = (base) => `---
type: Cairn Coding Path
title: Sliced fixture path
description: A born-sliced record in a new folder.
tags: [coding-path]
timestamp: 2026-09-01T00:00:00Z
cairn:
  id: CP-FIXTURE-002
  route: lightweight
  status: running
  current_step: S01
  base_commit: ${base}
  branch: path/cp-fixture-002
  writes:
    - src/**
  governs:
    - docs/architecture/index.md@${'b'.repeat(40)}
---

# CP-FIXTURE-002 — Sliced fixture path

## Goal

Exercise one rule.

## Definition of done

- [ ] The rule fires.
`

// A born-sliced record is born in a NEW FOLDER, and `git status --porcelain`
// lists a new folder as one entry with none of the files inside it. The gate
// on the untracked tree read OK with no opening acceptance anywhere; staging
// the same tree read FAILED. Regenerating the view keeps `derived-view` out of
// the way so the assertion is about the rule it names.
fixture('a running record born in an untracked folder, with no opening acceptance', 'opening-ceremony', (dir) => {
  const base = git(dir, 'rev-parse', 'HEAD').trim()
  write(dir, 'project/coding-paths/CP-FIXTURE-002/index.md', SLICED_RECORD(base))
  execFileSync(process.execPath, ['tools/cairn-active.mjs'], { cwd: dir, stdio: 'pipe' })
})

const OPENING = (digest) => `---
type: Cairn Session Record
title: CP-FIXTURE-001 opening acceptance
timestamp: 2026-09-01T09:00:00Z
tags: [cairn, opening]
path: CP-FIXTURE-001
ceremony: opening
decision: accepted
accepted_by: fixture-opener
accepted_roles: [initiator, reviewer]
accepted_at: 2026-09-01T09:00:00Z
scope_ref: project/coding-paths/CP-FIXTURE-001.md#definition-of-done
scope_digest: ${digest}
---

# CP-FIXTURE-001 — opening acceptance

## Decision

Accepted for trunk registration.
`

const CLOSING = ({ subject, base, digest, attested = [], disposition = [] }) => {
  const list = disposition.length === 0
    ? 'advisory_disposition: []'
    : `advisory_disposition:\n${disposition.map((d) =>
      `  - rule: ${d.rule}\n    disposition: ${d.disposition}\n    reason: ${d.reason}`).join('\n')}`
  return `---
type: Cairn Session Record
title: CP-FIXTURE-001 closing acceptance
timestamp: 2026-09-01T18:00:00Z
tags: [cairn, closing]
path: CP-FIXTURE-001
ceremony: closing
subject_commit: ${subject}
base: ${base}
accepted_by: fixture-closer
accepted_roles: [reviewer, auditor]
accepted_at: 2026-09-01T18:00:00Z
decision: accepted
scope_ref: project/coding-paths/CP-FIXTURE-001.md#definition-of-done
scope_digest: ${digest}
advisories_at_candidate: [${attested.join(', ')}]
${list}
---

# CP-FIXTURE-001 — closing acceptance

## Decision

Candidate accepted for administrative closure and exact integration.
`
}

const UNIT_BLOCK = '\n## Ledger\n\n```cairn-unit\nstep: S01\nunit: 01\ntype: implementation\nverified: cairn-check\n```\n'

function scopeDigest(dir) {
  return execFileSync(process.execPath,
    [CHECK, '--scope-digest', 'project/coding-paths/CP-FIXTURE-001.md#definition-of-done'],
    { cwd: dir, encoding: 'utf8', stdio: 'pipe' }).trim()
}

/** A real repository at the moment the closure commit A is being prepared:
 *  registered with a session-note opening, one implementation unit that
 *  WIDENED `writes:` while running, the trunk merged in, the candidate audited
 *  with the real scaffolder, closing acceptance recorded with the honest
 *  empty attestation, and the administrative edits sitting UNCOMMITTED in the
 *  working tree — exactly where the operations page says to run the gate. */
function readyRepository() {
  const dir = repository()
  const base = git(dir, 'rev-parse', 'HEAD').trim()
  write(dir, 'project/coding-paths/CP-FIXTURE-001.md', PATH_RECORD({
    base_commit: base,
    writes: '\n    - src/**',
    governs: `\n    - docs/architecture/index.md@${'b'.repeat(40)}`
  }))
  write(dir, 'project/sessions/2026-09-01-cp-fixture-001-opening.md', OPENING(scopeDigest(dir)))
  write(dir, 'project/briefs/cp-fixture-001-handoff.md', BRIEF(base))
  execFileSync(process.execPath, ['tools/cairn-active.mjs'], { cwd: dir, stdio: 'pipe' })
  commit(dir, 'register CP-FIXTURE-001')
  git(dir, 'checkout', '-q', '-b', 'path/cp-fixture-001')

  // S01: source, its module note, and a widening discovered while working.
  write(dir, 'src/app.js', 'export const app = true\n')
  write(dir, 'docs/modules/application.md', '---\ntype: Cairn Module Note\ntitle: Application\ndescription: The one area.\ntags: [module]\ntimestamp: 2026-09-01T00:00:00Z\n---\n\n# Application\n\nOne exported constant.\n')
  const record = readFileSync(join(dir, 'project/coding-paths/CP-FIXTURE-001.md'), 'utf8')
    .replace('    - src/**\n', '    - src/**\n    - docs/modules/application.md\n') + UNIT_BLOCK
  assert.ok(record.includes('    - docs/modules/application.md'), 'the harness must widen writes: while running')
  write(dir, 'project/coding-paths/CP-FIXTURE-001.md', record)
  commit(dir, 'CP-FIXTURE-001 S01: the one constant')
  // Published, as the protocol requires before a step is complete: a bare
  // repository is a real remote, and the remote trunk is the base the gate
  // resolves by default on a path branch.
  git(dir, 'init', '-q', '--bare', `${dir}.git`)
  git(dir, 'remote', 'add', 'origin', `${dir}.git`)
  git(dir, 'push', '-q', '-u', 'origin', 'main', 'path/cp-fixture-001')
  const subject = git(dir, 'rev-parse', 'HEAD').trim()
  const trunk = git(dir, 'rev-parse', 'origin/main').trim()

  // Closure: the real audit scaffold, filled; the closing record; A's edits.
  execFileSync(process.execPath, ['tools/cairn-audit.mjs', '--subject', subject, '--branch', 'path/cp-fixture-001'],
    { cwd: dir, stdio: 'pipe' })
  const auditFile = `project/audits/cp-fixture-001-${subject}.md`
  write(dir, auditFile, readFileSync(join(dir, auditFile), 'utf8')
    .replace('verdict: TO BE FILLED BY THE AUDITING AGENT', 'verdict: clean')
    .replace(/### Does the diff contradict an accepted decision\?\n\nTO BE FILLED BY THE AUDITING AGENT/,
      '### Does the diff contradict an accepted decision?\n\nNo — there is none.')
    .replace(/TO BE FILLED BY THE AUDITING AGENT/g, ''))
  write(dir, 'project/sessions/2026-09-01-cp-fixture-001-closing.md',
    CLOSING({ subject, base: trunk, digest: scopeDigest(dir) }))
  write(dir, 'project/coding-paths/CP-FIXTURE-001.md',
    readFileSync(join(dir, 'project/coding-paths/CP-FIXTURE-001.md'), 'utf8')
      .replace('  status: running\n', '  status: ready\n')
      .replace('  branch: path/cp-fixture-001\n', `  branch: path/cp-fixture-001\n  subject_commit: ${subject}\n`))
  write(dir, 'project/briefs/cp-fixture-001-handoff.md',
    BRIEF(base).replace(`checkpoint: ${base}`, `checkpoint: ${subject}`))
  execFileSync(process.execPath, ['tools/cairn-active.mjs'], { cwd: dir, stdio: 'pipe' })
  return { dir, subject, trunk }
}

/** A closure fixture: the uncommitted closure is green, and this one
 *  mutation makes the named rule block. */
function closureFixture(name, rule, mutate) {
  COVERED.add(rule)
  test(`adversarial: ${rule} — ${name}`, () => {
    const { dir, subject, trunk } = readyRepository()
    try {
      const clean = check(dir)
      assert.deepEqual(blocking(clean), [],
        `an honest closure must be green, or this fixture proves nothing about ${rule}: ${JSON.stringify((clean.findings ?? []).filter((f) => f.level === 'blocking').map((f) => f.message))}`)
      mutate(dir, { subject, trunk })
      const found = check(dir)
      assert.ok(blocking(found).includes(rule),
        `${rule} did not fire — findings were: ${JSON.stringify(found.findings ?? [])}`)
    } finally {
      rmSync(dir, { recursive: true, force: true })
      rmSync(`${dir}.git`, { recursive: true, force: true })
    }
  })
}

test('closure: the committed, not-yet-pushed administrative commit is green', () => {
  // The documented order is commit A, run the gate, push. Between the second
  // and third steps `remote-checkpoint` fires about A itself, and the
  // attestation rule read that as an advisory missing from the candidate's
  // set. The closure the pilot ran could not pass its own post-commit gate.
  const { dir } = readyRepository()
  try {
    commit(dir, 'Close CP-FIXTURE-001')
    const found = check(dir)
    assert.deepEqual(blocking(found), [],
      `an unpushed closure commit must be green: ${JSON.stringify((found.findings ?? []).filter((f) => f.level === 'blocking').map((f) => f.message))}`)
    assert.ok((found.findings ?? []).some((f) => f.rule === 'remote-checkpoint'),
      'the unpushed closure commit must still be reported, as an advisory')
  } finally {
    rmSync(dir, { recursive: true, force: true })
    rmSync(`${dir}.git`, { recursive: true, force: true })
  }
})

closureFixture('the closure commit moves writes:, which acceptance was measured against', 'closure-surface', (dir) => {
  const file = join(dir, 'project/coding-paths/CP-FIXTURE-001.md')
  writeFileSync(file, readFileSync(file, 'utf8').replace('    - src/**\n', '    - src/**\n    - lib/**\n'))
})

closureFixture('implementation changes after acceptance, in the uncommitted closure', 'acceptance', (dir) => {
  write(dir, 'src/app.js', 'export const app = false\n')
})

closureFixture('the definition of done is edited after acceptance', 'scope-digest', (dir) => {
  const file = join(dir, 'project/coding-paths/CP-FIXTURE-001.md')
  writeFileSync(file, readFileSync(file, 'utf8').replace('- [ ] The rule fires.', '- [ ] The rule fires, eventually.'))
})

closureFixture('the coherence audit bound to the candidate is missing', 'coherence-audit', (dir, { subject }) => {
  rmSync(join(dir, `project/audits/cp-fixture-001-${subject}.md`))
})

closureFixture('an advisory attested at the candidate has no disposition', 'advisory-disposition', (dir, { subject, trunk }) => {
  write(dir, 'project/sessions/2026-09-01-cp-fixture-001-closing.md',
    CLOSING({ subject, base: trunk, digest: scopeDigest(dir), attested: ['path-staleness'] }))
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
 *  a rewritten published tip, a detached checkout, a trunk that moved inside a
 *  declared surface, an integration reaching `done`. They are a gap, and the
 *  gap is stated as one rather than implied away. The closed candidate with
 *  its audit and acceptance is reachable since the greenfield pilot (S09):
 *  `readyRepository()` above.
 */
const UNCOVERED = new Set([
  'acceptance-drift', 'branch-identity', 'branch-path', 'checkpoint-retention',
  'journal-entry', 'migration-debt', 'path-history', 'provisional', 'rebase',
  'record-date', 'record-integrity', 'registration', 'registration-base',
  'same-work-unit', 'scope-drift', 'transition'
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
