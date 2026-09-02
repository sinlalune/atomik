/**
 * Tests for the derived lane list — `node --test 'tools/**\/*.test.mjs'`.
 *
 * The point of deriving this block is that the contradiction it used to be
 * exposed to becomes impossible — once every accepted declaration has been
 * registered on the trunk. These cases pin the projection itself; the
 * separate Cairn registration rule pins the completeness of its inputs.
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

test('running, blocked and ready paths remain visible while done paths leave the live view', () => {
  const live = collectPaths([
    pathFile('CP-MVP-010', { branch: 'path/cp-mvp-010' }),
    pathFile('CP-MVP-011', { status: 'blocked', branch: 'path/cp-mvp-011' }),
    pathFile('CP-MVP-012', { status: 'ready', branch: 'path/cp-mvp-012' }),
    pathFile('CP-MVP-009', { status: 'done', branch: 'path/cp-mvp-009' }),
    pathFile('CP-OPS-001', { status: 'active' }),
    pathFile('CP-MVP-013', { status: 'running' }) // running but no branch
  ])
  assert.deepEqual(live.map((p) => p.id), ['CP-MVP-010', 'CP-MVP-011', 'CP-MVP-012'])
  assert.deepEqual(live.map((p) => p.status), ['running', 'blocked', 'ready'])
  assert.equal(live[0].branch, 'path/cp-mvp-010')
  assert.equal(live[0].base, 'abc1234')
})

test('output is deterministic whatever order the files are read in', () => {
  const a = pathFile('CP-MVP-010', { branch: 'path/cp-mvp-010' })
  const b = pathFile('CP-MVP-011', { branch: 'path/cp-mvp-011' })
  const forward = renderPaths(collectPaths([a, b]))
  const backward = renderPaths(collectPaths([b, a]))
  assert.equal(forward, backward)
  assert.ok(forward.indexOf('CP-MVP-010') < forward.indexOf('CP-MVP-011'))
})

test('no live paths reads as an honest empty state, never a blank block', () => {
  const rendered = renderPaths([])
  assert.ok(rendered.includes('no live path'))
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

/* ------------------------------------------------------------------ *
 * S08 part 1, item 3 — the derived-view rule keyed on the branch name
 *
 * `cairn-check` used to skip this projection whenever the branch matched
 * `path/*`, reasoning that a running path never hand-writes the generated
 * view. `actions/checkout` detaches, so CI's branch was `HEAD` and the check
 * ran there: CP-UI-TYPOGRAPHY S04 was green locally and red in CI on one tree
 * with one command. The exemption is gone, and these cases say why nothing
 * needs to replace it — staleness is a property of the tree, and a path branch
 * that has moved nobody's status is current for free.
 * ------------------------------------------------------------------ */

test('a path branch that has moved no status projects exactly what the trunk did', () => {
  const files = [
    pathFile('CP-MVP-010', { branch: 'path/cp-mvp-010' }),
    pathFile('CP-MVP-011', { branch: 'path/cp-mvp-011' })
  ]
  const trunk = spliceBlock(
    `${PATHS_BEGIN}\nanything\n${PATHS_END}`,
    renderPaths(collectPaths(files))
  )
  // The same files, read from a worktree checked out on one of those branches.
  assert.equal(spliceBlock(trunk, renderPaths(collectPaths(files))), trunk)
})

test('closing a path makes the view stale in whatever checkout closed it', () => {
  const running = [pathFile('CP-MVP-010', { branch: 'path/cp-mvp-010' })]
  const view = spliceBlock(`${PATHS_BEGIN}\n\n${PATHS_END}`, renderPaths(collectPaths(running)))
  assert.ok(view.includes('CP-MVP-010'))

  // Self-merge: the path is the last writer of its own `status`, so the moment
  // it sets `done` it becomes exactly the writer the old exemption assumed did
  // not exist. Nothing about the branch name changed.
  const closed = [pathFile('CP-MVP-010', { status: 'done', branch: 'path/cp-mvp-010' })]
  const regenerated = spliceBlock(view, renderPaths(collectPaths(closed)))
  assert.notEqual(regenerated, view)
  assert.ok(regenerated.includes('no live path'))
})
