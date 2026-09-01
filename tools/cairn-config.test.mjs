import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  CAIRN_CONFIG,
  SUPPORTED_CONFIG_VERSION,
  configErrors,
  loadConfig,
  metadataOf,
  slash
} from './cairn-config.mjs'

test('cairn-config: the installed host binding is schema-valid and explicit', () => {
  assert.deepEqual(configErrors(CAIRN_CONFIG), [])
  assert.equal(CAIRN_CONFIG.version, SUPPORTED_CONFIG_VERSION)
  assert.equal(CAIRN_CONFIG.roots.project, 'atomik-project')
  assert.equal(CAIRN_CONFIG.metadataNamespace, 'atomik')
  assert.equal(CAIRN_CONFIG.enforcementProfile, 'ci')
})

test('cairn-config: unknown schemas and unsafe roots fail before a gate runs', () => {
  const unknown = structuredClone(CAIRN_CONFIG)
  unknown.version = 2
  assert.ok(configErrors(unknown).some((error) => error.includes('supported schema 1')))

  const escaping = structuredClone(CAIRN_CONFIG)
  escaping.roots.project = '../outside'
  assert.ok(configErrors(escaping).some((error) => error.includes('roots.project')))

  const ambiguous = structuredClone(CAIRN_CONFIG)
  ambiguous.roots.project = 'project\\state'
  ambiguous.surprise = true
  const errors = configErrors(ambiguous)
  assert.ok(errors.some((error) => error.includes('roots.project')))
  assert.ok(errors.some((error) => error.includes('unknown top-level field surprise')))
})

test('cairn-config: disabling retention requires a declared no-rewrite host', () => {
  const invalid = structuredClone(CAIRN_CONFIG)
  invalid.checkpointRetentionRef = null
  assert.ok(configErrors(invalid).some((error) => error.includes('pathHistoryPolicy: forbidden')))

  invalid.pathHistoryPolicy = 'forbidden'
  assert.deepEqual(configErrors(invalid), [])
})

test('cairn-config: metadata and path helpers carry no host assumption', () => {
  assert.deepEqual(metadataOf({ cairn: { id: 'CP-X' } }, { metadataNamespace: 'cairn' }), {
    id: 'CP-X'
  })
  assert.equal(slash('project'), 'project/')
  assert.equal(slash('project/'), 'project/')
})

test('cairn-config: loading fails closed on invalid JSON and an unknown schema', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cairn-config-'))
  try {
    const invalidJson = join(dir, 'invalid.json')
    writeFileSync(invalidJson, '{', 'utf8')
    assert.throws(() => loadConfig(invalidJson), /invalid JSON/)

    const future = join(dir, 'future.json')
    writeFileSync(future, JSON.stringify({ ...CAIRN_CONFIG, version: 2 }), 'utf8')
    assert.throws(() => loadConfig(future), /supported schema 1/)
  } finally {
    rmSync(dir, { recursive: true })
  }
})
