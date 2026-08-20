#!/usr/bin/env node
/**
 * cairn-check — the Cairn protocol validator (CP-OPS-001 S04b).
 *
 * Every rule in this repository used to be enforced by an agent reading
 * Markdown and choosing to comply. That is a habit, not a process. This
 * script turns the mechanical half into something a pipeline can fail on,
 * so protocol compliance stops depending on which agent, model or human
 * produced the commit.
 *
 * Deliberately dependency-free and LLM-free: a dev who distrusts the whole
 * idea must be able to read it in one sitting and run it locally with the
 * same command CI runs.
 *
 *   node tools/cairn-check.mjs [--base <ref>] [--json]
 *
 * BLOCKING failures exit 1. ADVISORY findings are printed and never fail:
 * a declared write surface is a signal, not a lock (owner ruling 4), and a
 * validator that blocks on judgment calls gets disabled within a week.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * SHARED FILES — generated, or otherwise touched by more than one path.
 *
 * The original justification here was wrong and the owner caught it
 * (2026-08-14). It claimed these "merge cleanly into something false". Four
 * real merges were run to check:
 *
 *   two appends to the journal        -> CONFLICT, visible, trivially resolved
 *   two edits to ADJACENT table rows  -> CONFLICT, visible
 *   two edits to DISTANT table rows   -> clean merge, and CORRECT
 *   parent closed + path added        -> clean merge, CONTRADICTORY
 *
 * Only the last fails, as a CROSS-LINE contradiction (both edits individually
 * right, jointly incoherent) that any reader spots. Git handles the rest.
 *
 * The answer was therefore never a lock. It is to stop these files being
 * shared at all: ACTIVE.md is GENERATED (cairn-active), the journal is now one
 * file per entry under atomik-project/log/, and the root module note is an
 * index over per-area notes. What survives here is a warning — edit it by hand
 * and you are hand-writing something that is meant to be regenerated.
 *
 * This became load-bearing when the integrator role was removed: with every
 * path merging itself, deriving is the only thing keeping shared files
 * unshared.
 */
export const SINGLE_TRUTH = [
  'atomik-project/coding-paths/ACTIVE.md',
  'atomik-project/coding-paths/index.md',
  'atomik-project/log.md',
  'docs/modules/atomik-desktop.md',
  'docs/learning/index.md',
  'docs/diagrams/index.md'
]

/**
 * The journal records INTEGRATED work only (owner ruling 9) — a practice,
 * enforced only as ADVISORY, via SINGLE_TRUTH above.
 *
 * It was briefly blocking on the argument that a lane writing it records
 * work as integrated before it is. That argument was retracted 2026-08-14
 * under the owner's second challenge, and it deserved to be: it is circular
 * (the entry is "false" only against our own definition of the file), and
 * no untrue statement ever reaches the trunk anyway — a lane's entry becomes
 * visible exactly when it merges, at which point it is accurate. An
 * abandoned lane takes its entry with it.
 *
 * The criterion that survived, and the one to apply to any new rule:
 *
 *   A rule may fail a build when it is objectively checkable AND breaking
 *   it leaves something WRONG IN THE REPOSITORY — not merely unconventional.
 *
 * Undocumented code is wrong. A journal entry authored by the lane that did
 * the work is unconventional. Only the first blocks.
 */
export const JOURNAL = 'atomik-project/log.md'

/** The running-paths view in ACTIVE.md is DERIVED from path declarations
 *  registered on the trunk before implementation branches. Registration makes
 *  the inputs globally complete; tools/cairn-active.mjs keeps the output
 *  single-sourced. Both halves are required when there is no integrator. */
export const ACTIVE_FILE = 'atomik-project/coding-paths/ACTIVE.md'
export const PATHS_BEGIN = '<!-- cairn:paths:begin -->'
export const PATHS_END = '<!-- cairn:paths:end -->'

const PATH_DIR = 'atomik-project/coding-paths'
const PATH_STATUSES = ['draft', 'active', 'blocked', 'done', 'archived', 'running']
const SESSION_DIR = 'atomik-project/sessions'

/**
 * These paths were already running before trunk registration became a rule.
 * They cannot be made historically registered without rewriting their base;
 * keep the migration finite and named instead of adding a general bypass.
 */
