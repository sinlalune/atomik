/**
 * Tests for the coherence-audit record — run with Node's own test runner:
 *
 *   node --test tools/
 *
 * A closing audit names the exact implementation candidate. The administrative
 * closure commit contains the record without changing that subject.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  auditBindingErrors,
  auditName,
  auditTemplate,
  fillErrors,
  findAudit,
  findingsSections,
  isFilled,
  resolveAuditBranch
} from './cairn-audit.mjs'

const PATH = 'CP-MVP-010'
const HEAD = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const PARENT = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
const TRUNK = 'dddddddddddddddddddddddddddddddddddddddd'

const files = [auditName(PATH, HEAD), auditName(PATH, PARENT)]

test('the host-resolved branch overrides detached HEAD for audit checks', () => {
  assert.equal(resolveAuditBranch(['node', 'audit', '--branch', 'path/cp-mvp-010'], 'HEAD'),
    'path/cp-mvp-010')
  assert.equal(resolveAuditBranch(['node', 'audit'], 'path/local'), 'path/local')
})

test('a record naming an earlier path commit does not satisfy the exact candidate', () => {
  const onlyParent = [auditName(PATH, PARENT)]
  assert.equal(findAudit(onlyParent, HEAD, PATH), undefined)
})

test('a record naming the exact candidate satisfies the check', () => {
  assert.equal(findAudit(files, HEAD, PATH), auditName(PATH, HEAD))
})

test('a commit outside this path proves nothing', () => {
  // a trunk ancestor is not this path's work, so a record naming one is refused
  const trunkRecord = [auditName(PATH, TRUNK)]
  assert.equal(findAudit(trunkRecord, HEAD, PATH), undefined)
})

test('another path record is refused even when the sha matches', () => {
  const otherPath = [auditName('CP-MVP-011', HEAD)]
  assert.equal(findAudit(otherPath, HEAD, PATH), undefined)
  assert.equal(findAudit([], HEAD, PATH), undefined)
  assert.equal(findAudit(files, HEAD.slice(0, 7), PATH), undefined)
})

test('a record naming a pre-rebase commit the rebase rewrote is refused', () => {
  // Verified against this repository: seven of the nine existing records name a
  // commit their own branch still contains, and TWO — cp-ai-capabilities-9007e07
  // and cp-render-repairs-d44d381 — name a head the closing rebase rewrote, which
  // no branch contains any more. Declining those is correct, not a gap: `paths.md`
  // requires the audit to be run AFTER the rebase, on the result that will land.
  // An audit of a diff that no longer exists reviewed something else.
  const rewritten = 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
  assert.equal(findAudit([auditName(PATH, rewritten)], HEAD, PATH), undefined)
})

test('a record naming a valid commit but still a scaffold does not count', () => {
  const scaffold = auditTemplate({
    pathId: PATH,
    branch: 'path/cp-mvp-010',
    subjectCommit: HEAD,
    base: TRUNK
  })
  assert.equal(isFilled(scaffold), false)
  assert.ok(fillErrors(scaffold).includes('still carries the scaffold placeholder'))
})

test('the audit frontmatter must bind the exact path, branch and full candidate', () => {
  const text = auditTemplate({
    pathId: PATH,
    branch: 'path/cp-mvp-010',
    subjectCommit: HEAD,
    base: TRUNK
  })
  assert.deepEqual(auditBindingErrors(text, {
    pathId: PATH,
    branch: 'path/cp-mvp-010',
    subjectCommit: HEAD,
    baseCommit: TRUNK
  }), [])
  assert.ok(auditBindingErrors(text, {
    pathId: 'CP-OTHER',
    branch: 'path/cp-other',
    subjectCommit: PARENT
  }).length === 3)
  assert.ok(auditBindingErrors(text, {
    pathId: PATH,
    branch: 'path/cp-mvp-010',
    subjectCommit: HEAD,
    baseCommit: PARENT
  }).some((error) => error.includes('atomik.base')))
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
  subject_commit: ${HEAD}
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
