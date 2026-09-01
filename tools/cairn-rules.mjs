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

/** The canonical specification carries the generated catalogue between these markers.
 *  A table written by hand is how a document comes to list rules that do not
 *  exist — the defect this generator was built for. The splice makes the
 *  regeneration one command, and the test makes the shipped table executable:
 *  a specification that has drifted from the validator fails the build. */
export const SPEC_FILE = 'docs/cairn/specification/index.md'
export const TABLE_BEGIN = '<!-- cairn:rules:begin -->'
export const TABLE_END = '<!-- cairn:rules:end -->'

export function extractRules(source) {
  const rules = []

  // Rules from evaluate(). The level is a literal —
  //     add('blocking', 'rule-name', …)
  // — or an expression that chooses between two literals, because a rule may be
  // advisory for a grandfathered path and blocking for everyone else:
  //     add(exempt ? 'advisory' : 'blocking', 'rule-name', …)
  //
  // Matching only the literal form was a silent under-report, not a gap: five
  // rules could emit advisory findings while the published catalogue said all
  // five were blocking. The test that guards the catalogue passed throughout,
  // because it compared the catalogue with this same extraction rather than with
  // the checker's behaviour.
  const evalMatches = source.matchAll(
    /add\(\s*(?:'(blocking|advisory)'|[^,]*?\?\s*'(blocking|advisory)'\s*:\s*'(blocking|advisory)')\s*,\s*'([a-z-]+)'/g
  )
  for (const match of evalMatches) {
    const [, literal, whenTrue, whenFalse, name] = match
    for (const level of [literal, whenTrue, whenFalse].filter(Boolean)) {
      if (!rules.some((r) => r.name === name && r.level === level && r.scope === 'diff')) {
        rules.push({ name, level, scope: 'diff' })
      }
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
  'route': {
    condition: 'A path declares no route, an unknown route, a lightweight route that meets a full-route trigger, a foundation surface outside documents, or a descent from full',
    enforcing: 'configured new-path default + fullRouteTriggers(writes) + foundationSurfaceViolations(writes) + routeDescent(previous, current)'
  },
  'brief-schema': {
    condition: 'The handoff brief is missing, or lacks its nine fields, its seven exact sections, or pinned governs entries',
    enforcing: 'briefErrors(front, body) over BRIEF_FIELDS and BRIEF_SECTIONS'
  },
  'redaction': {
    condition: 'A `[redacted: …]` marker names no redaction record (code spans and fences stripped first)',
    enforcing: 'redactionMarkers(stripCode(text)) => redaction record exists'
  },
  'scope-digest': {
    condition: 'The accepted definition of done moved after acceptance, or was accepted without a digest',
    enforcing: 'scopeDigest(resolveScopeSection(pathRecord, scope_ref)) === record.scope_digest'
  },
  'closure-surface': {
    condition: 'An administrative closure commit changed a path field other than status, subject_commit, current_step or resolution',
    enforcing: 'closureFieldErrors(previousFront, currentFront) over CLOSURE_MUTABLE_FIELDS'
  },
  'acceptance-drift': {
    condition: 'The trunk moved inside the path\'s declared writes: or governs: since the accepted base',
    enforcing: 'acceptanceDrift(git diff --name-only <base> <trunk>, writes, governs) — never trunk === base'
  },
  'advisory-disposition': {
    condition: 'advisory_disposition is not a structured list matching the advisories raised against the candidate',
    enforcing: 'dispositionErrors(record.advisory_disposition, raised) with set equality on rule names'
  },
  'role-collapse': {
    condition: 'One actor recorded both the opening and the closing acceptance for a path',
    enforcing: 'opening.accepted_by === closing.accepted_by (advisory: visible, never forbidden)'
  },
  'migration-debt': {
    condition: 'A path listed in the v0.2 migration exception no longer needs it',
    enforcing: 'migrationDebt(paths, V02_MIGRATION_PATHS) — a spent exception is a bypass'
  },
  'work-unit': {
    condition: 'A changed path record carries no `cairn-unit` block, or one declares an unknown type',
    enforcing: 'parseWorkUnits(record) => workUnitErrors(unit) over WORK_UNIT_TYPES'
  },
  'checkpoint-retention': {
    condition: 'A completed work unit has no retention ref in the current generation, the current generation is empty because a rewrite closed the last one, or the namespace or branch range cannot be read here and the question cannot be answered',
    enforcing: 'currentGeneration(retentionGenerations(refs), onBranch) => retainedRefs.has(refs/cairn/checkpoints/<id>/g<NN>/<n>), and unretainedCheckpoints over that generation (newest unit advisory; an unreadable namespace or range is inconclusive, an empty current generation is not)'
  },
  'provisional': {
    condition: 'A proposed candidate still contains commits marked Cairn-Provisional, or HEAD is itself provisional',
    enforcing: "git log --grep=^Cairn-Provisional: base..subject_commit (blocking on a ready path, advisory at HEAD)"
  },
  'base-parity': {
    condition: 'A path-branch run compared the working tree with HEAD instead of the branch with the trunk',
    enforcing: "resolveBase() source is 'opt-out' or 'unresolvable' while isPathBranch(branch)"
  },
  'journal-entry': {
    condition: 'A path record reaches `done` in this change and no journal entry declares that path',
    enforcing: "journalRecords(loadJournal(), id) on the transition into done; inconclusive when the journal cannot be read"
  },
  'concept-orphan': {
    condition: 'A concept note that no normative or learning text outside the wiki links to',
    enforcing: 'orphanConcepts(conceptFiles, links from documents outside the concepts folder)'
  },
  'concept-growth': {
    condition: 'A change adds concept articles; reported so vocabulary growth is a visible decision',
    enforcing: 'addedConcepts(previousRef listing, current listing), diff-scoped to the concepts folder'
  },
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
    enforcing: "pathRegistrationState() === 'missing' (blocking) or declared migration exception (advisory)"
  },
  'registration-base': {
    condition: 'Path base_commit cannot be proved to equal the registration commit parent',
    enforcing: "pathRegistrationBaseState() === 'mismatch' | null"
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
  'transition': {
    condition: 'Changed path state is not an allowed lifecycle transition, or prior state is unavailable',
    enforcing: 'transitionErrors(previous, current, onPathBranch)'
  },
  'acceptance': {
    condition: 'Ready/done path lacks exact-commit acceptance or changed implementation after acceptance',
    enforcing: 'closingAcceptanceErrors(record, pathId) + pathClosureState(path, record)'
  },
  'record-integrity': {
    condition: 'An immutable event/history record changed, or a born-sliced step no longer preserves its adding blob as a prefix',
    enforcing: 'immutableRecordMutations(previousRef) + appendOnlyStepRecordMutations(changed) + preservesAppendOnlyRecord(before, after)'
  },
  'single-truth': {
    condition: 'Manual edits to shared/derived statements of record',
    enforcing: "SINGLE_TRUTH.includes(file)"
  },
  'same-work-unit': {
    condition: 'Source changed without accompanying module note and coding path update',
    enforcing: 'touched(configured source roots) => touched(configured modules root) && touched(PATH_DIR)'
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
    condition: 'Configured architecture changed without an ADR in the same changeset',
    enforcing: 'touched(architectureRoot) => touched(decisionRoot)'
  },
  'record-date': {
    condition: 'A record this change adds carries two dates that disagree (blocking), or a date more than a day from the commit that wrote it (advisory)',
    enforcing: 'recordDateFindings(addedRecords) — filename date vs timestamp: vs the adding commit author date'
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
    condition: 'Ready path lacks a filled coherence audit bound to its exact subject_commit',
    enforcing: 'cairn-audit --check --subject path.subject_commit'
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