export const LEGACY_UNREGISTERED_PATHS = new Set([
  'CP-OPS-001',
  'CP-MVP-011',
  'CP-MVP-012'
])

/* ------------------------------------------------------------------ *
 * pure helpers — everything below takes data, so it is testable
 * ------------------------------------------------------------------ */

/** Frontmatter is either YAML-ish or a JSON object (bedrock pages use JSON).
 *  We only need a few scalar keys, so this stays a line reader rather than a
 *  YAML dependency — and it reports what it could not parse instead of
 *  guessing. */
export function readFrontmatter(text) {
  if (!text.startsWith('---\n')) return null
  const end = text.indexOf('\n---', 4)
  if (end === -1) return null
  const raw = text.slice(4, end)
  if (raw.trimStart().startsWith('{')) {
    try {
      return { kind: 'json', data: JSON.parse(raw) }
    } catch {
      return { kind: 'json', data: null, error: 'unparseable JSON frontmatter' }
    }
  }
  const data = {}
  let section = null
  for (const line of raw.split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue
    const indented = /^\s/.test(line)
    const match = line.match(/^\s*([A-Za-z_][\w-]*)\s*:\s*(.*)$/)
    if (!match) continue
    const [, key, value] = match
    if (!indented) {
      section = value.trim() === '' ? key : null
      if (section) data[key] = {}
      else data[key] = value.trim()
    } else if (section) {
      data[section][key] = value.trim()
    }
  }
  return { kind: 'yaml', data }
}

export function isCommitPin(value) {
  return typeof value === 'string' && /^[0-9a-f]{7,40}$/i.test(value)
}

/** The stable identity tuple that must already exist on the trunk before a
 * path starts implementation. The evolving ledger stays on the path branch;
 * status, branch and base are the small global registration projection. */
export function registrationMatches(text, id, branch, baseCommit) {
  const front = readFrontmatter(text)?.data?.atomik
  return Boolean(
    front &&
    front.id === id &&
    front.status === 'running' &&
    front.branch === branch &&
    isCommitPin(baseCommit) &&
    front.base_commit === baseCommit
  )
}

export function pathFrontmatterErrors(front) {
  if (!front) return ['missing atomik: frontmatter block']
  const errors = []
  if (!front.id) errors.push('missing atomik.id')
  if (!PATH_STATUSES.includes(front.status)) {
    errors.push(`status "${front.status}" is outside the vocabulary (${PATH_STATUSES.join(' | ')})`)
  }
  if (front.status === 'running' && !front.branch) {
    errors.push('status "running" requires atomik.branch')
  }
  if (front.status === 'running' && !isCommitPin(front.base_commit)) {
    errors.push('status "running" requires atomik.base_commit as a 7–40 digit Git hash')
  }
  return errors
}

/** A path branch is `path/<id>`; everything else (master, a bootstrap branch)
 *  is trunk work and skips the path-only rules. Renamed from `lane/` when the
 *  owner removed the integrator and made coding paths the unit of parallelism
 *  directly — there is no lane layer above a path any more. */
export function isPathBranch(branch) {
  return typeof branch === 'string' && /^path\/[a-z0-9][a-z0-9._/-]*$/.test(branch)
}

/** Minimal glob: `**` spans separators, `*` does not. Enough for the
 *  `writes:` surfaces people actually declare, and small enough to trust. */
export function globToRegExp(pattern) {
  let out = ''
  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i]
    if (char === '*') {
      if (pattern[i + 1] === '*') {
        out += '.*'
        i += 1
        if (pattern[i + 1] === '/') i += 1
      } else {
        out += '[^/]*'
      }
    } else if ('\\^$+?.()|{}[]'.includes(char)) {
      out += `\\${char}`
    } else {
      out += char
    }
  }
  return new RegExp(`^${out}$`)
}

export function matchesAny(file, patterns) {
  return patterns.some((pattern) => globToRegExp(pattern).test(file))
}

