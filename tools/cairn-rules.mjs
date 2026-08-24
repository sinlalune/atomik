#!/usr/bin/env node
/**
 * cairn-rules — generate the live rule table from tools/cairn-check.mjs
 *
 * Emits the Markdown table of blocking and advisory rules implemented in
 * cairn-check, extracting rule names directly from the code so the count
 * and descriptions cannot drift.
 */

import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CHECK_FILE = join(REPO, 'tools/cairn-check.mjs')

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
  'coherence-audit': {
    condition: 'Path rebased HEAD lacks filled coherence audit record in atomik-project/audits/',
    enforcing: "tools/cairn-audit.mjs --check"
  },
  'schema': {
    condition: 'Path frontmatter fails YAML/JSON parsing or status outside vocabulary',
    enforcing: "pathFrontmatterErrors(front)"
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

function main() {
  const source = readFileSync(CHECK_FILE, 'utf8')
  console.log(generateMarkdownTable(source))
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
