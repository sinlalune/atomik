#!/usr/bin/env node
/**
 * cairn-audit — scaffold the coherence audit record for a path.
 *
 * Removing the integrator (owner directive, 2026-08-14) removed the person who
 * noticed two paths drifting apart architecturally. The owner's answer was to
 * delegate the noticing: "it could be an automated audit from agent after each
 * rebase or merge".
 *
 * The design constraint that follows: an agent's judgment is not deterministic,
 * costs money, and needs credentials CI should not hold — so it must never be
 * the thing that fails a build. The split:
 *
 *   the AGENT produces the judgment    reads the rebased diff against bedrock,
 *                                      the ADRs, and the path's declared coverage
 *   CI checks only that it EXISTS      a deterministic gate on a
 *                                      non-deterministic activity
 *   its verdict never blocks           findings are advisory, read by a human
 *
 * This script writes the empty record, stamped with the head commit it belongs
 * to, so the check has something objective to look for. Filling it in is the
 * agent's job — an unfilled record is visible as unfilled, which is the point:
 * a missing audit and a lazy audit should not look the same.
 *
 *   node tools/cairn-audit.mjs                        # scaffold for the current branch
 *   node tools/cairn-audit.mjs --check [--base <ref>] # exit 1 if this path has none
 */

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFrontmatter } from './cairn-check.mjs'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const AUDIT_DIR = 'atomik-project/audits'
const PATH_DIR = 'atomik-project/coding-paths'

const PLACEHOLDER = 'TO BE FILLED BY THE AUDITING AGENT'

/** An audit belongs to one head commit: re-running after another rebase
 *  produces another record rather than overwriting the last one, so the
 *  history of what was checked survives. */
export function auditName(pathId, head) {
  return `${pathId.toLowerCase()}-${head.slice(0, 7)}.md`
}

export function auditTemplate({ pathId, branch, head, base }) {
  return `---
type: Atomik Coherence Audit
title: Coherence audit — ${pathId} @ ${head.slice(0, 7)}
timestamp: ${new Date().toISOString()}
atomik:
  path: ${pathId}
  branch: ${branch}
  head: ${head}
  base: ${base}
  verdict: ${PLACEHOLDER}
---

# Coherence audit — ${pathId} @ ${head.slice(0, 7)}

Run after the rebase, before the merge. ADVISORY: nothing here blocks. Its job
is to catch what no deterministic check can — two paths that each pass every
rule and still pull the architecture in different directions.

## What to read

- the rebased diff for this branch
- every bedrock page and ADR named in this path's documentation coverage
- the module area notes the diff touches
- any OTHER path currently \`running\` that declares an overlapping surface

## Findings

### Does the diff contradict an accepted decision?

${PLACEHOLDER}

### Does it duplicate something another running path is building?

${PLACEHOLDER}

### Did it introduce architecture that belongs in an ADR and has none?

${PLACEHOLDER}

### Is anything now documented in two places that will drift apart?

${PLACEHOLDER}

## Verdict

${PLACEHOLDER}

*(clean · drift noted, proceeding · needs a conversation before merge)*
`
}

/** A record counts only when the agent has actually filled it in — a missing
 *  audit and an untouched scaffold must not look the same. */
export function isFilled(text) {
  return !text.includes(PLACEHOLDER)
}

function git(args) {
  return execFileSync('git', args, { cwd: REPO, encoding: 'utf8' }).trim()
}

/** The trunk to measure this path against — the same ref cairn-check uses. */
function base() {
  const argv = process.argv
  return argv.includes('--base') ? argv[argv.indexOf('--base') + 1] : 'master'
}

/** Commits on this branch and not on the trunk. A missing or unreadable trunk
 *  ref is an ANSWER, not a crash: fall back to HEAD alone, which is the old,
 *  stricter behaviour rather than a silently wider one. */
function revListOwn(trunkRef) {
  try {
    return git(['rev-list', 'HEAD', '--not', trunkRef])
  } catch {
    return ''
  }
}

/**
 * Which commits may a record legitimately name?
 *
 * The scaffold is stamped with the head it was written for — and then COMMITTING
 * it moves the head, so the record can never name the commit that contains it.
 * `--check` therefore never matched: all nine records in this repository name a
 * different commit from the one holding them, seven of them exactly the parent
 * (audit 2026-08-24, finding F12).
 *
 * The fix is not to rename anything. A record naming HEAD **or any commit this
 * path itself contributed** is describing work this branch actually did, which is
 * what the check is for. Every existing record becomes valid without migration,
 * because that is what they were already doing accidentally.
 *
 * The bound matters: `git rev-list HEAD --not <trunk>` is exactly this path's own
 * commits. A record naming an arbitrary trunk ancestor would prove nothing about
 * this branch, and one belonging to a DIFFERENT path is refused outright — the
 * file name carries the path id, so that is checked rather than assumed.
 */
export function findAudit(files, shas, pathId) {
  const acceptable = new Set(shas.map((sha) => auditName(pathId, sha)))
  return files.find((file) => acceptable.has(file))
}

/** This path's own commits, newest first, HEAD included. Pure: it takes the
 *  `git rev-list` output rather than running Git, so the rule is testable. */
export function ownCommits(revListOutput, head) {
  const listed = String(revListOutput || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  return listed.includes(head) ? listed : [head, ...listed]
}

function currentPath(branch) {
  const dir = join(REPO, PATH_DIR)
  for (const name of readdirSync(dir).filter((f) => f.startsWith('CP-') && f.endsWith('.md'))) {
    const front = readFrontmatter(readFileSync(join(dir, name), 'utf8'))?.data?.atomik
    if (front?.branch === branch) return front
  }
  return null
}

function main() {
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'])
  const head = git(['rev-parse', 'HEAD'])
  const dir = join(REPO, AUDIT_DIR)
  mkdirSync(dir, { recursive: true })
  const existing = readdirSync(dir).filter((f) => f.endsWith('.md'))

  const front = currentPath(branch)

  if (process.argv.includes('--check')) {
    if (!front) {
      console.log(`cairn-audit — nothing to check: "${branch}" is not a path branch`)
      process.exit(0)
    }
    const candidates = ownCommits(revListOwn(base()), head)
    const found = findAudit(existing, candidates, front.id)
    if (!found) {
      console.error(
        `cairn-audit — no coherence audit for ${front.id} naming ${head.slice(0, 7)} ` +
        `or any of this path's ${candidates.length - 1} earlier commit(s). Run: npm run cairn-audit`)
      process.exit(1)
    }
    if (!isFilled(readFileSync(join(dir, found), 'utf8'))) {
      console.error(`cairn-audit — ${found} is still a scaffold; the agent has not filled it in`)
      process.exit(1)
    }
    console.log(`cairn-audit — ${found} present and filled`)
    process.exit(0)
  }

  if (!front) {
    // Not an error: an audit only has meaning on a path branch. Failing here
    // would mean the command documented in AGENTS.md exits non-zero for anyone
    // who runs it on the trunk to see what it does — the first thing a new
    // agent in an unfamiliar harness will do.
    console.log(`cairn-audit — nothing to audit: "${branch}" is not a path branch`)
    process.exit(0)
  }
  const file = join(dir, auditName(front.id, head))
  if (existsSync(file)) {
    console.log(`cairn-audit — ${auditName(front.id, head)} already exists`)
    process.exit(0)
  }
  writeFileSync(
    file,
    auditTemplate({ pathId: front.id, branch, head, base: front.base_commit ?? 'unpinned' }),
    'utf8'
  )
  console.log(`cairn-audit — scaffolded ${AUDIT_DIR}/${auditName(front.id, head)}`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
