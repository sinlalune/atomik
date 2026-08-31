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
 *   node tools/cairn-check.mjs [--base <ref>] [--previous <ref>] [--json]
 *
 * BLOCKING failures exit 1. ADVISORY findings are printed and never fail:
 * a declared write surface is a signal, not a lock (owner ruling 4), and a
 * validator that blocks on judgment calls gets disabled within a week.
 */

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
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
/** ADR-017: `archived` is the single terminal state and the exit for an
 *  abandoned path too, so `active` is gone. It was accepted here and rejected
 *  by PATH_BRANCH_STATUSES, which meant a path declaring it passed `schema`
 *  and then failed `branch-path` with a message about a different problem
 *  (audit 2026-08-24, F11). Its reservation for CP-OPS-001 was spent when that
 *  path reached `done`, and no path file declares it — this deletes dead
 *  vocabulary rather than migrating anything. */
const PATH_STATUSES = ['draft', 'blocked', 'running', 'ready', 'done', 'archived']
const PATH_BRANCH_STATUSES = ['running', 'blocked', 'ready']
const CLOSED_STATUSES = ['ready', 'done']
const PATH_RESOLUTIONS = ['completed', 'abandoned', 'superseded']
const SESSION_DIR = 'atomik-project/sessions'
const HISTORY_DIR = `${PATH_DIR}/history`
const ADR_DIR = 'docs/adr'
const ADR_STATUSES = ['proposed', 'accepted', 'superseded', 'rejected']

/**
 * A path file is MANDATORY reading for whoever resumes that path, and it grows
 * monotonically: every step appends. The entry chain a resuming agent must read
 * before opening any path file at all — AGENTS.md, paths.md, ACTIVE.md, bedrock
 * 22 and 00 — costs about 9.3 k tokens (audit 2026-08-24, F4). A single path
 * file that costs more than the entire entry chain has stopped being a ledger
 * and become an archive, so that is the budget.
 *
 * Advisory, and scoped to the diff. A corpus sweep would report the same four
 * historical files on every run for months, and a check that cries wolf is a
 * check people switch off (`paths.md`). This one speaks to the person already
 * editing the file, who is the only one who can act on it.
 */
export const LEDGER_TOKEN_BUDGET = 10_000

/**
 * ADR-012's first open hole was two things: an abandoned path had no terminal
 * transition, and nothing noticed it needed one. ADR-017 supplies the
 * transition (`running → archived`, no new vocabulary) and this is the notice.
 *
 * ADVISORY, permanently. A slow path is not a wrong path — one can be parked
 * for a fortnight while its owner ships something else — and a build that
 * failed for it would teach people to lie about status rather than to archive.
 * The window is a declared property of a REPOSITORY, not a truth about
 * software, the same shape enforcement tiers took in ADR-016 §3; it becomes
 * configurable when `cairn.config.json` lands.
 */
export const PATH_STALE_DAYS = 14

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

/**
 * Paths whose opening check was recorded BEFORE ceremonies were declared in
 * frontmatter, and whose session notes live on their own branches where this
 * checkout may not write (one writer per working tree).
 *
 * Both have a real opening-check note; neither declares it yet. Blocking them
 * would fail an in-flight path for a convention that postdates its ceremony —
 * the exact "punishing history" failure that gets a validator switched off. The
 * set is finite and named, it drains when those two paths merge, and any path in
 * it clears itself by adding two keys to the note it already has.
 */
export const LEGACY_UNDECLARED_OPENINGS = new Set(['CP-MVP-011', 'CP-MVP-012'])

/**
 * A work unit declares what kind of change it is, and the kind fixes which
 * parts had to move together. The untyped rule demanded a module note from a
 * documentation fix, and what that teaches a writer — person or agent — is to
 * produce an empty documentation delta until the gate goes quiet.
 */
/**
 * Paths whose records predate the v0.2 record rules.
 *
 * `scope_digest` is the load-bearing case: an opening acceptance is an
 * immutable session record, so a path opened before digests existed can never
 * acquire one. Blocking it would fail an in-flight path for a convention that
 * postdates its own ceremony — the failure that gets a validator switched off.
 *
 * `CP-MVP-008` is the other case, and a stronger one. It closed on 2026-08-04,
 * ran entirely ON THE TRUNK, and predates path branches, candidate-bound closure
 * and the v0.2 acceptance schema together. There is no candidate commit to name
 * because the protocol it ran under had no such object: `git log --merges` shows
 * no merge for it, only linear trunk commits. Its acceptance IS recorded, in
 * `sessions/2026-08-04-cp-mvp-008-acceptance.md`, with the owner's ruling
 * quoted — what is missing is a schema that did not exist yet, not a decision.
 *
 * Supplying `accepted_by`, `accepted_at`, `scope_ref` and `advisory_disposition`
 * by hand would manufacture a structured signature from an unstructured record.
 * The exception says the record predates the schema; inventing the fields would
 * say someone signed a form nobody wrote.
 *
 * The set is finite, named, and cannot outlive the migration: `migrationDebt`
 * below reports a listed path that no longer needs the exception, so the
 * exception is deleted by a failing gate rather than by anyone remembering.
 */
export const ROUTES = ['lightweight', 'full', 'foundation']

/** The files that evaluate the protocol. A writer who can change all of these
 *  can weaken the mechanism that judges the same change, which is why touching
 *  them is a full-route trigger rather than a matter of taste. */
export const CONTROL_PLANE = [
  'tools/cairn-',
  '.github/workflows/cairn.yml',
  'cairn.config.json'
]

/** Where accepted doctrine and decisions live. */
export const DECISION_PLANE = ['docs/bedrock/', 'docs/adr/']

/** A foundation path's work units are documents, so its write surface is
 *  documents plus the draft path records it produces — and nothing else. */
