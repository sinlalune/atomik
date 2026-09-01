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
 *   CI checks binding + completeness   a deterministic gate on a
 *                                      non-deterministic activity
 *   its verdict is not machine-judged  findings are disposed by the acceptor
 *
 * This script writes the empty record, stamped with the exact implementation
 * candidate it reviews, so the check has something objective to look for. A
 * later administrative closure commit may contain the record without changing
 * that subject. Filling it in is the
 * agent's job — an unfilled record is visible as unfilled, which is the point:
 * a missing audit and a lazy audit should not look the same. `fillErrors()` is
 * what makes that true of a HOLLOWED-OUT record too: deleting the placeholder
 * is a deletion, not an audit (F10).
 *
 *   node tools/cairn-audit.mjs                        # scaffold for the current branch
 *   node tools/cairn-audit.mjs --check --subject <sha> [--branch path/<id>]
 */

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  AUDIT_DIR,
  METADATA_NAMESPACE,
  PATH_DIR,
  SESSION_DIR,
  readFrontmatter
} from './cairn-check.mjs'
import { REPO, metadataOf } from './cairn-config.mjs'

const PLACEHOLDER = 'TO BE FILLED BY THE AUDITING AGENT'

/** An audit belongs to one candidate commit: re-running after another rebase
 *  produces another record rather than overwriting the last one, so the
 *  history of what was checked survives. */
export function auditName(pathId, subjectCommit) {
  return `${pathId.toLowerCase()}-${subjectCommit}.md`
}

