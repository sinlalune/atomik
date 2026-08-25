/**
 * Tests for the coherence-audit record — run with Node's own test runner:
 *
 *   node --test tools/
 *
 * F12: the scaffold is stamped with the head it was written for, and committing
 * it moves the head — so `--check` could never match the commit that contains
 * the record. All nine records in this repository name a different commit from
 * the one holding them, seven of them exactly the parent.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  auditName,
  auditTemplate,
  fillErrors,
  findAudit,
  findingsSections,
  isFilled,
  ownCommits
} from './cairn-audit.mjs'

const PATH = 'CP-MVP-010'
const HEAD = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const PARENT = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
const OLDER = 'cccccccccccccccccccccccccccccccccccccccc'
const TRUNK = 'dddddddddddddddddddddddddddddddddddddddd'

const own = ownCommits([HEAD, PARENT, OLDER].join('\n'), HEAD)
const files = own.map((sha) => auditName(PATH, sha))

test('a record naming the PARENT satisfies the check', () => {
  // the shape all nine existing records already have — retroactively valid,
  // with no renaming and no migration
  const onlyParent = [auditName(PATH, PARENT)]
  assert.equal(findAudit(onlyParent, own, PATH), auditName(PATH, PARENT))
})

test('a record naming HEAD itself still satisfies the check', () => {
  assert.equal(findAudit(files, own, PATH), auditName(PATH, HEAD))
})

test('a commit outside this path proves nothing', () => {
  // a trunk ancestor is not this path's work, so a record naming one is refused
  const trunkRecord = [auditName(PATH, TRUNK)]
  assert.equal(findAudit(trunkRecord, own, PATH), undefined)
})

test('another path record is refused even when the sha matches', () => {
  const otherPath = [auditName('CP-MVP-011', PARENT)]
  assert.equal(findAudit(otherPath, own, PATH), undefined)
  assert.equal(findAudit([], own, PATH), undefined)
})

test('ownCommits includes HEAD exactly once', () => {
  assert.deepEqual(ownCommits(`${HEAD}\n${PARENT}`, HEAD), [HEAD, PARENT])
  // an empty rev-list (unreadable trunk ref) falls back to HEAD alone —
  // the old, stricter behaviour rather than a silently wider one
  assert.deepEqual(ownCommits('', HEAD), [HEAD])
  assert.deepEqual(ownCommits(`  ${PARENT}  \n\n`, HEAD), [HEAD, PARENT])
})

test('a record naming a pre-rebase commit the rebase rewrote is refused', () => {
  // Verified against this repository: seven of the nine existing records name a
  // commit their own branch still contains, and TWO — cp-ai-capabilities-9007e07
  // and cp-render-repairs-d44d381 — name a head the closing rebase rewrote, which
  // no branch contains any more. Declining those is correct, not a gap: `paths.md`
  // requires the audit to be run AFTER the rebase, on the result that will land.
  // An audit of a diff that no longer exists reviewed something else.
  const rewritten = 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
  assert.equal(findAudit([auditName(PATH, rewritten)], own, PATH), undefined)
})

test('a record naming a valid commit but still a scaffold does not count', () => {
  const scaffold = auditTemplate({
    pathId: PATH,
    branch: 'path/cp-mvp-010',
    head: HEAD,
    base: TRUNK
  })
  assert.equal(isFilled(scaffold), false)
  assert.ok(fillErrors(scaffold).includes('still carries the scaffold placeholder'))
})

// ---------------------------------------------------------------------------
// F10 — "filled" used to mean "the placeholder string is absent", which
// measured a DELETION rather than an audit. A missing record, an untouched
// scaffold and a hollowed-out one must not look the same.
// ---------------------------------------------------------------------------

/** A record with the shape the template produces, parameterised where the
 *  rule looks. */
function record({ verdict = 'clean', answers = ['No.', '', '', ''] } = {}) {
  const questions = [
    'Does the diff contradict an accepted decision?',
    'Does it duplicate something another running path is building?',
    'Did it introduce architecture that belongs in an ADR and has none?',
    'Is anything now documented in two places that will drift apart?'
  ]
  return `---
type: Atomik Coherence Audit
title: Coherence audit — ${PATH}
timestamp: 2026-08-25T00:00:00.000Z
atomik:
  path: ${PATH}
  branch: path/cp-mvp-010
  head: ${HEAD}
  base: ${TRUNK}
  verdict: ${verdict}
---

# Coherence audit

## What to read

- the rebased diff for this branch

## Findings

${questions.map((q, i) => `### ${q}\n\n${answers[i]}\n`).join('\n')}
## Verdict

**${verdict}**
`
}

test('a hollowed-out record — placeholder deleted, nothing written — does not count', () => {
  const hollow = record({ answers: ['', '', '', ''] })
  assert.ok(!hollow.includes('TO BE FILLED BY THE AUDITING AGENT'))
  assert.equal(isFilled(hollow), false)
  assert.deepEqual(fillErrors(hollow), ['no findings section has been answered'])
  // one answered question is enough: the rule asks whether the agent answered
  // its own questions, never whether the answers are any good
  assert.equal(isFilled(record()), true)
})

test('the verdict must name an outcome from the stated vocabulary', () => {
  assert.equal(isFilled(record({ verdict: 'looks fine to me' })), false)
  assert.equal(isFilled(record({ verdict: '' })), false)
  assert.deepEqual(fillErrors(record({ verdict: '' })), ['no `verdict:` in its frontmatter'])
  for (const stated of ['clean', 'drift noted, proceeding', 'needs a conversation before merge'])
    assert.equal(isFilled(record({ verdict: stated })), true, stated)
})

test('a verdict may QUALIFY one of the three, because a real record does', () => {
  // CP-OPS-001's audit says "drift noted, repaired before merge" — it names the
  // second outcome and then says what happened to it. Refusing a substantive
  // record over a suffix would be exactly the false verdict this repository
  // says costs more than a missed one.
  assert.equal(isFilled(record({ verdict: 'drift noted, repaired before merge' })), true)
  assert.equal(isFilled(record({ verdict: 'Clean' })), true)
})

test('findingsSections reads only the Findings block', () => {
  const sections = findingsSections(record({ answers: ['No.', 'No.', 'No.', 'No.'] }))
  assert.equal(sections.length, 4)
  assert.equal(sections[0].heading, 'Does the diff contradict an accepted decision?')
  assert.equal(sections[0].body, 'No.')
  // the `## Verdict` heading ends the block; its prose is not a finding
  assert.ok(!sections.some((s) => s.body.includes('**No.**')))
  assert.deepEqual(findingsSections('# a record with no Findings section at all'), [])
})