/** The paths in `git status --porcelain` output.
 *
 *  The status field is TWO columns and a space, so the path starts at index
 *  3 — which is why the raw stdout must NOT be trimmed first. Trimming eats
 *  the leading space of an UNSTAGED line (`" M path"`) and `slice(3)` then
 *  eats the path's own first character: found on CP-MVP-010 S01, where
 *  scope-drift reported `tomik-project/coding-paths/CP-MVP-010.md` and the
 *  missing `a` also defeated the `startsWith(PATH_DIR)` exemption. Every
 *  rule downstream reads this list, blocking ones included.
 *
 *  A rename line carries `old -> new`; the NEW path is the changed one. */
export function porcelainPaths(raw) {
  return raw
    .split('\n')
    .filter((line) => line.length > 3)
    .map((line) => {
      const entry = line.slice(3).trim()
      const arrow = entry.indexOf(' -> ')
      return arrow === -1 ? entry : entry.slice(arrow + 4)
    })
    .filter(Boolean)
}

/** Which module area note a source file belongs to. Used ADVISORY only:
 *  the map is a judgment call and a wrong blocking verdict would teach
 *  people to bypass the validator. */
export const AREA_MAP = [
  [/^apps\/desktop\/(shared\/graph-core|electron-main\/graph-index)|relations/, 'graph'],
  [/^apps\/desktop\/renderer\/src\/editor\//, 'editor'],
  [/^apps\/desktop\/(electron-main\/(capture|pdf|web|transcription|whisper|ocr|mistral-ocr|scan-filter|reader-worker)|renderer\/src\/(source|web|import)\/)/, 'sources'],
  [/^apps\/desktop\/electron-main\/(ai-|generation|mistral-generation|action-trace|truth|web-provenance)/, 'ai'],
  [/^apps\/desktop\/(shared\/retrieval-core|electron-main\/(vault|search|retrieval|project|folder-index)|renderer\/src\/(vault|project)\/)/, 'vault'],
  [/^apps\/desktop\//, 'shell']
]

/**
 * Documentation here ILLUSTRATES file layouts constantly — a bedrock page
 * drawing a vault's `extracted.md` beside `original.pdf` is not a broken
 * link, it is a picture of somebody else's folder. Fenced blocks and inline
 * code spans are stripped before any link is judged, because the first
 * version of this check flagged 34 such examples and a validator that cries
 * wolf is a validator people switch off.
 */
export function stripCode(text) {
  return text
    .replace(/^```[\s\S]*?^```/gm, '')
    .replace(/`[^`\n]*`/g, '')
}

export function areaOf(file) {
  for (const [pattern, area] of AREA_MAP) if (pattern.test(file)) return area
  return null
}

/**
 * The rules, as data. `changed` is the list of repo-relative paths in the
 * diff; `paths` is the parsed coding-path corpus; `branch` is the current
 * branch name.
 */
export function evaluate({
  changed,
  branch,
  paths,
  resolveFile,
  trunkContained,
  registrationState,
  ceremonyFor
}) {
  const findings = []
  const add = (level, rule, message) => findings.push({ level, rule, message })
  const touched = (prefix) => changed.filter((file) => file.startsWith(prefix))
  const onPath = isPathBranch(branch)
  const match = paths.find((p) => p.front?.branch === branch)

  // 1. branch → path -------------------------------------------------
  if (onPath) {
    if (!match) {
      add('blocking', 'branch-path',
        `branch "${branch}" has no coding path declaring it (expected a file in ${PATH_DIR}/ with atomik.branch: ${branch})`)
    } else if (match.front.status !== 'running') {
      add('blocking', 'branch-path',
        `${match.file} declares this branch but its status is "${match.front.status}" — a path being worked must be "running"`)
    } else if (!isCommitPin(match.front.base_commit)) {
      add('blocking', 'branch-path', `${match.file} needs atomik.base_commit as a 7–40 digit Git hash`)
    }
  }

  // 2. trunk registration --------------------------------------------
  // ACTIVE.md is a projection of path files ON THE TRUNK. A path file
  // created only on its own branch is invisible to the trunk and to every
  // sibling branch, so the projection can be internally current and globally
  // false. New paths land a registration-only trunk commit before branching.
  if (onPath && match) {
    if (registrationState === 'missing') {
      add('blocking', 'registration',
        `${match.file} is not registered as running on the trunk — land the accepted path declaration and regenerate ACTIVE.md before implementation`)
    } else if (registrationState === 'grandfathered') {
      add('advisory', 'registration',
        `${match.front.id} predates trunk registration and is explicitly grandfathered — do not copy this exception to a new path`)
    }
  }

  // 3. the rebase gate (owner directive: "the rebase need should be an
  //    automated gate"). Every path merges ITSELF, so nothing else stops a
  //    stale branch from landing on a trunk it never saw. Objective, and one
  //    command fixes it — it serializes the MERGE, never the WORK.
  if (onPath && trunkContained === false) {
    add('blocking', 'rebase',
      `branch "${branch}" does not contain the trunk tip — rebase before merging, and let CI run on the REBASED result, not a stale branch`)
  }

  // 4. the closing ceremony is the only human guard left once the integrator
  //    is gone, so a path claiming done must show its session note.
  //
  //    Scoped to paths touched by THIS change, deliberately. Checking the whole
  //    corpus would fail on the early paths that closed before session notes
  //    were a rule — punishing history for a convention it predates is the
  //    fastest way to get a check switched off. The rule is about the
  //    TRANSITION to done, which is always part of the change that makes it.
  if (ceremonyFor) {
    for (const path of paths) {
      if (path.front?.status !== 'done' || !changed.includes(path.file)) continue
      if (!ceremonyFor(path.front.id)) {
        add('blocking', 'ceremony',
          `${path.file} is marked done with no session note naming ${path.front.id} — closing a path without a recorded ceremony is invalid`)
      }
    }
  }

  // 4. statements of record — nearly all of these are GENERATED now, so this
  //    only fires on the few that are still hand-written.
  if (onPath) {
    for (const file of changed) {
      if (SINGLE_TRUTH.includes(file)) {
        add('advisory', 'single-truth',
          `${file} is generated or shared — regenerate it (npm run cairn-active) rather than editing it by hand, or say in the ledger why this edit is deliberate.`)
      }
    }
  }

  // 3. same work unit -------------------------------------------------
  const sourceChanged = touched('apps/').filter((f) => !f.includes('/tests/'))
  if (sourceChanged.length > 0) {
    if (touched('docs/modules/').length === 0) {
      add('blocking', 'same-work-unit',
        'source changed but no module note did — code, tests, docs and the ledger land in ONE work unit (bedrock 22 step 9)')
    }
    if (touched(`${PATH_DIR}/`).length === 0) {
      add('blocking', 'same-work-unit',
        'source changed but no coding path did — every executed step updates its Work Ledger in the same unit')
    }
    // area precision is advisory: the map is a judgment call
    const areas = new Set(sourceChanged.map(areaOf).filter(Boolean))
    for (const area of areas) {
      const note = `docs/modules/atomik-desktop-${area}.md`
      if (resolveFile(note) && !changed.includes(note)) {
        add('advisory', 'area-note',
          `${area} source changed but ${note} did not — is the contract still accurate?`)
      }
    }
  }

  // 5. declared scope drift (advisory — a signal, never a lock) --------
  if (onPath) {
    const declared = match?.writes ?? []
    if (declared.length > 0) {
      const drift = changed.filter(
        (file) => !matchesAny(file, declared) && !file.startsWith(`${PATH_DIR}/`)
      )
      if (drift.length > 0) {
        add('advisory', 'scope-drift',
          `${drift.length} file(s) outside the declared writes: ${drift.slice(0, 6).join(', ')}${drift.length > 6 ? ' …' : ''} — record the widening in the ledger; a root cause is discovered, not declared`)
      }
    }
  }

  // 6. decision drift (advisory) --------------------------------------
  if (touched('docs/bedrock/').length > 0 && touched('docs/adr/').length === 0) {
    add('advisory', 'decision-drift',
      'the constitution changed with no ADR in the same change — architecture decisions live in docs/adr/')
  }

  return findings
}

/* ------------------------------------------------------------------ *
 * repository readers — the impure half
 * ------------------------------------------------------------------ */

function git(args) {
  return execFileSync('git', args, { cwd: REPO, encoding: 'utf8' }).trim()
}

/** Raw stdout — for output whose LEADING whitespace is data, not padding. */
function gitRaw(args) {
  return execFileSync('git', args, { cwd: REPO, encoding: 'utf8' })
}

function changedFiles(base) {
  const working = porcelainPaths(gitRaw(['status', '--porcelain']))
  if (base) {
    const merge = git(['merge-base', base, 'HEAD'])
    const committed = git(['diff', '--name-only', `${merge}..HEAD`]).split('\n')
    return [...new Set([...committed, ...working].filter(Boolean))]
  }
  return working
}

function walk(dir, out = []) {
  for (const entry of readdirSync(join(REPO, dir))) {
    const rel = `${dir}/${entry}`
    if (entry === 'node_modules' || entry === '.git' || entry === 'out') continue
    if (statSync(join(REPO, rel)).isDirectory()) walk(rel, out)
    else out.push(rel)
  }
  return out
}

/**
 * Does this branch already contain the trunk tip? `null` when the trunk ref
 * cannot be resolved (a fresh clone, a detached CI checkout) — unknown must
 * never read as "stale", or the gate fails for reasons the author cannot fix.
 */
function trunkContained(trunkRef) {
  try {
    const tip = execFileSync('git', ['rev-parse', trunkRef], { cwd: REPO, encoding: 'utf8' }).trim()
    const merge = execFileSync('git', ['merge-base', tip, 'HEAD'], { cwd: REPO, encoding: 'utf8' }).trim()
    return merge === tip
  } catch {
    return null
  }
}

/**
 * The global running-path view is only as complete as the path declarations
 * already present on the trunk. `null` means the trunk ref is unavailable;
 * that must not become a false failure in a detached or partial checkout.
 */
function pathRegistrationState(trunkRef, branch, paths) {
  if (!isPathBranch(branch)) return null
  const match = paths.find((path) => path.front?.branch === branch)
  const id = match?.front?.id
  if (!match || !id) return null
  if (LEGACY_UNREGISTERED_PATHS.has(id)) return 'grandfathered'

  try {
    git(['rev-parse', '--verify', trunkRef])
  } catch {
    return null
  }

  try {
    const text = execFileSync('git', ['show', `${trunkRef}:${match.file}`], {
      cwd: REPO,
      encoding: 'utf8'
    })
    return registrationMatches(text, id, branch, match.front.base_commit) ? 'registered' : 'missing'
  } catch {
    return 'missing'
  }
}

/** A closing ceremony leaves a session note naming the path. */
function hasCeremony(pathId) {
  try {
    const id = pathId.toLowerCase()
    return readdirSync(join(REPO, SESSION_DIR)).some(
      (file) => file.toLowerCase().includes(id) && file.endsWith('.md')
    )
  } catch {
    return false
  }
}

function loadPaths() {
  if (!existsSync(join(REPO, PATH_DIR))) return []
  return readdirSync(join(REPO, PATH_DIR))
    .filter((file) => file.startsWith('CP-') && file.endsWith('.md'))
    .map((file) => {
      const rel = `${PATH_DIR}/${file}`
      const text = readFileSync(join(REPO, rel), 'utf8')
      const parsed = readFrontmatter(text)
      const front = parsed?.data?.atomik ?? null
      // `writes:` is a YAML list, which the scalar reader above skips
      const writes = []
      const block = text.match(/\n\s*writes:\s*\n((?:\s*-\s*\S.*\n)+)/)
      if (block) {
        for (const line of block[1].split('\n')) {
          const item = line.match(/^\s*-\s*(\S.*?)\s*$/)
          if (item) writes.push(item[1])
        }
      }
      return { file: rel, front, writes, parseError: parsed?.error ?? null }
    })
}

/** Schema + link integrity over the whole corpus, not just the diff: these
 *  are cheap and catching them late is the expensive part. */
function corpusFindings(branch) {
  const findings = []

  // The derived running-paths view must match the path files it projects.
  // Objective, no judgment, one-command fix. Skipped on path branches, which
  // legitimately carry a stale copy because they never hand-write ACTIVE.md.
  if (!isPathBranch(branch)) {
    try {
      execFileSync('node', [join(REPO, 'tools/cairn-active.mjs'), '--check'], {
        cwd: REPO,
        stdio: 'pipe'
      })
    } catch {
      findings.push({
        level: 'blocking',
        rule: 'derived-view',
        message: `${ACTIVE_FILE}: the derived running-paths view is stale — run \`npm run cairn-active\``
      })
    }
  }

  // The coherence audit replaces the integrator's eye on architectural drift.
  // ADVISORY by construction: an agent's judgment is not deterministic, so CI
  // may check that the record EXISTS but must never depend on its verdict.
  if (isPathBranch(branch)) {
    try {
      execFileSync('node', [join(REPO, 'tools/cairn-audit.mjs'), '--check'], {
        cwd: REPO,
        stdio: 'pipe'
      })
    } catch {
      findings.push({
        level: 'advisory',
        rule: 'coherence-audit',
        message: 'no filled coherence audit for this head — run `npm run cairn-audit` after the rebase, before merging'
      })
    }
  }

  for (const path of loadPaths()) {
    if (path.parseError) {
      findings.push({ level: 'blocking', rule: 'schema', message: `${path.file}: ${path.parseError}` })
      continue
    }
    for (const error of pathFrontmatterErrors(path.front)) {
      findings.push({
        level: 'blocking',
        rule: 'schema',
        message: `${path.file}: ${error}`
      })
    }
  }

  // Two documented exemptions, each for a reason that would otherwise make
  // the check wrong rather than strict:
  //   docs/fixtures/  — sample documents PORTRAYING another vault; their
  //                     links point into that imaginary vault by design
  //   log.md          — an append-only historical narrative; its links
  //                     describe past states and must never be rewritten
  const linkExempt = (file) => file.startsWith('docs/fixtures/') || file === JOURNAL
  const docs = [
    ...walk('docs').filter((f) => f.endsWith('.md')),
    ...walk('atomik-project').filter((f) => f.endsWith('.md'))
  ].filter((f) => !linkExempt(f))
  for (const doc of docs) {
    const text = stripCode(readFileSync(join(REPO, doc), 'utf8'))
    for (const match of text.matchAll(/\[[^\]]*\]\((\.[^)#\s]+)(?:#[^)\s]*)?\)/g)) {
      const target = resolve(REPO, dirname(doc), match[1].replace(/\\/g, ''))
      if (!existsSync(target)) {
        findings.push({
          level: 'blocking',
          rule: 'links',
          message: `${doc}: broken relative link → ${match[1]}`
        })
      }
    }
  }
  return findings
}

function main() {
  const argv = process.argv.slice(2)
  const base = argv.includes('--base') ? argv[argv.indexOf('--base') + 1] : null
  const asJson = argv.includes('--json')

  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'])
  const changed = changedFiles(base)
  const paths = loadPaths()
  const trunkRef = base ?? 'master'
  const findings = [
    ...corpusFindings(branch),
    ...evaluate({
      changed,
      branch,
      paths,
      resolveFile: (file) => existsSync(join(REPO, file)),
      trunkContained: trunkContained(trunkRef),
      registrationState: pathRegistrationState(trunkRef, branch, paths),
      ceremonyFor: hasCeremony
    })
  ]

  const blocking = findings.filter((f) => f.level === 'blocking')
  const advisory = findings.filter((f) => f.level === 'advisory')

  if (asJson) {
    console.log(JSON.stringify({ branch, changed: changed.length, findings }, null, 2))
  } else {
    console.log(`cairn-check — branch ${branch}, ${changed.length} changed file(s)`)
    for (const group of [
      ['BLOCKING', blocking],
      ['ADVISORY', advisory]
    ]) {
      const [label, list] = group
      if (list.length === 0) continue
      console.log(`\n${label}`)
      for (const finding of list) console.log(`  [${finding.rule}] ${finding.message}`)
    }
    console.log(
      blocking.length === 0
        ? `\nOK — protocol satisfied${advisory.length ? ` (${advisory.length} advisory)` : ''}`
        : `\nFAILED — ${blocking.length} blocking finding(s)`
    )
  }
  process.exit(blocking.length === 0 ? 0 : 1)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