export function auditTemplate({ pathId, branch, subjectCommit, base }) {
  return `---
type: Cairn Coherence Audit
title: Coherence audit — ${pathId} @ ${subjectCommit.slice(0, 7)}
timestamp: ${new Date().toISOString()}
${METADATA_NAMESPACE}:
  path: ${pathId}
  branch: ${branch}
  subject_commit: ${subjectCommit}
  base: ${base}
  verdict: ${PLACEHOLDER}
---

# Coherence audit — ${pathId} @ ${subjectCommit.slice(0, 7)}

Run after the rebase, before acceptance. The judgement in this record is not a
machine verdict; its existence, completeness, and exact candidate binding are
mechanical closure gates. Its job is to catch what deterministic checks cannot
— two paths that each pass every rule and still pull the architecture in
different directions.

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

/**
 * The verdict vocabulary the template states, as STEMS rather than exact
 * phrases. The three outcomes are `clean`, `drift noted, proceeding` and
 * `needs a conversation before merge`; CP-OPS-001's record says *"drift noted,
 * repaired before merge"*, which names the second outcome and then says what
 * happened to it. Refusing that record would be a false verdict about a real
 * audit, and this repository's own rule is that a false verdict costs more
 * than a missed one. A record must NAME one of the three; it may qualify it.
 */
export const VERDICT_STEMS = ['clean', 'drift noted', 'needs a conversation']

/** The body of a `## <name>` section, up to the next `##` heading. */
export function sectionBody(text, name) {
  const from = text.search(new RegExp(`^## ${name}\\s*$`, 'm'))
  if (from === -1) return null
  const after = text.slice(from)
  const rest = after.slice(after.indexOf('\n') + 1)
  const to = rest.search(/^## /m)
  return to === -1 ? rest : rest.slice(0, to)
}

/** The `###` questions under `## Findings`, each with whatever was written
 *  beneath it. Pure string work, so the rule is testable without a record on
 *  disk. */
export function findingsSections(text) {
  const block = sectionBody(text, 'Findings')
  if (block === null) return []
  return block
    .split(/^### +/m)
    .slice(1)
    .map((chunk) => {
      const nl = chunk.indexOf('\n')
      return {
        heading: (nl === -1 ? chunk : chunk.slice(0, nl)).trim(),
        body: (nl === -1 ? '' : chunk.slice(nl + 1)).trim()
      }
    })
}

/**
 * Why this is more than `!text.includes(PLACEHOLDER)` (audit 2026-08-24, F10).
 *
 * The old rule measured a DELETION: remove the placeholder string and an empty
 * file passed. This is the one check whose subject is whether an agent did the
 * thinking, so a missing audit, an untouched scaffold and a hollowed-out record
 * must not all look the same.
 *
 * What it can honestly ask for is that the record NAMES an outcome from the
 * stated vocabulary and ANSWERS at least one of its own questions. It cannot
 * ask whether the answers are any good — that is the judgment the whole rule is
 * built to keep out of a deterministic gate, and it stays advisory precisely
 * because a human reads the findings.
 */
export function fillErrors(text) {
  const errors = []
  if (text.includes(PLACEHOLDER)) errors.push('still carries the scaffold placeholder')

  const verdict = String(metadataOf(readFrontmatter(text)?.data)?.verdict ?? '').trim()
  if (!verdict) errors.push('no `verdict:` in its frontmatter')
  else if (!VERDICT_STEMS.some((stem) => verdict.toLowerCase().startsWith(stem)))
    errors.push(
      `verdict "${verdict}" names none of: ${VERDICT_STEMS.join(' · ')}`)

  const answered = findingsSections(text).filter((s) => s.body !== '')
  if (answered.length === 0) errors.push('no findings section has been answered')

  return errors
}

/** A record counts only when the agent has actually filled it in — a missing
 *  audit, an untouched scaffold and a hollowed-out record must not look the
 *  same. */
export function isFilled(text) {
  return fillErrors(text).length === 0
}

function git(args) {
  return execFileSync('git', args, { cwd: REPO, encoding: 'utf8' }).trim()
}

/**
 * A closing audit is valid for exactly one candidate commit. The administrative
 * closure commit may contain this record, but it cannot widen the record's
 * subject to HEAD or to any earlier path commit.
 */
export function findAudit(files, subjectCommit, pathId) {
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(String(subjectCommit))) return undefined
  const expected = auditName(pathId, subjectCommit)
  return files.find((file) => file === expected)
}

export function auditBindingErrors(
  text,
  { pathId, subjectCommit, branch = null, baseCommit = null }
) {
  const front = metadataOf(readFrontmatter(text)?.data)
  const errors = []
  if (!front) return [`missing ${METADATA_NAMESPACE} audit frontmatter`]
  if (front.path !== pathId) errors.push(`${METADATA_NAMESPACE}.path must equal ${pathId}`)
  if (front.subject_commit !== subjectCommit) {
    errors.push(`${METADATA_NAMESPACE}.subject_commit must equal ${subjectCommit}`)
  }
  if (branch && front.branch !== branch) {
    errors.push(`${METADATA_NAMESPACE}.branch must equal ${branch}`)
  }
  if (baseCommit && front.base !== baseCommit) {
    errors.push(`${METADATA_NAMESPACE}.base must equal ${baseCommit}`)
  }
  return errors
}

/** Both conforming path-record shapes. Kept pure so the folder-born shape
 * cannot disappear from the audit command without a focused test failing. */
export function auditPathRecordFiles(entries, exists = () => true) {
  return entries
    .filter((entry) => entry.name.startsWith('CP-'))
    .map((entry) => entry.isDirectory() ? join(entry.name, 'index.md') : entry.name)
    .filter((file) => file.endsWith('.md') && exists(file))
}

function currentPath(branch) {
  const dir = join(REPO, PATH_DIR)
  const records = auditPathRecordFiles(
    readdirSync(dir, { withFileTypes: true }),
    (file) => existsSync(join(dir, file))
  )
  for (const file of records) {
    const front = metadataOf(readFrontmatter(readFileSync(join(dir, file), 'utf8'))?.data)
    if (front?.branch === branch) return front
  }
  return null
}

function closingSubject(pathId) {
  try {
    let subject = null
    for (const name of readdirSync(join(REPO, SESSION_DIR)).filter((f) => f.endsWith('.md')).sort()) {
      const data = readFrontmatter(readFileSync(join(REPO, SESSION_DIR, name), 'utf8'))?.data
      if (data?.path !== pathId || String(data?.ceremony).toLowerCase() !== 'closing') continue
      if (data?.decision !== 'accepted') continue
      if (/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(String(data?.subject_commit))) {
        subject = data.subject_commit
      }
    }
    return subject
  } catch {
    return null
  }
}

export function resolveAuditBranch(argv, gitBranch) {
  const at = argv.indexOf('--branch')
  return at === -1 ? gitBranch : argv[at + 1]
}

function main() {
  const branch = resolveAuditBranch(process.argv, git(['rev-parse', '--abbrev-ref', 'HEAD']))
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
    const explicitSubject = process.argv.includes('--subject')
      ? process.argv[process.argv.indexOf('--subject') + 1]
      : null
    const subject = explicitSubject || closingSubject(front.id)
    if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(String(subject))) {
      console.error(
        `cairn-audit — no accepted full subject_commit for ${front.id}; ` +
        'record the exact closing candidate or pass --subject <sha>')
      process.exit(1)
    }
    const found = findAudit(existing, subject, front.id)
    if (!found) {
      console.error(
        `cairn-audit — no coherence audit for ${front.id} naming exact candidate ` +
        `${subject}. Run the audit again for that candidate`)
      process.exit(1)
    }
    const text = readFileSync(join(dir, found), 'utf8')
    const invalid = [
      ...auditBindingErrors(text, {
        pathId: front.id,
        subjectCommit: subject,
        branch,
        baseCommit: front.base_commit
      }),
      ...fillErrors(text)
    ]
    if (invalid.length) {
      console.error(`cairn-audit — ${found} is not a valid completed audit: ${invalid.join('; ')}`)
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
    auditTemplate({
      pathId: front.id,
      branch,
      subjectCommit: head,
      base: front.base_commit ?? 'unpinned'
    }),
    'utf8'
  )
  console.log(`cairn-audit — scaffolded ${AUDIT_DIR}/${auditName(front.id, head)}`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
