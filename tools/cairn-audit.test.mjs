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
import { auditName, findAudit, isFilled, ownCommits } from './cairn-audit.mjs'

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
  assert.equal(isFilled('verdict: TO BE FILLED BY THE AUDITING AGENT'), false)
  assert.equal(isFilled('verdict: clean'), true)
})