export const FOUNDATION_SURFACE = [/^docs\//, /^project\//, /^atomik-project\/coding-paths\//]

export const V02_MIGRATION_PATHS = new Set(['CP-OPS-002', 'CP-MVP-008'])

/** An exception that has served its purpose is a bypass. A listed path that is
 *  archived, or that now carries what the exception excused, must leave the
 *  set — and the gate says so rather than waiting to be noticed. */
export function migrationDebt(paths, exempt = V02_MIGRATION_PATHS) {
  const live = new Map(paths.map((path) => [String(path.front?.id ?? ''), path]))
  const stale = []
  for (const id of exempt) {
    const path = live.get(id)
    if (!path) {
      stale.push(`${id} is listed in V02_MIGRATION_PATHS but no longer exists — delete the entry`)
    } else if (path.front?.status === 'archived') {
      stale.push(`${id} is archived, so its v0.2 exception is spent — delete the entry`)
    }
  }
  return stale
}

export const WORK_UNIT_TYPES = [
  'implementation',
  'documentation',
  'decision',
  'foundation',
  'repair',
  'closure'
]

/** The retention ref namespace. `<n>` is the ledger's own ordinal for the
 *  unit, so a ledger entry and its retained ref name the same thing without
 *  the entry having to contain an object id it cannot know until after it is
 *  committed. */
export const CHECKPOINT_REF_PREFIX = 'refs/cairn/checkpoints'

/** The trailer that marks a pushed commit as deliberately incomplete. */
export const PROVISIONAL_TRAILER = 'Cairn-Provisional'


/* ------------------------------------------------------------------ *
 * pure helpers — everything below takes data, so it is testable
 * ------------------------------------------------------------------ */

/** Frontmatter is either YAML-ish or a JSON object (bedrock pages use JSON).
 *  We only need a few scalar keys, so this stays a line reader rather than a
 *  YAML dependency — and it reports what it could not parse instead of
 *  guessing. */
/** A deliberately small frontmatter grammar, named rather than called YAML.
 *
 *  It reads exactly the shapes Cairn's own records use: scalars, one level of
 *  nested map, block lists of scalars, block lists of maps, and inline flow
 *  lists. It does not read anchors, multi-line scalars, tags, or arbitrary
 *  nesting, and it never will — a validator that silently half-parses a
 *  construct is worse than one that refuses it, because the half it drops is
 *  invisible. The specification requires a limited reader to say so instead of
 *  borrowing YAML's name; this is that reader.
 *
 *  Scalar values are trimmed and otherwise untouched: quotes are NOT stripped,
 *  because several records carry a colon inside a quoted title and the existing
 *  gates compare those strings byte-for-byte. */
export function frontmatterScalar(value) {
  const trimmed = value.trim()
  // A trailing comment on a KEY is the same trap F9 fixed on `writes:` and on
  // list items: `writes:   # ADVISORY` made the value non-empty, so the key
  // stopped opening a list and silently declared nothing at all. Quoted values
  // are left alone, because a `#` inside quotes is content, not a comment.
  if (trimmed.startsWith("'") || trimmed.startsWith('"')) return trimmed
  if (trimmed.startsWith('#')) return ''
  return trimmed.replace(/\s+#.*$/, '').trim()
}

/** A list ITEM may carry a trailing comment, which is the same trap that made
 *  `- docs/adr/**   # every ADR` declare a surface matching nothing (F9, and
 *  again live on 2026-08-24). Strip it here so every list in the block behaves
 *  the way `writes:` was taught to. */
function listScalar(value) {
  return value.replace(/\s+#.*$/, '').trim()
}

function flowList(value) {
  const inner = value.slice(1, value.lastIndexOf(']'))
  return inner
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

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
  // A key whose value is empty is not yet a map or a list: the next line
  // decides. Holding it as `pending` is what lets one reader accept both
  // `writes:` followed by items and `cairn:` followed by fields.
  let pending = null
  let list = null

  for (const line of raw.split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue
    const indent = line.length - line.trimStart().length

    const dash = line.match(/^\s*-\s*(.*)$/)
    if (dash) {
      if (list == null) {
        if (pending == null) continue
        list = { array: [], indent, current: null }
        pending.target[pending.key] = list.array
        pending = null
      } else if (indent !== list.indent) {
        continue
      }
      const body = dash[1].trim()
      const pair = body.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/)
      if (pair) {
        list.current = { [pair[1]]: frontmatterScalar(pair[2]) }
        list.array.push(list.current)
      } else if (body) {
        list.array.push(listScalar(body))
        list.current = null
      }
      continue
    }

    const pair = line.match(/^\s*([A-Za-z_][\w-]*)\s*:\s*(.*)$/)
    if (!pair) continue
    const [, key, rawValue] = pair

    // A key indented deeper than the dashes belongs to the map item above it.
    if (list && list.current && indent > list.indent) {
      list.current[key] = frontmatterScalar(rawValue)
      continue
    }
    list = null

    const value = frontmatterScalar(rawValue)
    const target = indent === 0 ? data : section ? data[section] : null
    if (target == null || typeof target !== 'object' || Array.isArray(target)) continue

    if (indent === 0) section = null
    if (value === '') {
      // A key with no value is not yet anything. At the top level it opens a
      // map, because that is how `cairn:` has always behaved and gates read
      // `data.cairn.id`. Nested, it stays the empty STRING it used to be — a
      // record with a blank `verdict:` must still report a missing verdict
      // rather than an object. Either way a following `- ` item replaces it
      // with the list it turned out to be.
      target[key] = indent === 0 ? {} : ''
      pending = { target, key, indent }
      if (indent === 0) section = key
    } else if (value.startsWith('[')) {
      target[key] = flowList(value)
      pending = null
    } else {
      target[key] = value
      pending = null
    }
  }
  return { kind: 'yaml', data }
}

/**
 * `writes:` is a YAML list, which the scalar frontmatter reader above skips.
 *
 * Two bugs the first version had, both from scanning the WHOLE document with
 * `/\n\s*writes:\s*\n((?:\s*-\s*\S.*\n)+)/` (audit 2026-08-24, finding F9):
 *
 *   1. `---` satisfies `\s*-\s*\S.*`, so the frontmatter TERMINATOR was
 *      consumed as a write surface — every path silently declared a `"--"`
 *      entry — and the scan then ran on into the document body, where any
 *      opening bullet list would have become declared surfaces too. No path
 *      leaked past the terminator yet; it was luck, not design.
 *   2. `writes:\s*\n` refuses a trailing comment, and the template in
 *      bedrock 24 / paths.md writes exactly that:
 *      `writes:   # ADVISORY — a signal, never a lock`.
 *      A path copied from the documented template parsed as ZERO declared
 *      surfaces, which silently disables the scope-drift check.
 *
 * Scoping the scan to the frontmatter fixes both: the terminator is no longer
 * inside the searched text, so it cannot be read as a list item.
 */
export function parseWrites(text) {
  if (!text.startsWith('---\n')) return []
  const end = text.indexOf('\n---', 4)
  if (end === -1) return []
  const front = text.slice(4, end)
  const block = front.match(/(?:^|\n)[ \t]*writes:[^\n]*\n((?:[ \t]*-[ \t]*\S.*(?:\n|$))+)/)
  if (!block) return []
  const out = []
  for (const line of block[1].split('\n')) {
    const item = line.match(/^[ \t]*-[ \t]*(\S.*?)[ \t]*$/)
    // A trailing comment on an ITEM is the same trap F9 fixed on the `writes:`
    // line itself, one line lower: `- docs/adr/**   # every ADR` declared the
    // surface `docs/adr/**   # every ADR`, which matches nothing, so the path
    // silently declared less than it said. Found live on 2026-08-24 (CP-OPS-002
    // S05) when a widened declaration kept reporting drift.
    if (item) out.push(item[1].replace(/\s+#.*$/, '').trim())
  }
  return out.filter(Boolean)
}

/** A FULL object id, in whichever format the repository is configured for.
 *  SHA-1 gives forty hex characters and SHA-256 gives sixty-four; a checker
 *  that admits only the first refuses a repository the specification accepts,
 *  which makes the tool and the spec disagree about what a valid repository is.
 *  Length follows from the repository; the requirement is unabbreviated. */
export function isObjectId(value) {
  return typeof value === 'string' && /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(value)
}

export const OBJECT_ID_FORMATS = 'forty hexadecimal characters (SHA-1) or sixty-four (SHA-256)'

export function isCommitPin(value) {
  return typeof value === 'string' && /^[0-9a-f]{7,64}$/i.test(value)
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

export function pathFrontmatterErrors(front, file = null) {
  if (!front) return ['missing atomik: frontmatter block']
  const errors = []
  if (!front.id) errors.push('missing atomik.id')
  else {
    if (!/^CP-[A-Z0-9][A-Z0-9-]*$/.test(front.id)) {
      errors.push('atomik.id must use canonical CP-<UPPERCASE-ID> form')
    }
    const expected = file?.split('/').at(-1)
    if (expected && expected !== `${front.id}.md`) {
      errors.push(`atomik.id "${front.id}" does not match the file name (${expected})`)
    }
  }
  if (!PATH_STATUSES.includes(front.status)) {
    errors.push(`status "${front.status}" is outside the vocabulary (${PATH_STATUSES.join(' | ')})`)
  }
  if (['running', 'blocked', 'ready'].includes(front.status) && !front.branch) {
    errors.push(`status "${front.status}" requires atomik.branch`)
  }
  if (
    ['running', 'blocked', 'ready'].includes(front.status) &&
    front.id &&
    front.branch &&
    front.branch !== `path/${front.id.toLowerCase()}`
  ) {
    errors.push(`atomik.branch must equal path/${front.id.toLowerCase()}`)
  }
  if (['running', 'blocked', 'ready'].includes(front.status) && !isCommitPin(front.base_commit)) {
    errors.push(`status "${front.status}" requires atomik.base_commit as a 7–40 digit Git hash`)
  }
  if (front.status === 'ready' && !isObjectId(front.subject_commit)) {
    errors.push(`status "ready" requires atomik.subject_commit as a full object id — ${OBJECT_ID_FORMATS}`)
  }
  if (front.status === 'archived' && front.resolution && !PATH_RESOLUTIONS.includes(front.resolution)) {
    errors.push(
      `atomik.resolution "${front.resolution}" is outside the vocabulary (${PATH_RESOLUTIONS.join(' | ')})`
    )
  }
  return errors
}

/** A transition is checked whenever the previous path state is available.
 * `null` means this is a newly created path declaration. */
export function transitionErrors(previous, current, onPathBranch = false) {
  const errors = []
  const from = previous?.status ?? null
  const to = current?.status
  const allowed = {
    null: ['draft', 'running'],
    draft: ['draft', 'running', 'archived'],
    running: ['running', 'blocked', 'ready', 'archived'],
    // No blocked → ready: reaching `ready` means producing and auditing a
    // candidate, which is execution. An unblocked path returns to `running`
    // and reaches `ready` from there.
    blocked: ['blocked', 'running', 'archived'],
    // ready → blocked exists because acceptance stalls. A candidate audited and
    // waiting on an unavailable reviewer is blocked on a named condition, and
    // saying so is more useful than a `ready` that quietly ages.
    ready: ['ready', 'running', 'blocked', 'done'],
    done: ['done', 'archived'],
    // `archived` is terminal and has no outgoing edge. It appears here because
    // an UNCHANGED state is not a transition: a validator comparing two commits
    // routinely sees a record that declared `archived` before and declares it
    // now, and that is no event at all. What must not change is its resolution.
    archived: ['archived']
  }

  const trunkIntegration = !onPathBranch && from === 'running' && to === 'done'
  if (!(allowed[String(from)] ?? []).includes(to) && !trunkIntegration) {
    errors.push(`transition ${from ?? 'new'} → ${to ?? 'missing'} is not allowed`)
  }
  if (onPathBranch && to === 'done') {
    errors.push('a path branch cannot claim `done`; it declares `ready` and integration records `done` on the trunk')
  }
  if (to === 'archived' && !PATH_RESOLUTIONS.includes(current?.resolution)) {
    errors.push('status `archived` requires resolution: completed | abandoned | superseded')
  }
  if (to === 'archived' && from === 'done' && current?.resolution !== 'completed') {
    errors.push('done → archived requires resolution: completed')
  }
  if (from === 'archived' && to === 'archived' && previous?.resolution !== current?.resolution) {
    errors.push(
      `an archived path's resolution is terminal: ${previous?.resolution ?? 'none'} cannot become ${current?.resolution ?? 'none'}`
    )
  }
  if (
    to === 'archived' &&
    from !== 'done' &&
    // An UNCHANGED archived record is not an archiving event, so it is not an
    // unintegrated path archiving as `completed`. Without this the rule failed
    // every later run over a correctly completed-and-archived path — a defect
    // that only became visible once the table was reconciled in both directions.
    from !== 'archived' &&
    !['abandoned', 'superseded'].includes(current?.resolution)
  ) {
    errors.push('an unintegrated path archives as abandoned or superseded, never completed')
  }
  if (to === 'done' && current?.resolution !== 'completed') {
    errors.push('status `done` requires resolution: completed')
  }
  if (to === 'done' && !isObjectId(current?.subject_commit)) {
    errors.push(`status \`done\` requires subject_commit as a full object id — ${OBJECT_ID_FORMATS}`)
  }
  return errors
}

export function duplicatePathIdentityFindings(paths) {
  const findings = []
  for (const key of ['id', 'branch']) {
    const seen = new Map()
    for (const path of paths) {
      const value = path.front?.[key]
      if (!value) continue
      if (seen.has(value)) {
        findings.push(`${key} "${value}" is declared by both ${seen.get(value)} and ${path.file}`)
      } else {
        seen.set(value, path.file)
      }
    }
  }
  return findings
}

export function closingAcceptanceErrors(record, pathId) {
  const errors = []
  if (!record) return ['missing closing acceptance record']
  if (record.path !== pathId) errors.push(`path must equal ${pathId}`)
  if (String(record.ceremony).toLowerCase() !== 'closing') errors.push('ceremony must equal closing')
  if (!isObjectId(record.subject_commit)) {
    errors.push(`subject_commit must be a full object id — ${OBJECT_ID_FORMATS}`)
  }
  if (!String(record.accepted_by ?? '').trim()) errors.push('accepted_by is required')
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(String(record.accepted_at))) {
    errors.push('accepted_at must be an ISO UTC timestamp')
  }
  if (record.decision !== 'accepted') errors.push('decision must equal accepted')
  if (!String(record.scope_ref ?? '').trim()) errors.push('scope_ref is required')
  if (!String(record.advisory_disposition ?? '').trim()) {
    errors.push('advisory_disposition is required')
  }
  return errors
}

const IMMUTABLE_RECORD_PREFIXES = [
  'atomik-project/sessions/',
  'atomik-project/audits/',
  `${HISTORY_DIR}/`,
  'atomik-project/log/'
]

export function isImmutableRecord(file) {
  if (file === JOURNAL) return true
  if (!IMMUTABLE_RECORD_PREFIXES.some((prefix) => file.startsWith(prefix))) return false
  return !['index.md', 'log.md', '.gitkeep'].includes(file.split('/').at(-1))
}

/**
 * ADRs are canonical decisions — `decision-drift` points at them, bedrock pages
 * cite them, and until 2026-08-24 not one of the fifteen was machine-readable
 * (audit F5). Frontmatter validation used to stop at the execution plane, so the
 * plane holding the ARCHITECTURE was the unchecked one.
 *
 * Two halves must agree. The frontmatter is what tools read; the `Status:` line
 * under the heading is what a human reads. A record whose two halves disagree
 * about whether a decision is accepted is worse than one that never claimed to
 * be readable, so the mismatch is an error rather than a preference.
 *
 * `bodyStatus` is `null` when the document has no `Status:` line, which is not a
 * finding: the check is that the two agree, not that both exist.
 */
export function adrFrontmatterErrors(front, file, bodyStatus = null) {
  if (!front) return ['missing adr: frontmatter block']
  const errors = []
  const expected = /^docs\/adr\/(ADR-\d{3})-/.exec(file)?.[1]

  if (!front.id) errors.push('missing adr.id')
  else if (expected && front.id !== expected) {
    errors.push(`adr.id "${front.id}" does not match the file name (${expected})`)
  }
  if (!ADR_STATUSES.includes(front.status)) {
    errors.push(`status "${front.status}" is outside the vocabulary (${ADR_STATUSES.join(' | ')})`)
  } else if (bodyStatus && bodyStatus !== front.status) {
    errors.push(`adr.status "${front.status}" contradicts the document's own "Status: ${bodyStatus}"`)
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(front.date))) {
    errors.push('adr.date must be an ISO date (YYYY-MM-DD)')
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

/**
 * WHICH BRANCH IS THIS? Every path-scoped rule is guarded by
 * `isPathBranch(branch)`, so a wrong answer here does not produce a wrong
 * verdict — it produces NO verdict, silently.
 *
 * `git rev-parse --abbrev-ref HEAD` returns the literal string "HEAD" in a
 * detached checkout, and `actions/checkout` detaches on every
 * `pull_request` event. Six rules therefore went quiet in exactly the CI run
 * that was supposed to enforce them: `branch-path`, `registration`, `rebase`,
 * `remote-checkpoint`, `scope-drift` and `coherence-audit`. A stale, never
 * registered path branch carrying 96 changed source files was reported
 * "OK — protocol satisfied" (audit 2026-08-24, finding F1).
 *
 * The host knows what the checkout does not, so ask it first. Order is
 * deliberate: an explicit flag beats CI environment, CI beats Git, and Git's
 * detached answer is kept only so the caller can tell that it IS detached.
 */
export function resolveBranch({ flag, env = {}, symbolicRef, abbrevRef }) {
  if (flag) return { branch: flag, source: 'flag' }
  // pull_request: the SOURCE branch of the PR, which is the path branch.
  if (env.GITHUB_HEAD_REF) return { branch: env.GITHUB_HEAD_REF, source: 'github-head-ref' }
  // push: the branch pushed to. On a pull_request this is "<n>/merge", which
  // names the merge preview rather than any branch — never trust it there.
  if (env.GITHUB_REF_NAME && !/^\d+\/(merge|head)$/.test(env.GITHUB_REF_NAME)) {
    return { branch: env.GITHUB_REF_NAME, source: 'github-ref-name' }
  }
  if (symbolicRef) return { branch: symbolicRef, source: 'symbolic-ref' }
  return { branch: abbrevRef ?? 'HEAD', source: 'detached' }
}

/** Roots where an unenforced protocol leaves something WRONG in the repo
 *  rather than merely unconventional — the admission test for blocking. */
export const GUARDED_ROOTS = ['apps/', 'packages/', 'shared/']

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

/** The paths in `git status --porcelain -z` output.
 *
 *  The status field is TWO columns and a space, so the path starts at index
 *  3 — which is why a record must NOT be trimmed first. Trimming eats the
 *  leading space of an UNSTAGED record (`" M path"`) and `slice(3)` then eats
 *  the path's own first character: found on CP-MVP-010 S01, where scope-drift
 *  reported `tomik-project/coding-paths/CP-MVP-010.md` and the missing `a`
 *  also defeated the `startsWith(PATH_DIR)` exemption. Every rule downstream
 *  reads this list, BLOCKING ones included — which is why the second bug in
 *  this function was worth more than the advisory that revealed it.
 *
 *  **Why `-z`.** The human-readable porcelain C-QUOTES any path with a space,
 *  a quote, a backslash or a non-ASCII byte: `"briefs/feedback on  MVP-001.md"`,
 *  quotes included. That string starts with `"`, so it matches no `writes:`
 *  glob, no `startsWith('apps/')` guarded root and no area pattern — a source
 *  file whose name contains a space was INVISIBLE to `same-work-unit` and
 *  `branch-identity` while still being counted as changed. Found on CP-OPS-002
 *  S06d, by the one file in this repository that has such a name, which had
 *  already broken a `find` loop in the audit that named it.
 *
 *  Unquoting is the wrong fix: `\303\251` for `é` means reassembling UTF-8
 *  from octal escapes, which is a decoder to get wrong. `-z` asks Git not to
 *  quote at all — records separated by NUL, paths verbatim.
 *
 *  A rename or copy record carries the NEW path, with the ORIGINAL following
 *  in the next NUL field. The original is not a changed file of its own, so it
 *  is skipped; reading it as one would report a path that no longer exists. */
export function porcelainPaths(raw) {
  const fields = String(raw).split('\0')
  const out = []
  for (let i = 0; i < fields.length; i += 1) {
    const record = fields[i]
    if (record.length <= 3) continue
    out.push(record.slice(3))
    if (/[RC]/.test(record.slice(0, 2))) i += 1
  }
  return out.filter(Boolean)
}

/** Existing files changed by `git status --porcelain -z`.
 *
 * Additions are deliberately excluded: append-only namespaces grow by adding
 * uniquely named files. Every other status means an object that existed before
 * this work unit was modified, renamed or deleted. */
export function porcelainMutations(raw) {
  const fields = String(raw).split('\0')
  const out = []
  for (let i = 0; i < fields.length; i += 1) {
    const record = fields[i]
    if (record.length <= 3) continue
    const status = record.slice(0, 2)
    const path = record.slice(3)
    const isAddition = status === '??' || status[0] === 'A'
    if (status.includes('R')) {
      if (path) out.push(path)
      if (fields[i + 1]) out.push(fields[i + 1])
      i += 1
    } else {
      if (!isAddition && !status.includes('C') && path) out.push(path)
      if (status.includes('C')) i += 1
    }
  }
  return out
}

/** Existing-file mutations from `git diff --name-status -z`. Rename records
 * carry both old and new names; copies are additions and leave the source
 * intact. */
export function nameStatusMutations(raw) {
  const fields = String(raw).split('\0')
  const out = []
  for (let i = 0; i < fields.length;) {
    const status = fields[i++]
    if (!status) continue
    if (status.startsWith('R')) {
      if (fields[i]) out.push(fields[i])
      if (fields[i + 1]) out.push(fields[i + 1])
      i += 2
    } else {
      const path = fields[i++]
      if (path && !status.startsWith('A') && !status.startsWith('C')) out.push(path)
      if (status.startsWith('C')) i += 1
    }
  }
  return out
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

/**
 * Rough token count, deliberately the SAME proxy the audit used (words x 4/3),
 * so a finding here and the F4 table are comparable numbers rather than two
 * measurements of the same file that disagree. Exact tokenisation depends on a
 * model nobody here is running; the boundary is an order of magnitude, not a
 * threshold to tune.
 */
/**
 * A completed work unit declares itself in a fenced `cairn-unit` block inside
 * its ledger entry:
 *
 * ```cairn-unit
 * step: S07h
 * unit: 08
 * type: implementation
 * verified: cairn-check, typecheck, test, build
 * ```
 *
 * `unit` is an ordinal, not an object id, and that is the whole trick. The
 * commit a unit produces does not exist while the unit is being written, so a
 * block naming its own hash could never be written truthfully. The ordinal is
 * knowable in advance; `refs/cairn/checkpoints/<path-id>/<unit>` supplies the
 * hash afterwards. The ledger says which unit, the ref says which commit, and
 * neither has to lie about the other.
 */
export function parseWorkUnits(text) {
  const units = []
  const blocks = text.matchAll(/^```cairn-unit[ \t]*\n([\s\S]*?)^```[ \t]*$/gm)
  for (const block of blocks) {
    const unit = {}
    for (const line of block[1].split('\n')) {
      const pair = line.match(/^\s*([A-Za-z_][\w-]*)\s*:\s*(.*)$/)
      if (pair) unit[pair[1]] = pair[2].trim()
    }
    units.push(unit)
  }
  return units
}

export function workUnitErrors(unit) {
  const errors = []
  if (!unit.step) errors.push('a cairn-unit block needs step')
  if (!/^\d{1,4}$/.test(unit.unit ?? '')) {
    errors.push(`a cairn-unit block needs unit as a ledger ordinal, got "${unit.unit ?? ''}"`)
  }
  if (!WORK_UNIT_TYPES.includes(unit.type)) {
    errors.push(
      `work-unit type "${unit.type ?? ''}" is outside ${WORK_UNIT_TYPES.join(' | ')}`
    )
  }
  if (!unit.verified) errors.push('a cairn-unit block needs verified')
  return errors
}

/**
 * Commits on the path branch that were completed work and were never retained.
 *
 * `retentionDue` asks whether each DECLARED unit has a ref. That is not the same
 * question as whether every completed commit is retained, and the difference is
 * where a real violation hid: a ref can be moved to a newer commit, leaving the
 * commit it used to name unretained while every declared unit still resolves.
 * Found the hard way, by doing exactly that in this repository.
 *
 * The range starts at the oldest retained checkpoint, because commits older than
 * the convention cannot be judged by it. HEAD is exempt for the same reason the
 * newest unit is: its ref is written after the commit that declares it.
 */
export function unretainedCheckpoints(commits, retained, provisional = new Set(), head = null) {
  const retainedSet = new Set(retained)
  if (retainedSet.size === 0) return []
  const oldest = commits.findIndex((commit) => retainedSet.has(commit))
  if (oldest === -1) return []
  return commits
    .slice(oldest)
    .filter((commit) =>
      commit !== head && !retainedSet.has(commit) && !provisional.has(commit))
}

/** Which declared units must already be retained. The newest unit is exempt
 *  because its ref is written immediately AFTER the commit that declares it —
 *  checking it here would fail every gate run that precedes its own push. The
 *  guarantee that matters is unaffected: retention must exist before the NEXT
 *  rewriting push, and by then the unit is no longer the newest. */
export function retentionDue(units) {
  const ordinals = units
    .map((unit) => Number.parseInt(unit.unit, 10))
    .filter((value) => Number.isInteger(value))
  if (ordinals.length === 0) return []
  const newest = Math.max(...ordinals)
  return units.filter((unit) => Number.parseInt(unit.unit, 10) < newest)
}

/**
 * The text a `scope_ref` resolves to: the named heading and its body, up to the
 * next heading of the same or higher level. Normalised for line endings and
 * trailing whitespace and nothing else — a digest whose input is "cleaned"
 * silently accepts changes it claims to have covered.
 */
export function resolveScopeSection(text, anchor) {
  const wanted = String(anchor ?? '').replace(/^#/, '').toLowerCase()
  if (!wanted) return null
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  let start = -1
  let level = 0
  for (let i = 0; i < lines.length; i += 1) {
    const heading = lines[i].match(/^(#{1,6})\s+(.+?)\s*$/)
    if (!heading) continue
    const slug = heading[2]
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    if (slug === wanted) {
      start = i
      level = heading[1].length
      break
    }
  }
  if (start === -1) return null
  let end = lines.length
  for (let i = start + 1; i < lines.length; i += 1) {
    const heading = lines[i].match(/^(#{1,6})\s+/)
    if (heading && heading[1].length <= level) {
      end = i
      break
    }
  }
  return lines.slice(start, end).map((line) => line.replace(/[ \t]+$/, '')).join('\n').trim()
}

export function scopeDigest(section, algorithm = 'sha256') {
  if (section == null) return null
  return `${algorithm}:${createHash(algorithm).update(section, 'utf8').digest('hex')}`
}

/** Fields an administrative closure commit may move inside the path record.
 *  File-level allowance is not a restriction: the definition of done and both
 *  declared surfaces live in this same file, so a closure permitted to "change
 *  the path record" is permitted to rewrite the standard its own acceptance was
 *  measured against, after the measurement. */
/** What closure may move depends on which fact it is recording.
 *
 *  `ready` is an acceptance: it names the candidate and nothing else. `done` is
 *  an integration, so the trunk unit additionally writes the resolution. An
 *  earlier version of this list allowed `current_step` and `resolution` on
 *  BOTH, which made the predicate more permissive than the prose it was meant
 *  to enforce — and `resolution` at closure is incoherent anyway, because a
 *  ready path has not resolved anything. Caught in review. */
export function closureMutableFields(status) {
  return status === 'done'
    ? ['status', 'subject_commit', 'resolution']
    : ['status', 'subject_commit']
}

export const CLOSURE_MUTABLE_FIELDS = closureMutableFields('ready')

export function closureFieldErrors(previous, current) {
  if (!previous || !current) return []
  const errors = []
  const mutable = closureMutableFields(current.status)
  const keys = new Set([...Object.keys(previous), ...Object.keys(current)])
  for (const key of keys) {
    if (mutable.includes(key)) continue
    const before = JSON.stringify(previous[key] ?? null)
    const after = JSON.stringify(current[key] ?? null)
    if (before !== after) {
      errors.push(`closure changed \`${key}\`, which acceptance was measured against — only ${mutable.join(', ')} may move when a path declares ${current.status}`)
    }
  }
  return errors
}

/** Which trunk changes threaten an acceptance. Deliberately NOT `trunk === base`:
 *  that rule is first-come-first-served, so every landing invalidates every other
 *  open acceptance and a busy trunk never closes. `writes:` is the surface the
 *  candidate changed; `governs:` is the frame the audit read it against. A trunk
 *  change in either moved something the acceptance depended on. */
export function acceptanceDrift(trunkDelta, writes = [], governs = []) {
  const surfaces = [
    ...writes,
    ...governs.map((entry) => String(entry).split('@')[0])
  ].filter(Boolean)
  if (surfaces.length === 0) return []
  return trunkDelta.filter((file) => matchesAny(file, surfaces))
}

export const DISPOSITIONS = ['fixed', 'accepted', 'deferred']

/**
 * `advisory_disposition` as one sentence is unenforceable: a reviewer writing
 * "accepted: none" over three live advisories produces a record that reads as
 * complete and is false. Set equality is a predicate; a summary is not.
 *
 * But equality against *what*? The first version compared against the
 * advisories raised in the run that evaluates `A`, and that was unsound. `A` is
 * field-restricted by construction, so its advisory set is a strict SUBSET of
 * the set raised at `C` — the rule could pass while advisories raised at the
 * candidate went undisposed, which is the exact failure the requirement exists
 * to prevent. Caught in review.
 *
 * The record therefore ATTESTS the set raised at `C`, in `advisories_at_candidate`,
 * bound to `C` by the audit's subject. Two things are then checkable:
 *
 *   1. dispositions cover exactly the attested set — no omissions, no invented
 *      entries;
 *   2. every advisory raised here at `A` appears in the attested set. Because
 *      A ⊂ C, an advisory firing now and missing from the record PROVES the
 *      attestation incomplete.
 *
 * What remains an attestation rather than a derivation is an advisory that
 * fires only at `C`. Closing that needs evaluation replayed at `C`, and the
 * conformance matrix says so.
 */
export function dispositionErrors(disposition, attested, raisedHere = []) {
  const errors = []
  if (!Array.isArray(disposition)) {
    return ['advisory_disposition must be a list of { rule, disposition, reason } entries']
  }
  if (!Array.isArray(attested)) {
    errors.push('advisories_at_candidate must list the advisory rules raised at the candidate — without it, dispositions can only be compared against the closure commit, whose advisory set is a strict subset')
    attested = []
  }
  const attestedSet = new Set(attested)
  for (const rule of raisedHere) {
    if (!attestedSet.has(rule)) {
      errors.push(`advisory "${rule}" is raised at the closure commit but is absent from advisories_at_candidate — the closure commit's findings are a subset of the candidate's, so this proves the attested set incomplete`)
    }
  }
  const named = new Set()
  for (const entry of disposition) {
    if (typeof entry !== 'object' || entry == null) {
      errors.push('every advisory_disposition entry must name a rule, a disposition and a reason')
      continue
    }
    if (!entry.rule) errors.push('an advisory_disposition entry has no rule')
    else named.add(entry.rule)
    if (!DISPOSITIONS.includes(entry.disposition)) {
      errors.push(`disposition "${entry.disposition ?? ''}" for ${entry.rule ?? 'an entry'} is outside ${DISPOSITIONS.join(' | ')}`)
    }
    if (!String(entry.reason ?? '').trim()) {
      errors.push(`${entry.rule ?? 'an entry'} has no reason`)
    }
    if (entry.disposition === 'deferred' && !(entry.owner && entry.follow_up)) {
      errors.push(`${entry.rule ?? 'an entry'} is deferred without an owner and a follow_up`)
    }
  }
  for (const rule of attestedSet) {
    if (!named.has(rule)) errors.push(`advisory "${rule}" was raised at the candidate and has no disposition`)
  }
  for (const rule of named) {
    if (!attestedSet.has(rule)) {
      errors.push(`advisory_disposition names "${rule}", which advisories_at_candidate does not list as raised`)
    }
  }
  return errors
}

export function approxTokens(text) {
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.round((words * 4) / 3)
}

/**
 * Which full-route triggers a declared write surface actually fires.
 *
 * Three of the five triggers are structural and checkable here. The other two —
 * "expected to span more than one work unit" and "policy-designated high-risk" —
 * are an expectation and a policy, so they are declared rather than derived, and
 * the specification says so instead of implying the list is exhaustive.
 */
export function fullRouteTriggers(writes = [], areaOfFile = areaOf, unitCount = 0) {
  const triggers = []
  // The specification's "expected to span more than one work unit" is an
  // expectation and cannot be derived. HAVING spanned one is a fact in the
  // ledger, and it is the same trigger arriving one unit late. Without this
  // backstop the honest failure mode is that everything declares itself
  // lightweight, ceremony evaporates, and no rule ever fires. Added in review.
  if (unitCount > 1) {
    triggers.push(`its ledger already declares ${unitCount} work units`)
  }
  if (writes.some((pattern) => CONTROL_PLANE.some((prefix) => pattern.startsWith(prefix)))) {
    triggers.push('it changes the control plane')
  }
  if (writes.some((pattern) => DECISION_PLANE.some((prefix) => pattern.startsWith(prefix)))) {
    triggers.push('it changes architecture or a decision record')
  }
  const areas = new Set(writes.map((pattern) => areaOfFile(pattern.replace(/\*+$/, ''))).filter(Boolean))
  if (areas.size > 1) {
    triggers.push(`it declares ${areas.size} implemented areas (${[...areas].join(', ')})`)
  }
  return triggers
}

export function foundationSurfaceViolations(writes = []) {
  return writes.filter((pattern) => !FOUNDATION_SURFACE.some((allowed) => allowed.test(pattern)))
}

/** Escalation is one-way. A change does not become small by being called small,
 *  so the only direction a route may move is toward more ceremony. */
export function routeDescent(previous, current) {
  if (!previous || !current || previous === current) return null
  if (previous === 'full' && current !== 'full') {
    return `route moved from full to ${current} — escalation is one-way; a change does not become small by being called small`
  }
  return null
}

export const BRIEF_FIELDS = [
  'written_by',
  'checkpoint',
  'checkpoint_unit',
  'checkpoint_pushed',
  'base_commit',
  'trunk_seen',
  'writes',
  'governs',
  'verify',
  'budget_tokens'
]

export const BRIEF_SECTIONS = [
  'Outcome',
  'State',
  'Next action',
  'Blockers',
  'Tried and rejected',
  'Reading order',
  'Verification'
]

/** The brief is the bootstrap contract, and a contract with no fields is not a
 *  contract. The SHAPE is checkable here; whether the brief can actually be
 *  resumed cold is a judgement and a benchmark, and is never claimed. */
export function briefErrors(front, body, budget = 1200, tokensOf = approxTokens) {
  const errors = []
  if (!front) return ['the handoff brief has no readable frontmatter']
  for (const field of BRIEF_FIELDS) {
    if (front[field] === undefined || front[field] === '') {
      errors.push(`the handoff brief needs \`${field}\``)
    }
  }
  if (front.checkpoint && !/^[0-9a-f]{7,64}$/i.test(String(front.checkpoint))) {
    errors.push('`checkpoint` must be an object id — it names the last RETAINED checkpoint, never the commit containing this brief, which does not exist while the brief is being written')
  }
  if (front.checkpoint_unit && !/^\d{1,4}$/.test(String(front.checkpoint_unit))) {
    errors.push('`checkpoint_unit` must be the ledger ordinal of the retained checkpoint')
  }
  if (front.checkpoint_pushed !== undefined && String(front.checkpoint_pushed) !== 'true') {
    errors.push('`checkpoint_pushed` is false — a checkpoint that is not on the remote is not a handoff, it is a defect to repair')
  }
  for (const entry of Array.isArray(front.governs) ? front.governs : []) {
    if (!String(entry).includes('@')) {
      errors.push(`\`governs\` entry "${entry}" is not pinned — an unpinned document means "whatever this says now", which is the ambiguity the field removes`)
    }
  }
  const headings = [...String(body).matchAll(/^##\s+(.+?)\s*$/gm)].map((match) => match[1])
  const missing = BRIEF_SECTIONS.filter((section) => !headings.includes(section))
  if (missing.length > 0) errors.push(`the handoff brief is missing: ${missing.join(', ')}`)
  const extra = headings.filter((heading) => !BRIEF_SECTIONS.includes(heading))
  if (extra.length > 0) errors.push(`the handoff brief carries sections outside the seven: ${extra.join(', ')}`)
  const limit = Number.parseInt(front.budget_tokens, 10)
  const size = tokensOf(String(body))
  if (Number.isInteger(limit) && size > limit) {
    errors.push(`the handoff brief is ~${size} tokens against its declared budget of ${limit} — a path whose situation will not fit in the budget has lost its shape`)
  } else if (!Number.isInteger(limit) && size > budget) {
    errors.push(`the handoff brief is ~${size} tokens against the default budget of ${budget}`)
  }
  return errors
}

/** Redaction is the one sanctioned exception to record immutability, so every
 *  marker must name the record that authorised it. A marker pointing at nothing
 *  is an edit wearing a ceremony's clothes. */
export function redactionMarkers(text) {
  // Code spans and fences are stripped first, for the same reason the link rule
  // strips them: documentation SHOWS a redaction marker constantly, and a rule
  // that flags its own specification is a rule people switch off. Found
  // immediately, by this rule firing on the ledger entry describing it.
  return [...stripCode(String(text)).matchAll(/\[redacted:\s*([^\]]+)\]/g)]
    .map((match) => match[1].trim())
}

export function areaOf(file) {
  for (const [pattern, area] of AREA_MAP) if (pattern.test(file)) return area
  return null
}

/**
 * Which `running` paths have gone quiet (ADR-017 decision 5).
 *
 * Pure: it takes the ages rather than running Git, so the rule is testable and
 * the one judgment it makes — how long is too long — stays a single number.
 *
 * `ages` maps a branch to days since its last commit. A branch that is ABSENT,
 * `null` or `undefined` reports NOTHING: a shallow CI clone and a path whose
 * branch lives on another machine both look like that, and unknown must never
 * read as stale for exactly the reason it must never read as fresh.
 */
export function staleRunningPaths(paths, ages, budgetDays = PATH_STALE_DAYS) {
  const out = []
  for (const path of paths) {
    const front = path.front
    if (front?.status !== 'running' || !front.branch) continue
    const days = ages?.[front.branch]
    if (typeof days !== 'number' || !Number.isFinite(days)) continue
    if (days > budgetDays) out.push({ id: front.id, branch: front.branch, days })
  }
  return out.sort((a, b) => b.days - a.days)
}

/**
 * The rules, as data. `changed` is the list of repo-relative paths in the
 * diff; `paths` is the parsed coding-path corpus; `branch` is the current
 * branch name.
 */
export function evaluate({
  changed,
  stateChanged = changed,
  branch,
  paths,
  resolveFile,
  trunkContained,
  registrationState,
  registrationBaseState = 'match',
  remoteCheckpoint,
  closureFor,
  closureStateFor,
  openingFor,
  previousPaths = new Map(),
  immutableMutations = [],
  branchSource = 'symbolic-ref',
  workUnits = null,
  retainedRefs = new Map(),
  provisionalInCandidate = [],
  headProvisional = false,
  scopeDigestFor = null,
  previousFronts = new Map(),
  trunkDelta = null,
  openingRecordFor = null,
  migrationExempt = V02_MIGRATION_PATHS,
  migrationStale = [],
  briefFor = null,
  redactionRecordExists = null,
  pathCommits = null,
  provisionalCommitOids = new Set(),
  head = null
}) {
  const findings = []
  const add = (level, rule, message, outcome = level === 'advisory' ? 'advisory' : 'fail') =>
    findings.push({ level, rule, outcome, message })
  const touched = (prefix) => changed.filter((file) => file.startsWith(prefix))
  const onPath = isPathBranch(branch)
  const match = paths.find((p) => p.front?.branch === branch)

  // 0. branch identity — FAIL CLOSED ---------------------------------
  // A check that cannot name the branch cannot run the rules that protect
  // the trunk, and silence is indistinguishable from a pass. Reporting "OK"
  // there is worse than reporting nothing: it certifies a claim nobody
  // checked. Blocking only where an unenforced protocol leaves the repository
  // WRONG — source landing without a registered, rebased path — and advisory
  // elsewhere, so a detached docs-only or tag build is not punished for the
  // way it was checked out.
  if (branchSource === 'detached') {
    const guarded = changed.filter((file) => GUARDED_ROOTS.some((root) => file.startsWith(root)))
    const how =
      'resolve it from GITHUB_HEAD_REF, `git symbolic-ref --short HEAD`, or pass --branch <name>; ' +
      'in GitHub Actions also check out the pull request HEAD sha, because the default merge ref ' +
      'contains the base by construction and makes the rebase gate pass without proving anything'
    if (guarded.length > 0) {
      add('blocking', 'branch-identity',
        `detached checkout: the branch cannot be identified, so every path rule was SKIPPED while ${guarded.length} guarded file(s) changed — ${how}`,
        'inconclusive')
    } else {
      add('advisory', 'branch-identity',
        `detached checkout: path rules were skipped because the branch could not be identified — ${how}`)
    }
  }

  // 1. branch → path -------------------------------------------------
  if (onPath) {
    if (!match) {
      add('blocking', 'branch-path',
        `branch "${branch}" has no coding path declaring it (expected a file in ${PATH_DIR}/ with atomik.branch: ${branch})`)
    } else if (!PATH_BRANCH_STATUSES.includes(match.front.status)) {
      add('blocking', 'branch-path',
        `${match.file} declares this branch but its status is "${match.front.status}" — a path branch must be running, blocked, or ready; done is recorded by integration on the trunk`)
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
    } else if (registrationState == null) {
      add('blocking', 'registration',
        `cannot resolve the trunk registration for ${match.front.id} — fetch the complete trunk ref and rerun the gate`,
        'inconclusive')
    } else if (registrationState === 'grandfathered') {
      add('advisory', 'registration',
        `${match.front.id} predates trunk registration and is explicitly grandfathered — do not copy this exception to a new path`)
    }
    if (registrationState !== 'grandfathered' && registrationBaseState === 'mismatch') {
      add('blocking', 'registration-base',
        `${match.file} base_commit is not the parent of its trunk registration commit`)
    } else if (registrationState !== 'grandfathered' && registrationBaseState == null) {
      add('blocking', 'registration-base',
        `cannot prove the registration parent for ${match.front.id} — fetch the complete trunk history and rerun the gate`,
        'inconclusive')
    }
  }

  // Every commit is pushed immediately so each completed work unit has an
  // online recovery point and a host-visible push event. This is
  // ADVISORY: a final ref can reveal that HEAD is unpublished now, but cannot
  // prove whether older commits were pushed one-by-one or later as a batch.
  if (onPath && remoteCheckpoint?.state === 'missing') {
    add('advisory', 'remote-checkpoint',
      `branch "${branch}" has no upstream — push every commit and set origin/${branch} as upstream before reporting the step complete`)
  } else if (onPath && remoteCheckpoint?.state === 'unpushed') {
    add('advisory', 'remote-checkpoint',
      `HEAD is not contained in ${remoteCheckpoint.upstream} — push this commit before reporting the step complete or offering an ordinary fresh-session handoff`)
  }

  // 3. the rebase gate (owner directive: "the rebase need should be an
  //    automated gate"). Every path merges ITSELF, so nothing else stops a
  //    stale branch from landing on a trunk it never saw. Objective, and one
  //    command fixes it — it serializes the MERGE, never the WORK.
  if (onPath && trunkContained === false) {
    add('blocking', 'rebase',
      `branch "${branch}" does not contain the trunk tip — rebase before merging, and let CI run on the REBASED result, not a stale branch`)
  } else if (onPath && trunkContained == null) {
    add('blocking', 'rebase',
      `cannot resolve the trunk tip for branch "${branch}" — fetch the complete trunk ref and rerun the rebase gate`,
      'inconclusive')
  }

  // 4. lifecycle transitions and exact candidate acceptance ------------
  for (const file of stateChanged.filter(
    (entry) => /^atomik-project\/coding-paths\/CP-[^/]+\.md$/.test(entry)
  )) {
    if (!paths.some((path) => path.file === file)) {
      add('blocking', 'transition',
        `${file}: path declarations are retained; archive with an explicit resolution instead of deleting the record`)
    }
  }

  for (const path of paths) {
    if (stateChanged.includes(path.file)) {
      const previous = previousPaths instanceof Map
        ? previousPaths.get(path.file)
        : previousPaths?.[path.file]
      if (previous === undefined) {
        add('blocking', 'transition',
          `${path.file}: previous path state is unavailable — provide a complete comparison ref`,
          'inconclusive')
      } else {
        const legacy = migrationExempt.has(String(path.front?.id ?? ''))
        for (const error of transitionErrors(previous, path.front, onPath && path === match)) {
          add(legacy ? 'advisory' : 'blocking', 'transition',
            `${path.file}: ${error}${legacy ? ' (grandfathered: this record predates the v0.2 schema)' : ''}`)
        }
      }
    }

    const validatesReady = path.front?.status === 'ready' && onPath && path === match
    const validatesDone = path.front?.status === 'done' && stateChanged.includes(path.file)
    if (!validatesReady && !validatesDone) continue
    // A record written under an earlier protocol cannot satisfy a later schema
    // by being told to. The exception is named and self-deleting; the finding
    // stays visible as an advisory so the debt is not forgotten.
    const legacyRecord = migrationExempt.has(String(path.front?.id ?? ''))
    const record = closureFor?.(path.front.id, path.front.subject_commit) ?? null
    for (const error of closingAcceptanceErrors(record, path.front.id)) {
      add(legacyRecord ? 'advisory' : 'blocking', 'acceptance',
        `${path.file}: ${error}${legacyRecord ? ' (grandfathered: closed before candidate-bound closure existed)' : ''}`)
    }
    if (record?.subject_commit && path.front.subject_commit !== record.subject_commit) {
      add('blocking', 'acceptance',
        `${path.file}: atomik.subject_commit must equal the closing record subject_commit`)
    }
    const state = closureStateFor?.(path, record)
    if (state == null) {
      add(legacyRecord ? 'advisory' : 'blocking', 'acceptance',
        `${path.file}: cannot inspect the accepted candidate and administrative closure commit${legacyRecord ? ' (grandfathered: it ran on the trunk, so no candidate commit exists to inspect)' : ''}`,
        legacyRecord ? undefined : 'inconclusive')
    } else {
      if (!state.subjectIsAncestor) {
        add('blocking', 'acceptance', `${path.file}: accepted subject_commit is not an ancestor of HEAD`)
      }
      const expectedAdministrativeCommits = path.front.status === 'ready' ? 1 : 2
      if (state.commitsAfterSubject !== expectedAdministrativeCommits) {
        add('blocking', 'acceptance',
          `${path.file}: ${path.front.status} requires exactly ${expectedAdministrativeCommits} metadata commit(s) after subject_commit; found ${state.commitsAfterSubject}`)
      }
      if (state.forbiddenFiles?.length) {
        add('blocking', 'acceptance',
          `${path.file}: implementation changed after acceptance: ${state.forbiddenFiles.join(', ')}`)
      }
    }
  }

  if (immutableMutations == null) {
    const records = changed.filter(isImmutableRecord)
    if (records.length > 0) {
      add('blocking', 'record-integrity',
        `cannot determine whether ${records.length} append-only record(s) are additions or rewrites — provide a complete comparison ref`,
        'inconclusive')
    }
  } else {
    for (const file of immutableMutations) {
      if (isImmutableRecord(file)) {
        add('blocking', 'record-integrity',
          `${file} is an existing append-only record and may not be modified, renamed, or deleted; add a superseding record instead`)
      }
    }
  }

  // 4b. the OPENING check — the other half of the same guard.
  //
  //     `paths.md` requires the owner's explicit acceptance before a path
  //     activates, recorded in a session note. Until now nothing checked it: F2
  //     repaired the closing gate and left its twin a convention, so a path
  //     could be registered, branched and worked with no recorded acceptance.
  //     Owner directive 2026-08-24: "ceremony opening, backfilling why not but
  //     maybe add a blocking gate."
  //
  //     Scoped to a path file IN THE DIFF declaring `running`, so the eight
  //     paths that closed before session notes existed are never examined.
  if (openingFor) {
    for (const path of paths) {
      if (path.front?.status !== 'running' || !stateChanged.includes(path.file)) continue
      const id = path.front.id
      if (openingFor(id)) continue
      if (LEGACY_UNDECLARED_OPENINGS.has(id)) {
        add('advisory', 'opening-ceremony',
          `${path.file} predates the declared ceremony schema — add \`path: ${id}\` and \`ceremony: opening\` to its existing opening-check note to clear this, and do not copy the exception`)
        continue
      }
      add('blocking', 'opening-ceremony',
        `${path.file} is running with no session note declaring \`path: ${id}\` and \`ceremony: opening\` — a path activates on recorded team acceptance, never on a conversation`)
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
  const sourceChanged = changed.filter(
    (file) =>
      GUARDED_ROOTS.some((root) => file.startsWith(root)) &&
      !file.includes('/tests/')
  )
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

  // 5. declared scope drift ---------------------------------------------
  // Writing outside the declaration is not forbidden; leaving the declaration
  // STALE is. Both declared surfaces feed the acceptance-drift predicate, so a
  // surface that no longer describes the work quietly weakens every answer
  // computed from it. Drift accompanied by the widening is ordinary protocol
  // and stays advisory; drift alone blocks.
  if (onPath) {
    const declared = match?.writes ?? []
    if (declared.length > 0) {
      const drift = changed.filter(
        (file) => !matchesAny(file, declared) && !file.startsWith(`${PATH_DIR}/`)
      )
      if (drift.length > 0) {
        const previousWrites = previousFronts.get(`${match.file}::writes`)
        const declarationMoved = previousWrites == null ||
          JSON.stringify(previousWrites) !== JSON.stringify(declared)
        const list = `${drift.slice(0, 6).join(', ')}${drift.length > 6 ? ' …' : ''}`
        if (declarationMoved) {
          add('advisory', 'scope-drift',
            `${drift.length} file(s) outside the declared writes: ${list} — the declaration moved in this same change, which is what a discovered root cause looks like; record why in the ledger`)
        } else {
          add('blocking', 'scope-drift',
            `${drift.length} file(s) outside the declared writes: ${list} — update writes: in this same commit and record why, or the declaration stops describing the work every later predicate reads from it`)
        }
      }
    }
  }

  // 5b. ledger size (advisory) ----------------------------------------
  // Completed steps roll into atomik-project/coding-paths/history/<id>-S0N.md,
  // linked rather than inlined, leaving the path file holding its declaration,
  // its index over those records, its ledger and its next action. Nothing is
  // summarized in that move; it is a move.
  for (const path of paths) {
    if (!changed.includes(path.file) || !path.tokens) continue
    if (path.tokens > LEDGER_TOKEN_BUDGET) {
      add('advisory', 'ledger-size',
        `${path.file} is ~${path.tokens} tokens, over the ${LEDGER_TOKEN_BUDGET} budget — roll its completed steps into ${HISTORY_DIR}/<id>-S0N.md, verbatim and linked, leaving the declaration, the index, the ledger and the next action`)
    }
  }

  // 7. typed work units ----------------------------------------------
  // "Code, tests and documents move together" is the right instinct and the
  // wrong rule: applied to every unit it demands a module note from a typo
  // fix, and the lesson a writer takes from that is to manufacture a
  // documentation delta rather than a coherent one. The declared type makes
  // the requirement exact instead of universal.
  if (onPath && match && workUnits != null) {
    if (changed.includes(match.file)) {
      const step = match.front.current_step
      // Requiring merely "a block somewhere" would pass forever once the first
      // one exists. The block has to be for the step the record says it is on.
      const forStep = step ? workUnits.some((unit) => unit.step === step) : workUnits.length > 0
      if (!forStep) {
        add('blocking', 'work-unit',
          step
            ? `${match.file} changed while declaring current_step ${step}, with no \`cairn-unit\` block for that step — every completed work unit declares its step, ledger ordinal, type (${WORK_UNIT_TYPES.join(' | ')}) and verification`
            : `${match.file} changed with no \`cairn-unit\` block — every completed work unit declares its step, ledger ordinal, type (${WORK_UNIT_TYPES.join(' | ')}) and verification`)
      }
    }
    for (const unit of workUnits) {
      for (const error of workUnitErrors(unit)) {
        add('blocking', 'work-unit', `${match.file}: ${error}`)
      }
    }
  }

  // 8. checkpoint retention — FAIL CLOSED ------------------------------
  // The ledger names its checkpoints and promises another participant can
  // fetch one and resume. A rebase changes every object id and the force-push
  // that follows leaves those promises resolving to nothing — which is not a
  // corner case, it is the central claim failing at the moment the ledger is
  // most complete. The newest unit is exempt because its ref is written
  // immediately after the commit declaring it; every older one must already
  // be reachable.
  if (onPath && match && workUnits != null) {
    const id = String(match.front.id ?? '').toLowerCase()
    for (const unit of retentionDue(workUnits)) {
      const ref = `${CHECKPOINT_REF_PREFIX}/${id}/${unit.unit}`
      if (retainedRefs == null) {
        add('blocking', 'checkpoint-retention',
          `cannot list ${CHECKPOINT_REF_PREFIX}/${id}/* — fetch the retention namespace and rerun the gate; missing evidence is not a pass`,
          'inconclusive')
        break
      }
      if (!retainedRefs.has(ref)) {
        add('blocking', 'checkpoint-retention',
          `${match.file} declares unit ${unit.unit} (${unit.step}) with no retention ref at ${ref} — create it before any rewriting push, or the next rebase orphans that checkpoint`)
      }
    }
    const newest = workUnits.at(-1)
    const newestRef = newest ? `${CHECKPOINT_REF_PREFIX}/${id}/${newest.unit}` : null
    if (newest && retainedRefs != null && !retainedRefs.has(newestRef)) {
      add('advisory', 'checkpoint-retention',
        `unit ${newest.unit} has no retention ref yet — write ${newestRef} once this commit exists, before the next rebase`)
    }

    // Every declared unit resolving a ref is NOT the same as every completed
    // commit being retained: a ref moved forward leaves the commit it used to
    // name unretained while every unit still checks out.
    if (pathCommits != null && retainedRefs != null) {
      const orphaned = unretainedCheckpoints(
        pathCommits, retainedRefs.values(), provisionalCommitOids, head
      )
      if (orphaned.length > 0) {
        add('blocking', 'checkpoint-retention',
          `${orphaned.length} completed commit(s) on this branch are retained by no ref (${orphaned.slice(0, 3).map((oid) => oid.slice(0, 7)).join(', ')}) — a retention ref that moved leaves the commit it used to name orphaned, which is what retention exists to prevent`)
      }
    }
  }

  // 8b. provisional commits --------------------------------------------
  // Incomplete work is pushed rather than held in a working tree, because a
  // working tree is the one place the protocol cannot recover from. The mark
  // is what keeps "complete" meaning something — so a candidate containing a
  // marked commit is a candidate containing work nobody claimed was finished.
  if (onPath && match && match.front.status === 'ready') {
    if (provisionalInCandidate == null) {
      add('blocking', 'provisional',
        `cannot read the commit range for ${match.front.id} — fetch the complete path history and rerun the gate`,
        'inconclusive')
    } else if (provisionalInCandidate.length > 0) {
      add('blocking', 'provisional',
        `${provisionalInCandidate.length} commit(s) between the base and the candidate still carry ${PROVISIONAL_TRAILER}: — fold each into the work unit it was drafting before proposing a candidate (${provisionalInCandidate.slice(0, 3).join(', ')})`)
    }
  }
  if (onPath && headProvisional) {
    add('advisory', 'provisional',
      `HEAD carries ${PROVISIONAL_TRAILER}: — this commit is durable but is not a checkpoint, must not be named as a resume point, and must be folded before a candidate`)
  }

  // 9. scope is bound by digest, not by a pointer -----------------------
  // Implementation is bound to an object id and cannot quietly become
  // something else. `scope_ref` is a file path and a heading, so the sentence
  // it resolves to can be rewritten after acceptance and every record still
  // reads as valid. The digest gives scope the identity the code already had.
  if (onPath && match && CLOSED_STATUSES.includes(match.front.status)) {
    const id = String(match.front.id ?? '')
    const record = closureFor?.(id)
    const exempt = migrationExempt.has(id)
    const opening = openingRecordFor?.(id)
    const expected = scopeDigestFor?.(record?.scope_ref)

    if (expected === undefined) {
      add('blocking', 'scope-digest',
        `cannot resolve ${record?.scope_ref ?? 'the scope_ref'} for ${id} — a scope that cannot be read cannot be shown unchanged`,
        'inconclusive')
    } else if (expected === null) {
      add('blocking', 'scope-digest',
        `${record?.scope_ref ?? 'scope_ref'} names no section in ${match.file} — acceptance must point at text that exists`)
    } else {
      if (!record?.scope_digest) {
        add(exempt ? 'advisory' : 'blocking', 'scope-digest',
          `the closing record for ${id} carries no scope_digest — record ${expected} so closure can prove the definition of done did not move${exempt ? ' (grandfathered: this path predates the rule)' : ''}`)
      } else if (record.scope_digest !== expected) {
        add('blocking', 'scope-digest',
          `the definition of done moved after acceptance: the closing record says ${record.scope_digest}, ${match.file} now digests to ${expected} — restore the accepted text or record a scope amendment`)
      }
      if (opening && !opening.scope_digest) {
        add(exempt ? 'advisory' : 'blocking', 'scope-digest',
          `the opening acceptance for ${id} carries no scope_digest${exempt ? ' and is an immutable record that predates the rule' : ' — a scope accepted without a digest is bound to nothing'}`)
      }
    }
  }

  // 9b. closure moves fields, not files ----------------------------------
  if (onPath && match && CLOSED_STATUSES.includes(match.front.status)) {
    const previous = previousFronts.get(match.file)
    for (const error of closureFieldErrors(previous, match.front)) {
      add('blocking', 'closure-surface', `${match.file}: ${error}`)
    }
  }

  // 10. acceptance drift -------------------------------------------------
  // NOT `trunk === base`. That rule is the obvious one and it livelocks: every
  // landing invalidates every other open acceptance, so where audit plus
  // acceptance outlast the trunk's landing interval nothing ever closes.
  if (onPath && match && match.front.status === 'ready') {
    const record = closureFor?.(String(match.front.id ?? ''))
    if (record?.base) {
      if (trunkDelta == null) {
        add('blocking', 'acceptance-drift',
          `cannot read the trunk delta since ${record.base} — fetch the complete trunk and rerun the gate`,
          'inconclusive')
      } else {
        const drifted = acceptanceDrift(trunkDelta, match.writes ?? [], match.governs ?? [])
        if (drifted.length > 0) {
          add('blocking', 'acceptance-drift',
            `the trunk moved inside this path's declared surfaces since the accepted base ${record.base} (${drifted.slice(0, 3).join(', ')}) — return to running, rebase, and repeat audit and acceptance`)
        }
      }
    }
  }

  // 11. every advisory gets a disposition ---------------------------------
  if (onPath && match && CLOSED_STATUSES.includes(match.front.status)) {
    const id = String(match.front.id ?? '')
    const record = closureFor?.(id)
    const raised = [...new Set(findings.filter((f) => f.level === 'advisory').map((f) => f.rule))]
    if (record && !migrationExempt.has(id)) {
      for (const error of dispositionErrors(
        record.advisory_disposition, record.advisories_at_candidate, raised
      )) {
        add('blocking', 'advisory-disposition', `${id}: ${error}`)
      }
    } else if (record && typeof record.advisory_disposition === 'string') {
      add('advisory', 'advisory-disposition',
        `${id} records advisory_disposition as prose, which nothing can check — the structured list is required for paths opened after this rule`)
    }
  }

  // 12. collapsed roles are recorded, not forbidden ------------------------
  // A solo developer with agents holds all five positions, which makes closing
  // acceptance a signature the signer issued to themselves. Forbidding that
  // would exclude the setup most likely to adopt Cairn first. The requirement
  // is that the weakness is legible instead of invisible.
  if (onPath && match && CLOSED_STATUSES.includes(match.front.status)) {
    const id = String(match.front.id ?? '')
    const opening = openingRecordFor?.(id)
    const closing = closureFor?.(id)
    if (opening?.accepted_by && closing?.accepted_by && opening.accepted_by === closing.accepted_by) {
      add('advisory', 'role-collapse',
        `${opening.accepted_by} recorded both the opening and the closing acceptance for ${id} — a self-issued signature is permitted and must stay visible; this repository cannot claim an enforcement profile above local on its strength`)
    }
  }

  // 13. a spent migration exception is a bypass ---------------------------
  for (const stale of migrationStale) {
    add('blocking', 'migration-debt', stale)
  }

  // 14. the route a change earns ------------------------------------------
  // Not every bounded change deserves the same ceremony. A protocol that
  // demands nine artifacts for a one-line fix teaches people to route around
  // it, and a protocol routed around enforces nothing at all — so the route is
  // the field that prices the rest, and the triggers are what stop it being a
  // self-served discount.
  if (onPath && match) {
    const id = String(match.front.id ?? '')
    const route = match.front.route
    const exempt = migrationExempt.has(id)
    if (!route) {
      add(exempt ? 'advisory' : 'blocking', 'route',
        `${match.file} declares no route: — every path declares ${ROUTES.join(' | ')}${exempt ? ' (grandfathered: this path predates the rule)' : ''}`)
    } else if (!ROUTES.includes(route)) {
      add('blocking', 'route', `${match.file} declares route "${route}", outside ${ROUTES.join(' | ')}`)
    } else {
      const triggers = fullRouteTriggers(match.writes ?? [], areaOf, (workUnits ?? []).length)
      if (route === 'lightweight' && triggers.length > 0) {
        add('blocking', 'route',
          `${match.file} declares route: lightweight while ${triggers.join('; ')} — escalate to full before the next checkpoint and record the trigger in the ledger`)
      }
      if (route === 'foundation') {
        const outside = foundationSurfaceViolations(match.writes ?? [])
        if (outside.length > 0) {
          add('blocking', 'route',
            `a foundation path's work units are documents, but ${match.file} declares ${outside.slice(0, 4).join(', ')} outside docs/ and the path records it produces`)
        }
      }
      const descent = routeDescent(previousFronts.get(match.file)?.route, route)
      if (descent) add('blocking', 'route', `${match.file}: ${descent}`)
    }
  }

  // 15. the handoff brief is a contract -----------------------------------
  // It is the first document a resuming participant reads and, for several
  // minutes, the only one. The SHAPE is checkable; whether it can actually be
  // resumed cold is a judgement and a benchmark, and is not claimed here.
  if (onPath && match && briefFor) {
    const id = String(match.front.id ?? '')
    const brief = briefFor(id)
    const exempt = migrationExempt.has(id)
    if (brief === null) {
      add(exempt ? 'advisory' : 'blocking', 'brief-schema',
        `${id} has no handoff brief — the bootstrap contract is not optional${exempt ? ' (grandfathered)' : ''}`)
    } else if (brief) {
      for (const error of briefErrors(brief.front, brief.body)) {
        add('blocking', 'brief-schema', `${brief.file}: ${error}`)
      }
    }
  }

  // 16. redaction names the record that authorised it ----------------------
  if (redactionRecordExists) {
    for (const file of changed) {
      const markers = redactionRecordExists.markersIn?.(file) ?? []
      for (const marker of markers) {
        if (!redactionRecordExists.has(marker)) {
          add('blocking', 'redaction',
            `${file} carries [redacted: ${marker}] with no redaction record of that id — redaction is a ceremony that names its authority, not an edit wearing one's clothes`)
        }
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
/** Same, but a failure is an ANSWER (`null`), not an exception: a detached
 *  HEAD has no symbolic ref, and that fact is what the caller needs. */
function gitOrNull(args) {
  try {
    // stderr is PIPED, not inherited: "ref HEAD is not a symbolic ref" is the
    // expected answer in a detached checkout, and printing it as an error
    // above a clean verdict teaches people to ignore the output.
    return execFileSync('git', args, {
      cwd: REPO,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim()
  } catch {
    return null
  }
}

function gitRaw(args) {
  return execFileSync('git', args, { cwd: REPO, encoding: 'utf8' })
}

function changedFiles(base) {
  // -z on BOTH halves: the readable forms C-quote any path with a space or a
  // non-ASCII byte, and a quoted path matches no glob and no guarded root (see
  // porcelainPaths). The --base half is the one CI runs, so it had the same
  // hole. NUL separation also removes the "is a newline in this name?" question
  // rather than answering it.
  const working = porcelainPaths(gitRaw(['status', '--porcelain', '-z']))
  if (base) {
    const merge = git(['merge-base', base, 'HEAD'])
    const committed = gitRaw(['diff', '--name-only', '-z', `${merge}..HEAD`]).split('\0')
    return [...new Set([...committed, ...working].filter(Boolean))]
  }
  return working
}

/** The state against which this proposed work is judged. A local working-tree
 * run compares with HEAD; a branch run compares with its trunk merge-base;
 * callers may provide the exact previous CI commit explicitly. */
function comparisonRef(base, explicitPrevious) {
  if (explicitPrevious) {
    return gitOrNull(['rev-parse', '--verify', explicitPrevious])
  }
  if (base) return gitOrNull(['merge-base', base, 'HEAD'])
  return gitOrNull(['rev-parse', 'HEAD'])
}

function frontmatterAt(ref, file) {
  if (!ref) return undefined
  const text = gitOrNull(['show', `${ref}:${file}`])
  if (text == null) {
    // A resolvable ref plus an absent file means a new declaration. A missing
    // ref was rejected above and remains `undefined` (inconclusive).
    return gitOrNull(['rev-parse', '--verify', ref]) == null ? undefined : null
  }
  return readFrontmatter(`${text}\n`)?.data?.atomik ?? undefined
}

function previousPathStates(paths, ref) {
  const states = new Map()
  for (const path of paths) states.set(path.file, frontmatterAt(ref, path.file))
  return states
}

/** `base_commit` is not merely any ancestor. It names the trunk state just
 * before registration, so it must resolve to the first parent of the commit
 * that introduced this path declaration on the trunk. */
function pathRegistrationBaseState(trunkRef, branch, paths) {
  if (!isPathBranch(branch)) return null
  const match = paths.find((path) => path.front?.branch === branch)
  const id = match?.front?.id
  if (!match || !id) return null
  if (LEGACY_UNREGISTERED_PATHS.has(id)) return 'grandfathered'
  if (!gitOrNull(['rev-parse', '--verify', trunkRef])) return null

  const additions = gitOrNull([
    'log', '--diff-filter=A', '--format=%H', '--reverse', trunkRef, '--', match.file
  ])
  const registration = additions?.split('\n').filter(Boolean)[0]
  if (!registration) return null
  const parent = gitOrNull(['rev-parse', `${registration}^`])
  const declared = gitOrNull(['rev-parse', match.front.base_commit])
  if (!parent || !declared) return null
  return parent === declared ? 'match' : 'mismatch'
}

function closureAllowedFiles(path, record) {
  const id = String(path.front?.id ?? '').toLowerCase()
  const subject = String(record?.subject_commit ?? '')
  const exact = new Set([
    path.file,
    `atomik-project/briefs/${id}-handoff.md`,
    `atomik-project/audits/${id}-${subject}.md`,
    record?.__file
  ].filter(Boolean))
  if (path.front?.status === 'done') exact.add(ACTIVE_FILE)
  const journal = new RegExp(
    `^atomik-project/log/\\d{4}-\\d{2}-\\d{2}-${id.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&')}\\.md$`
  )
  return (file) => exact.has(file) || (
    path.front?.status === 'done' && journal.test(file)
  )
}

/** Inspect the commits after the accepted implementation candidate. `ready`
 * allows one administrative closure commit. `done` additionally allows the
 * integrating trunk commit. In both cases the tree diff must be metadata-only. */
function pathClosureState(path, record) {
  const subject = record?.subject_commit
  if (!isObjectId(subject)) return null
  if (!gitOrNull(['rev-parse', '--verify', subject])) return null

  const subjectIsAncestor = (() => {
    try {
      execFileSync('git', ['merge-base', '--is-ancestor', subject, 'HEAD'], {
        cwd: REPO,
        stdio: 'ignore'
      })
      return true
    } catch {
      return false
    }
  })()
  if (!subjectIsAncestor) {
    return { subjectIsAncestor: false, commitsAfterSubject: 0, forbiddenFiles: [] }
  }

  const count = Number(gitOrNull(['rev-list', '--count', `${subject}..HEAD`]))
  const files = gitRaw(['diff', '--name-only', '-z', `${subject}..HEAD`])
    .split('\0')
    .filter(Boolean)
  const allowed = closureAllowedFiles(path, record)
  return {
    subjectIsAncestor: true,
    commitsAfterSubject: Number.isFinite(count) ? count : null,
    forbiddenFiles: files.filter((file) => !allowed(file))
  }
}

/** Existing append-only records may not be rewritten in either committed or
 * working-tree changes. An unavailable comparison ref is inconclusive. */
function immutableRecordMutations(ref) {
  if (!ref || !gitOrNull(['rev-parse', '--verify', ref])) return null
  const working = porcelainMutations(gitRaw(['status', '--porcelain', '-z']))
  const committed = nameStatusMutations(gitRaw([
    'diff', '--diff-filter=MDRTUXB', '--name-status', '-z', `${ref}..HEAD`
  ]))
  return [...new Set([...committed, ...working])]
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

/**
 * Is the current path HEAD present on its configured upstream?
 *
 * This deliberately reads local remote-tracking refs and performs no network
 * operation. `git push` updates that ref; a later session may fetch before
 * checking. The result can identify a CURRENT missing checkpoint, never prove
 * the historical timing of older pushes.
 */
/** Local retention refs for one path, as ref → object id.
 *
 *  Deliberately LOCAL. `git ls-remote` would prove the ref reached the remote
 *  and would also make the gate depend on the network, so a plane ride or a
 *  restricted runner would turn a protocol failure into a protocol pass. The
 *  ref is written locally and pushed in the same breath; `remote-checkpoint`
 *  already carries the separate, advisory question of what the remote has. */
/** The digest of the text a `scope_ref` actually resolves to, right now.
 *  `undefined` means the reference could not be read at all — inconclusive,
 *  never a pass. `null` means the file exists and names no such section. */
function scopeDigestOf(scopeRef) {
  if (!scopeRef) return undefined
  const [file, anchor] = String(scopeRef).split('#')
  const local = file.replace(/^project\//, `${PATH_DIR.split('/')[0]}/`)
  const target = existsSync(join(REPO, file))
    ? file
    : existsSync(join(REPO, local)) ? local : null
  if (!target) return undefined
  const section = resolveScopeSection(readFileSync(join(REPO, target), 'utf8'), anchor)
  return section == null ? null : scopeDigest(section)
}

/** Previous frontmatter AND previous declared writes, keyed so one map can
 *  carry both without a second parameter: `<file>` and `<file>::writes`. */
function previousFrontStates(paths, ref) {
  const states = new Map()
  if (!ref) return states
  for (const path of paths) {
    const text = gitOrNull(['show', `${ref}:${path.file}`])
    if (text == null) continue
    const front = readFrontmatter(text)?.data?.atomik ?? null
    if (front) states.set(path.file, front)
    states.set(`${path.file}::writes`, parseWrites(text))
  }
  return states
}

/** Files the trunk changed since the base an acceptance was recorded against. */
function trunkDeltaSince(base, trunkRef) {
  if (!isCommitPin(base)) return []
  if (!gitOrNull(['rev-parse', '--verify', base])) return null
  const raw = gitOrNull(['diff', '--name-only', '-z', base, trunkRef])
  if (raw == null) return null
  return raw.split('\0').filter(Boolean)
}

/** The handoff brief for a path: `null` when there is none, an object when
 *  there is. The distinction matters — a missing brief and an unreadable one
 *  are different findings. */
function briefRecord(pathId) {
  const rel = `atomik-project/briefs/${String(pathId).toLowerCase()}-handoff.md`
  if (!existsSync(join(REPO, rel))) return null
  const text = readFileSync(join(REPO, rel), 'utf8')
  const parsed = readFrontmatter(text)
  const front = parsed?.data?.atomik ?? parsed?.data ?? null
  const body = text.startsWith('---\n')
    ? text.slice(text.indexOf('\n---', 4) + 4)
    : text
  return { file: rel, front, body }
}

/** Redaction records and the markers that must point at one. */
function redactionIndex() {
  const ids = new Set()
  if (existsSync(join(REPO, SESSION_DIR))) {
    for (const file of readdirSync(join(REPO, SESSION_DIR))) {
      if (file.includes('redaction')) ids.add(file.replace(/\.md$/, ''))
    }
  }
  return {
    has: (marker) => ids.has(marker),
    markersIn: (file) => {
      const absolute = join(REPO, file)
      if (!file.endsWith('.md') || !existsSync(absolute)) return []
      return redactionMarkers(readFileSync(absolute, 'utf8'))
    }
  }
}

function retainedCheckpointRefs(pathId) {
  if (!pathId) return new Map()
  const prefix = `${CHECKPOINT_REF_PREFIX}/${String(pathId).toLowerCase()}`
  const raw = gitOrNull(['for-each-ref', '--format=%(refname) %(objectname)', prefix])
  if (raw == null) return null
  const refs = new Map()
  for (const line of raw.split('\n')) {
    const [ref, oid] = line.trim().split(/\s+/)
    if (ref && oid) refs.set(ref, oid)
  }
  return refs
}

/** Commits between the recorded base and the proposed candidate that still
 *  announce themselves as incomplete. */
function provisionalCommits(from, to) {
  if (!isCommitPin(from) || !isCommitPin(to)) return []
  const raw = gitOrNull([
    'log', '--format=%h', `--grep=^${PROVISIONAL_TRAILER}:`, `${from}..${to}`
  ])
  if (raw == null) return null
  return raw.split('\n').map((line) => line.trim()).filter(Boolean)
}

/** Path-branch commits, oldest first, from the registered base to HEAD. */
function branchCommits(base) {
  if (!isCommitPin(base)) return null
  const raw = gitOrNull(['log', '--format=%H', '--reverse', `${base}..HEAD`])
  if (raw == null) return null
  return raw.split('\n').map((line) => line.trim()).filter(Boolean)
}

/** Commits that announced themselves incomplete, and so are not checkpoints. */
function provisionalOids(base) {
  if (!isCommitPin(base)) return new Set()
  const raw = gitOrNull([
    'log', '--format=%H', `--grep=^${PROVISIONAL_TRAILER}:`, `${base}..HEAD`
  ])
  if (raw == null) return new Set()
  return new Set(raw.split('\n').map((line) => line.trim()).filter(Boolean))
}

function headCarriesProvisionalTrailer() {
  const raw = gitOrNull(['log', '-1', '--format=%B', 'HEAD'])
  return raw != null && new RegExp(`^${PROVISIONAL_TRAILER}:`, 'm').test(raw)
}

function pathRemoteCheckpoint(branch) {
  if (!isPathBranch(branch)) return null

  let upstream
  try {
    upstream = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'])
  } catch {
    return { state: 'missing', upstream: null }
  }

  try {
    execFileSync('git', ['merge-base', '--is-ancestor', 'HEAD', upstream], {
      cwd: REPO,
      stdio: 'ignore'
    })
    return { state: 'published', upstream }
  } catch {
    return { state: 'unpushed', upstream }
  }
}

/**
 * Does a ceremony of this KIND exist for this path?
 *
 * Both halves are declared the same way, in root-level frontmatter, and matched
 * on the exact path id (bedrock 24 § Session note and ceremony template).
 */
export function ceremonyOfKind(sessions, pathId, kind) {
  return sessions.some(
    (note) => note?.path === pathId && String(note?.ceremony).toLowerCase() === kind
  )
}

/**
 * Does a CLOSING ceremony exist for this path?
 *
 * This used to substring-match session FILENAMES. `paths.md` requires an
 * opening check, recorded in a session note, before a path may branch — so a
 * matching filename exists from the path's first hour, and the rule could not
 * return a finding for any path that followed the protocol. It verified that
 * the path was OPENED and reported that as proof it was CLOSED (audit
 * 2026-08-24, finding F2). With the integrator gone this is the only human
 * guard left on a merge, and it was a tautology.
 *
 * A ceremony is now DECLARED, in frontmatter, by the note that is one:
 *
 *     path: CP-MVP-010
 *     ceremony: closing
 *
 * Filename substrings are not a schema. `path` must match exactly so that
 * CP-MVP-001 is never satisfied by a note about CP-MVP-0010.
 */
export function ceremonyFromSessions(sessions, pathId) {
  return ceremonyOfKind(sessions, pathId, 'closing')
}

export function closingRecordFromSessions(sessions, pathId, subjectCommit = null) {
  const matches = sessions.filter(
    (note) =>
      note?.path === pathId &&
      String(note?.ceremony).toLowerCase() === 'closing' &&
      (!subjectCommit || note?.subject_commit === subjectCommit)
  )
  return matches.at(-1) ?? null
}

/**
 * Does an OPENING check exist for this path?
 *
 * `paths.md`: activation needs the owner's explicit acceptance, recorded in a
 * session note. That was the one ceremony nothing checked — the closing gate was
 * repaired at F2 while its twin stayed a convention, so a path could be
 * registered, branched and worked with no recorded acceptance at all.
 *
 * Scoped like the closing gate: it fires only on a path file IN THE DIFF that
 * declares `running`. The eight paths that predate session notes are never
 * examined, because a change that does not touch them cannot make them wrong.
 */
export function openingFromSessions(sessions, pathId) {
  return ceremonyOfKind(sessions, pathId, 'opening')
}

/** The opening record itself, not merely the fact that one exists. Closure
 *  needs its `accepted_by` to see a collapsed reviewer, and its `scope_digest`
 *  to prove the definition of done did not move after it was accepted. */
export function openingRecordFromSessions(sessions, pathId) {
  const matches = sessions.filter(
    (note) => note?.path === pathId && String(note?.ceremony).toLowerCase() === 'opening'
  )
  return matches.at(-1) ?? null
}

function loadSessions() {
  try {
    return readdirSync(join(REPO, SESSION_DIR))
      .filter((file) => file.endsWith('.md'))
      .sort()
      .map((file) => ({
        ...(readFrontmatter(readFileSync(join(REPO, SESSION_DIR, file), 'utf8'))?.data ?? {}),
        __file: `${SESSION_DIR}/${file}`
      }))
  } catch {
    return []
  }
}

function hasCeremony(pathId) {
  return ceremonyFromSessions(loadSessions(), pathId)
}

function closingRecord(pathId, subjectCommit = null) {
  return closingRecordFromSessions(loadSessions(), pathId, subjectCommit)
}

function hasOpening(pathId) {
  return openingFromSessions(loadSessions(), pathId)
}

function loadAdrs() {
  if (!existsSync(join(REPO, ADR_DIR))) return []
  return readdirSync(join(REPO, ADR_DIR))
    .filter((file) => file.startsWith('ADR-') && file.endsWith('.md'))
    .map((file) => {
      const rel = `${ADR_DIR}/${file}`
      const text = readFileSync(join(REPO, rel), 'utf8')
      const parsed = readFrontmatter(text)
      return {
        file: rel,
        front: parsed?.data?.adr ?? null,
        bodyStatus: /^Status:\s*(\S+)/m.exec(text)?.[1] ?? null,
        parseError: parsed?.error ?? null
      }
    })
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
      return {
        file: rel,
        front,
        writes: parseWrites(text),
        governs: Array.isArray(front?.governs) ? front.governs : [],
        tokens: approxTokens(text),
        parseError: parsed?.error ?? null
      }
    })
}

/** Days since the last commit on each declared path branch, for
 *  `staleRunningPaths`. A branch this checkout cannot resolve is simply
 *  ABSENT from the result rather than being given a number — the caller
 *  treats missing as "no opinion", never as stale. */
function branchAges(paths) {
  const ages = {}
  const now = Date.now()
  for (const path of paths) {
    const branch = path.front?.branch
    if (!branch || branch in ages) continue
    try {
      const at = execFileSync('git', ['log', '-1', '--format=%ct', branch], {
        cwd: REPO,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
      }).trim()
      if (at) ages[branch] = Math.floor((now - Number(at) * 1000) / 86_400_000)
    } catch {
      // unresolvable branch: no entry, no opinion
    }
  }
  return ages
}

/** Schema + link integrity over the whole corpus, not just the diff: these
 *  are cheap and catching them late is the expensive part. */
function corpusFindings(branch, trunkRef = 'master') {
  const findings = []
  const corpus = loadPaths()

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
  // Its architectural JUDGMENT is never machine-scored. Its existence,
  // completeness and exact candidate binding are objective closure facts.
  if (isPathBranch(branch)) {
    const path = corpus.find((entry) => entry.front?.branch === branch)
    if (path?.front?.status === 'ready') {
      try {
        execFileSync('node', [
          join(REPO, 'tools/cairn-audit.mjs'),
          '--check',
          '--subject',
          path.front.subject_commit,
          '--branch',
          branch
        ], {
          cwd: REPO,
          stdio: 'pipe'
        })
      } catch {
        findings.push({
          level: 'blocking',
          rule: 'coherence-audit',
          message: `no filled coherence audit bound to ${path.front.subject_commit} — audit that exact candidate before declaring ready`
        })
      }
    }
  }

  // A `running` path that has gone quiet needs a push or an archive (ADR-017).
  // Advisory forever: see PATH_STALE_DAYS.
  for (const stale of staleRunningPaths(corpus, branchAges(corpus))) {
    findings.push({
      level: 'advisory',
      rule: 'path-staleness',
      message: `${stale.id} declares running but ${stale.branch} has had no commit for ${stale.days} days (> ${PATH_STALE_DAYS}) — push the work, or move it to archived`
    })
  }

  for (const path of corpus) {
    if (path.parseError) {
      findings.push({ level: 'blocking', rule: 'schema', message: `${path.file}: ${path.parseError}` })
      continue
    }
    for (const error of pathFrontmatterErrors(path.front, path.file)) {
      findings.push({
        level: 'blocking',
        rule: 'schema',
        message: `${path.file}: ${error}`
      })
    }
  }

  for (const error of duplicatePathIdentityFindings(corpus)) {
    findings.push({ level: 'blocking', rule: 'schema', message: error })
  }

  for (const adr of loadAdrs()) {
    if (adr.parseError) {
      findings.push({ level: 'blocking', rule: 'schema', message: `${adr.file}: ${adr.parseError}` })
      continue
    }
    for (const error of adrFrontmatterErrors(adr.front, adr.file, adr.bodyStatus)) {
      findings.push({ level: 'blocking', rule: 'schema', message: `${adr.file}: ${error}` })
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
  const explicitPrevious = argv.includes('--previous')
    ? argv[argv.indexOf('--previous') + 1]
    : null
  const asJson = argv.includes('--json')
  const flag = argv.includes('--branch') ? argv[argv.indexOf('--branch') + 1] : null

  const { branch, source: branchSource } = resolveBranch({
    flag,
    env: process.env,
    symbolicRef: gitOrNull(['symbolic-ref', '--short', 'HEAD']),
    abbrevRef: git(['rev-parse', '--abbrev-ref', 'HEAD'])
  })
  const changed = changedFiles(base)
  const paths = loadPaths()
  const pathForBranch = paths.find((path) => path.front?.branch === branch) ?? null
  const trunkRef = base ?? 'master'
  const previousRef = comparisonRef(base, explicitPrevious)
  const stateChanged = previousRef ? changedFiles(previousRef) : changed
  // Record immutability is forward-scoped per proposed change. CI passes the
  // previous pushed SHA; an ordinary local run compares the working tree with
  // HEAD. The broader trunk merge-base can predate the rule and would punish
  // historical migrations that were valid under their then-current schema.
  const recordRef = explicitPrevious ? previousRef : comparisonRef(null, null)
  const findings = [
    ...corpusFindings(branch, trunkRef),
    ...evaluate({
      changed,
      stateChanged,
      branch,
      paths,
      resolveFile: (file) => existsSync(join(REPO, file)),
      trunkContained: trunkContained(trunkRef),
      registrationState: pathRegistrationState(trunkRef, branch, paths),
      registrationBaseState: pathRegistrationBaseState(trunkRef, branch, paths),
      remoteCheckpoint: pathRemoteCheckpoint(branch),
      closureFor: closingRecord,
      closureStateFor: pathClosureState,
      openingFor: hasOpening,
      previousPaths: previousPathStates(paths, previousRef),
      immutableMutations: immutableRecordMutations(recordRef),
      branchSource,
      workUnits: pathForBranch ? parseWorkUnits(readFileSync(join(REPO, pathForBranch.file), 'utf8')) : null,
      scopeDigestFor: scopeDigestOf,
      openingRecordFor: (id) => openingRecordFromSessions(loadSessions(), id),
      previousFronts: previousFrontStates(paths, previousRef),
      trunkDelta: pathForBranch?.front?.status === 'ready'
        ? trunkDeltaSince(closingRecord(pathForBranch.front.id)?.base, trunkRef)
        : [],
      migrationStale: migrationDebt(paths),
      briefFor: briefRecord,
      redactionRecordExists: redactionIndex(),
      retainedRefs: retainedCheckpointRefs(pathForBranch?.front?.id),
      pathCommits: pathForBranch ? branchCommits(pathForBranch.front?.base_commit) : null,
      provisionalCommitOids: provisionalOids(pathForBranch?.front?.base_commit),
      head: gitOrNull(['rev-parse', 'HEAD']),
      provisionalInCandidate: pathForBranch
        ? provisionalCommits(pathForBranch.front?.base_commit, pathForBranch.front?.subject_commit)
        : [],
      headProvisional: headCarriesProvisionalTrailer()
    })
  ]

  const blocking = findings.filter((f) => f.level === 'blocking')
  const inconclusive = blocking.filter((f) => f.outcome === 'inconclusive')
  const failed = blocking.filter((f) => f.outcome !== 'inconclusive')
  const advisory = findings.filter((f) => f.level === 'advisory')

  if (asJson) {
    console.log(JSON.stringify({ branch, changed: changed.length, findings }, null, 2))
  } else {
    console.log(`cairn-check — branch ${branch}, ${changed.length} changed file(s)`)
    for (const group of [
      ['FAIL', failed],
      ['INCONCLUSIVE', inconclusive],
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
        : `\nFAILED — ${failed.length} failed, ${inconclusive.length} inconclusive`
    )
  }
  process.exit(blocking.length === 0 ? 0 : 1)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
