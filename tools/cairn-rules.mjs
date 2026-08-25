#!/usr/bin/env node
/**
 * cairn-rules — generate the live rule table from tools/cairn-check.mjs
 *
 * Emits the Markdown table of blocking and advisory rules implemented in
 * cairn-check, extracting rule names directly from the code so the count
 * and descriptions cannot drift.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CHECK_FILE = join(REPO, 'tools/cairn-check.mjs')

/** The handbook carries the generated catalogue between these markers.
 *  A table written by hand is how a document comes to list rules that do not
 *  exist — the defect this generator was built for. The splice makes the
 *  regeneration one command, and the test makes the shipped table executable:
 *  a handbook that has drifted from the validator fails the build. */
export const SPEC_FILE = 'docs/cairn/handbook.md'
export const TABLE_BEGIN = '<!-- cairn:rules:begin -->'
export const TABLE_END = '<!-- cairn:rules:end -->'

export function extractRules(source) {
  const rules = []

  // Rules from evaluate(): add('blocking'|'advisory', 'rule-name', ...)
  const evalMatches = source.matchAll(/add\('(blocking|advisory)',\s*'([a-z-]+)'/g)
  for (const match of evalMatches) {
    const [, level, name] = match
    if (!rules.some((r) => r.name === name && r.level === level && r.scope === 'diff')) {
      rules.push({ name, level, scope: 'diff' })
    }
  }

  // Rules from corpusFindings(): findings.push({ level: '...', rule: '...', ... })
  const corpusMatches = source.matchAll(/level:\s*'(blocking|advisory)',\s*rule:\s*'([a-z-]+)'/g)
  for (const match of corpusMatches) {
    const [, level, name] = match
    if (!rules.some((r) => r.name === name && r.level === level && r.scope === 'corpus')) {
      rules.push({ name, level, scope: 'corpus' })
    }
  }

  return rules
}

export const RULE_METADATA = {
  'branch-identity': {
    condition: 'Detached checkout where branch cannot be identified from host or git ref',
    enforcing: "branchSource === 'detached' (blocking on guarded roots, advisory on others)"
  },
  'branch-path': {
    condition: 'Path branch not declared by a running path file, or missing base_commit',
    enforcing: "isPathBranch(branch) && (!match || !PATH_BRANCH_STATUSES.includes(status) || !isCommitPin(base))"
  },
  'registration': {
    condition: 'Path declaration tuple (id, running, branch, base) missing from trunk',
    enforcing: "pathRegistrationState() === 'missing' (blocking) or 'grandfathered' (advisory)"
  },
  'remote-checkpoint': {
    condition: 'Local path HEAD not present on upstream tracking branch',
    enforcing: "pathRemoteCheckpoint(branch).state === 'missing' | 'unpushed'"
  },
  'rebase': {
    condition: 'Path branch does not contain latest trunk tip (stale branch)',
    enforcing: "trunkContained(trunkRef) === false"
  },
  'opening-ceremony': {
    condition: 'Path declared running without an opening-check session note',
    enforcing: "!openingFor(pathId) via session frontmatter { path, ceremony: 'opening' }"
  },
  'ceremony': {
    condition: 'Path marked done without closing ceremony session note frontmatter',
    enforcing: "!ceremonyFor(pathId) via session frontmatter { path, ceremony: 'closing' }"
  },
  'single-truth': {
    condition: 'Manual edits to shared/derived statements of record',
    enforcing: "SINGLE_TRUTH.includes(file)"
  },
  'same-work-unit': {
    condition: 'Source changed without accompanying module note and coding path update',
    enforcing: "touched('apps/') => touched('docs/modules/') && touched(PATH_DIR)"
  },
  'area-note': {
    condition: 'Subsystem source changed without touching matching area module note',
    enforcing: "areaOf(file) => changed.includes(note)"
  },
  'ledger-size': {
    condition: 'A path file in the diff exceeds the ledger token budget',
    enforcing: 'changed.includes(path.file) && path.tokens > LEDGER_TOKEN_BUDGET'
  },
  'scope-drift': {
    condition: 'Changed files outside path frontmatter declared writes: patterns',
    enforcing: "!matchesAny(file, declaredWrites)"
  },
  'decision-drift': {
    condition: 'docs/bedrock changed without an ADR in the same changeset',
    enforcing: "touched('docs/bedrock/') => touched('docs/adr/')"
  },
  'derived-view': {
    condition: 'ACTIVE.md running-paths block does not match trunk path files',
    enforcing: "tools/cairn-active.mjs --check"
  },
  'path-staleness': {
    condition: 'A path declaring running whose branch has had no commit for longer than the declared window',
    enforcing: 'staleRunningPaths(corpus, branchAges(corpus)) — advisory always; an unresolvable branch reports nothing'
  },
  'coherence-audit': {
    condition: 'Path rebased HEAD lacks filled coherence audit record in atomik-project/audits/',
    enforcing: "tools/cairn-audit.mjs --check"
  },
  'schema': {
    condition: 'Path or ADR frontmatter fails parsing, or an id/status/date is outside vocabulary',
    enforcing: "pathFrontmatterErrors(front) + adrFrontmatterErrors(front, file, bodyStatus)"
  },
  'links': {
    condition: 'Relative Markdown link points to non-existent target (code fences stripped)',
    enforcing: "stripCode(text) => !existsSync(target)"
  }
}

function escapePipes(text) {
  if (typeof text !== 'string') return text
  return text.replace(/\|/g, '\\|')
}

export function generateMarkdownTable(source) {
  const rules = extractRules(source)

  // Sort blocking first, then advisory; alphabetical by name within level
  rules.sort((a, b) => {
    if (a.level !== b.level) return a.level === 'blocking' ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  let md = '| Level | Rule Name | Scope | Trigger Condition | Enforcing Logic |\n'
  md += '| :--- | :--- | :--- | :--- | :--- |\n'

  for (const r of rules) {
    const meta = RULE_METADATA[r.name] || { condition: 'TBD', enforcing: 'TBD' }
    const levelBadge = r.level === 'blocking' ? '**Blocking**' : '*Advisory*'
    const condition = escapePipes(meta.condition)
    const enforcing = escapePipes(meta.enforcing)
    md += `| ${levelBadge} | \`${r.name}\` | ${r.scope} | ${condition} | \`${enforcing}\` |\n`
  }

  return md
}

/** The text currently sitting between the markers, or null when the document
 *  carries no splice point. Pure, so the test can read the shipped file. */
export function tableIn(doc) {
  const from = doc.indexOf(TABLE_BEGIN)
  const to = doc.indexOf(TABLE_END)
  if (from === -1 || to === -1 || to < from) return null
  return doc.slice(from + TABLE_BEGIN.length, to).trim()
}

export function spliceTable(doc, table) {
  const from = doc.indexOf(TABLE_BEGIN)
  const to = doc.indexOf(TABLE_END)
  if (from === -1 || to === -1 || to < from) {
    throw new Error(`no ${TABLE_BEGIN} / ${TABLE_END} splice point in the document`)
  }
  return `${doc.slice(0, from + TABLE_BEGIN.length)}\n${table.trim()}\n${doc.slice(to)}`
}

function main() {
  const source = readFileSync(CHECK_FILE, 'utf8')
  const table = generateMarkdownTable(source)
  if (!process.argv.includes('--write')) {
    console.log(table)
    return
  }
  const specPath = join(REPO, SPEC_FILE)
  writeFileSync(specPath, spliceTable(readFileSync(specPath, 'utf8'), table), 'utf8')
  console.log(`cairn-rules — rewrote the catalogue in ${SPEC_FILE}`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
