/**
 * Tests for the derived lane list — `node --test 'tools/**\/*.test.mjs'`.
 *
 * The point of deriving this block is that the contradiction it used to be
 * exposed to becomes impossible. These cases pin the two properties that
 * claim rests on: the output depends ONLY on the path files, and it is
 * deterministic regardless of the order they are read in.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PATHS_BEGIN, PATHS_END } from './cairn-check.mjs'
import { collectPaths, renderPaths, spliceBlock } from './cairn-active.mjs'

const pathFile = (id, { status = 'running', branch, base = 'abc1234' } = {}) => ({
  name: `${id}.md`,
  text: [
    '---',
    `title: ${id} — a lane doing something`,
    'atomik:',
    `  id: ${id}`,
    `  status: ${status}`,
    `  base_commit: ${base}`,
    ...(branch ? [`  branch: ${branch}`] : []),
    '---',
    '',
    '# Goal'
  ].join('\n')
})

test('only running paths that declare a branch appear', () => {
  const running = collectPaths([
    pathFile('CP-MVP-010', { branch: 'path/cp-mvp-010' }),
    pathFile('CP-MVP-009', { status: 'done', branch: 'path/cp-mvp-009' }),
    pathFile('CP-OPS-001', { status: 'active' }),
    pathFile('CP-MVP-012', { status: 'running' }) // running but no branch
  ])
  assert.deepEqual(running.map((p) => p.id), ['CP-MVP-010'])
  assert.equal(running[0].branch, 'path/cp-mvp-010')
  assert.equal(running[0].base, 'abc1234')
})

test('output is deterministic whatever order the files are read in', () => {
  const a = pathFile('CP-MVP-010', { branch: 'path/cp-mvp-010' })
  const b = pathFile('CP-MVP-011', { branch: 'path/cp-mvp-011' })
  const forward = renderPaths(collectPaths([a, b]))
  const backward = renderPaths(collectPaths([b, a]))
  assert.equal(forward, backward)
  assert.ok(forward.indexOf('CP-MVP-010') < forward.indexOf('CP-MVP-011'))
})

test('no running paths reads as an honest empty state, never a blank block', () => {
  const rendered = renderPaths([])
  assert.ok(rendered.includes('no path running'))
  assert.ok(rendered.trim().length > 0)
})

test('splicing replaces only the marked block and keeps the prose around it', () => {
  const doc = [
    '# Active',
    '',
    '## Running lanes',
    'DERIVED — do not edit by hand.',
    PATHS_BEGIN,
    '- stale content that must vanish',
    PATHS_END,
    '',
    '## Previously',
    '- something that must survive'
  ].join('\n')
  const out = spliceBlock(doc, '- **CP-MVP-010** — x · branch `path/cp-mvp-010`')
  assert.ok(!out.includes('stale content'))
  assert.ok(out.includes('CP-MVP-010'))
  assert.ok(out.includes('DERIVED — do not edit by hand.'))
  assert.ok(out.includes('- something that must survive'))
  // and it is stable: splicing the same body twice changes nothing
  assert.equal(spliceBlock(out, '- **CP-MVP-010** — x · branch `path/cp-mvp-010`'), out)
})

test('a file without markers fails loudly rather than guessing', () => {
  assert.throws(() => spliceBlock('# no markers here\n', '- x'), /missing/)
})
