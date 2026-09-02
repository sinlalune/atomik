import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import {
  applyPlan, buildConfig, defaultOptions, outwardLinks, planInstall, PROTOCOL_RELEASE
} from './cairn-init.mjs'
import { configErrors } from './cairn-config.mjs'

const target = () => mkdtempSync(join(tmpdir(), 'cairn-init-'))

test('cairn-init: a new repository is created in the shapes the protocol states now', () => {
  // The whole reason the seed reconciliation (S08q) preceded this command: what
  // an adopter receives on day one is what they own on day one.
  const config = buildConfig(defaultOptions())
  assert.deepEqual(configErrors(config), [], 'the generated binding must be valid before it is written')
  assert.equal(config.pathHistoryPolicy, 'forbidden')
  assert.equal(config.checkpointRetentionRef, null,
    'a new repository has nothing to migrate, so it starts with no retention namespace at all')
  assert.equal(config.defaultRoute, 'lightweight')
  assert.equal(config.version, 1)
})

test('cairn-init: an invalid generated binding fails before anything is written', () => {
  // Fail closed. An installer that emits a binding the loader rejects hands the
  // adopter a repository whose first command cannot run.
  assert.throws(
    () => planInstall({ ...defaultOptions(), profile: 'nonsense' }),
    /generated configuration is invalid/
  )
})

test('cairn-init: the installed corpus resolves entirely within itself', () => {
  // The first end-to-end run produced a repository whose FIRST gate failed with
  // seventeen broken links, none of them visible from inside the source
  // repository where every target exists. This is that failure, held.
  const plan = planInstall()
  assert.deepEqual(outwardLinks(plan.files), [])
})

test('cairn-init: an existing file is refused rather than overwritten', () => {
  const dir = target()
  try {
    writeFileSync(join(dir, 'AGENTS.md'), 'the adopter wrote this')
    assert.throws(() => applyPlan(planInstall(), dir), /refusing to overwrite/)
    assert.equal(readFileSync(join(dir, 'AGENTS.md'), 'utf8'), 'the adopter wrote this',
      'the refused install must leave the target exactly as it found it')
    assert.equal(existsSync(join(dir, 'cairn.config.json')), false,
      'nothing is written when any conflict exists — not even the files that would not have collided')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('cairn-init: an already-installed repository is refused', () => {
  const dir = target()
  try {
    writeFileSync(join(dir, 'cairn.lock.json'), '{}')
    assert.throws(() => applyPlan(planInstall(), dir), /already carries a cairn\.lock\.json/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('cairn-init: a dry run writes nothing', () => {
  const dir = target()
  try {
    const result = applyPlan(planInstall(), dir, { dryRun: true })
    assert.ok(result.planned.length > 50)
    assert.deepEqual(result.written, [])
    assert.equal(existsSync(join(dir, 'cairn.config.json')), false)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('cairn-init: the lock records the release and a digest per installed file', () => {
  const dir = target()
  try {
    applyPlan(planInstall(), dir)
    const lock = JSON.parse(readFileSync(join(dir, 'cairn.lock.json'), 'utf8'))
    assert.equal(lock.release, PROTOCOL_RELEASE)
    assert.ok(Object.keys(lock.manifest).length > 50)
    for (const value of Object.values(lock.manifest)) assert.match(value, /^[0-9a-f]{64}$/)
    // The generated view is recorded as installed, because it IS installed —
    // a manifest that omits it cannot tell a later migrator whether the adopter
    // edited it.
    assert.ok(Object.keys(lock.manifest).some((path) => path.endsWith('ACTIVE.md')))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('cairn-init: a freshly installed repository passes its own gate', () => {
  // The only claim that matters. Everything else is a proxy for it.
  const dir = target()
  try {
    applyPlan(planInstall({ ...defaultOptions(), profile: 'ci' }), dir)
    const git = (...args) => execFileSync('git', args, { cwd: dir, stdio: 'pipe' })
    git('init', '-q', '-b', 'main')
    git('add', '-A')
    git('-c', 'user.email=t@example.invalid', '-c', 'user.name=t', 'commit', '-qm', 'install')
    const output = execFileSync(process.execPath, ['tools/cairn-check.mjs'], {
      cwd: dir, encoding: 'utf8'
    })
    assert.match(output, /OK — protocol satisfied/)
    assert.match(output, /path history forbidden/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('cairn-init: a protected profile is refused because it cannot be installed', () => {
  // Tier 0 and 1 only. `protected` asserts host branch protection that no local
  // command can configure, and a configuration claiming it would be a claim
  // about the host that the host has not agreed to.
  const dir = target()
  try {
    assert.throws(
      () => execFileSync(process.execPath, ['tools/cairn-init.mjs', '--target', dir, '--profile', 'protected'], { stdio: 'pipe' }),
      /protected/
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('cairn-init: an existing package.json is left alone and reported', () => {
  const dir = target()
  try {
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'package.json'), '{"name":"theirs"}')
    const output = execFileSync(process.execPath, ['tools/cairn-init.mjs', '--target', dir], { encoding: 'utf8' })
    assert.match(output, /package\.json already exists and was left alone/)
    assert.equal(JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).name, 'theirs')
    assert.ok(existsSync(join(dir, 'cairn.config.json')), 'the rest of the installation still lands')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
