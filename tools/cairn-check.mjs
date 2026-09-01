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
 *   node tools/cairn-check.mjs [--base <ref>] [--previous <ref>]
 *                              [--working-tree] [--branch <name>] [--json]
 *
 * On a `path/*` branch the base DEFAULTS to the trunk, because that is the
 * comparison which decides the merge. `--working-tree` opts out of it.
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
import { CAIRN_CONFIG, REPO, metadataOf, slash } from './cairn-config.mjs'

export const METADATA_NAMESPACE = CAIRN_CONFIG.metadataNamespace
export const PROJECT_DIR = CAIRN_CONFIG.roots.project
export const DOCUMENTATION_DIR = CAIRN_CONFIG.roots.documentation
export const PATH_DIR = `${PROJECT_DIR}/coding-paths`
export const SESSION_DIR = `${PROJECT_DIR}/sessions`
export const AUDIT_DIR = `${PROJECT_DIR}/audits`
export const BRIEF_DIR = `${PROJECT_DIR}/briefs`
export const JOURNAL_DIR = `${PROJECT_DIR}/log`
export const ADR_DIR = CAIRN_CONFIG.roots.decisions
export const MODULE_DIR = CAIRN_CONFIG.roots.modules
export const DEFAULT_ROUTE = CAIRN_CONFIG.defaultRoute

export function effectiveBinding(config = CAIRN_CONFIG) {
  return {
    version: config.version,
    enforcementProfile: config.enforcementProfile,
    trunk: config.trunk,
    remote: config.remote,
    metadataNamespace: config.metadataNamespace,
    defaultRoute: config.defaultRoute,
    documentationRoot: config.roots.documentation,
    projectRoot: config.roots.project,
    sourceRoots: [...config.roots.source]
  }
}

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
 * file per entry under the configured project log, and the root module note is an
 * index over per-area notes. What survives here is a warning — edit it by hand
 * and you are hand-writing something that is meant to be regenerated.
 *
 * This became load-bearing when the integrator role was removed: with every
 * path merging itself, deriving is the only thing keeping shared files
 * unshared.
 */
export const SINGLE_TRUTH = CAIRN_CONFIG.sharedFiles

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
export const JOURNAL = `${PROJECT_DIR}/log.md`

/** The running-paths view in ACTIVE.md is DERIVED from path declarations
 *  registered on the trunk before implementation branches. Registration makes
 *  the inputs globally complete; tools/cairn-active.mjs keeps the output
 *  single-sourced. Both halves are required when there is no integrator. */
export const ACTIVE_FILE = `${PATH_DIR}/ACTIVE.md`
export const PATHS_BEGIN = '<!-- cairn:paths:begin -->'
export const PATHS_END = '<!-- cairn:paths:end -->'

/** Both shapes a path declaration takes, capturing the id either one declares:
 *  the flat `CP-<id>.md`, and the folder `CP-<id>/index.md` a path is born in
 *  under ADR-020 decision 4. */
const DECLARATION_FILE = new RegExp(`^${PATH_DIR}/(CP-[^/]+?)(?:\\.md|/index\\.md)$`)
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
/** One file per integrated outcome. `log.md` beside it is the frozen archive. */
const HISTORY_DIR = `${PATH_DIR}/history`
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
 * configured by `cairn.config.json`.
 */
export const PATH_STALE_DAYS = CAIRN_CONFIG.staleAfterDays

/**
 * These paths were already running before trunk registration became a rule.
 * They cannot be made historically registered without rewriting their base;
 * keep the migration finite and named instead of adding a general bypass.
 */
export const LEGACY_UNREGISTERED_PATHS = new Set(CAIRN_CONFIG.migration.unregisteredPaths)

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
export const LEGACY_UNDECLARED_OPENINGS = new Set(CAIRN_CONFIG.migration.undeclaredOpenings)

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
export const DECISION_PLANE = [
  slash(CAIRN_CONFIG.roots.architecture),
  slash(CAIRN_CONFIG.roots.decisions)
]

/** A foundation path's work units are documents, so its write surface is
 *  documents plus the draft path records it produces — and nothing else. */
const prefixPattern = (path) => new RegExp(`^${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:/|$)`)
export const FOUNDATION_SURFACE = [
  prefixPattern(DOCUMENTATION_DIR),
  prefixPattern(`${PROJECT_DIR}/coding-paths`),
  prefixPattern('project')
]

export const V02_MIGRATION_PATHS = new Set(CAIRN_CONFIG.migration.v02Records)

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
 *  committed. `g<NN>` is the GENERATION — one linear version of the branch,
 *  opened when the branch is created or rewritten (ADR-021).
 *
 *      refs/cairn/checkpoints/<path-id>/g<NN>/<n>
 *
 *  The `g` prefix is not decoration. A Git ref is a path, so a ref cannot be
 *  both a leaf and a directory: with an ordinal generation segment,
 *  `…/cp-ops-002/01/14` is refused while the flat `…/cp-ops-002/01` exists.
 *  Keeping the generation out of the ordinal alphabet is what lets refs written
 *  before this notation stay exactly where they are. */
export const CHECKPOINT_REF_PREFIX = CAIRN_CONFIG.checkpointRetentionRef
export const RETENTION_ENABLED = CHECKPOINT_REF_PREFIX !== null

/** A generation segment. Two digits is the notation; more are accepted rather
 *  than silently reclassified as pre-notation. */
export const GENERATION_SEGMENT = /^g(\d{2,4})$/

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
  const front = metadataOf(readFrontmatter(text)?.data)
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
  if (!front) return [`missing ${METADATA_NAMESPACE}: frontmatter block`]
  const errors = []
  if (!front.id) errors.push(`missing ${METADATA_NAMESPACE}.id`)
  else {
    if (!/^CP-[A-Z0-9][A-Z0-9-]*$/.test(front.id)) {
      errors.push(`${METADATA_NAMESPACE}.id must use canonical CP-<UPPERCASE-ID> form`)
    }
    // Two shapes carry a path record, and the identity lives in a different
    // segment of each: `CP-<id>.md` names it in the file, `CP-<id>/index.md`
    // names it in the folder (ADR-020 decision 4). Reading only the last segment
    // would tell every migrated record that its id is `index`.
    const parts = file?.split('/') ?? []
    const last = parts.at(-1)
    const named = last === 'index.md' ? parts.at(-2) : last?.replace(/\.md$/, '')
    const shape = last === 'index.md' ? `${front.id}/index.md` : `${front.id}.md`
    if (last && named !== front.id) {
      errors.push(`${METADATA_NAMESPACE}.id "${front.id}" does not match the record's own name (expected ${shape}, got ${parts.slice(-2).join('/')})`)
    }
  }
  if (!PATH_STATUSES.includes(front.status)) {
    errors.push(`status "${front.status}" is outside the vocabulary (${PATH_STATUSES.join(' | ')})`)
  }
  if (['running', 'blocked', 'ready'].includes(front.status) && !front.branch) {
    errors.push(`status "${front.status}" requires ${METADATA_NAMESPACE}.branch`)
  }
  if (
    ['running', 'blocked', 'ready'].includes(front.status) &&
    front.id &&
    front.branch &&
    front.branch !== `path/${front.id.toLowerCase()}`
  ) {
    errors.push(`${METADATA_NAMESPACE}.branch must equal path/${front.id.toLowerCase()}`)
  }
  if (['running', 'blocked', 'ready'].includes(front.status) && !isCommitPin(front.base_commit)) {
    errors.push(`status "${front.status}" requires ${METADATA_NAMESPACE}.base_commit as a 7–64 digit Git hash`)
  }
  if (front.status === 'ready' && !isObjectId(front.subject_commit)) {
    errors.push(`status "ready" requires ${METADATA_NAMESPACE}.subject_commit as a full object id — ${OBJECT_ID_FORMATS}`)
  }
  if (front.status === 'archived' && front.resolution && !PATH_RESOLUTIONS.includes(front.resolution)) {
    errors.push(
      `${METADATA_NAMESPACE}.resolution "${front.resolution}" is outside the vocabulary (${PATH_RESOLUTIONS.join(' | ')})`
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
  slash(SESSION_DIR),
  slash(AUDIT_DIR),
  `${HISTORY_DIR}/`,
  slash(JOURNAL_DIR)
]

/** A step record inside a born-sliced path folder (ADR-020 decision 4). These
 *  were protected while they lived in `history/`, and a record does not stop
 *  being append-only by moving house. Unlike event records, a step record MAY
 *  grow by exact suffix append; changing any earlier byte is still a rewrite. */
const PATH_STEP_RECORD = new RegExp(`^${PATH_DIR}/CP-[^/]+/steps/[^/]+$`)

export function isAppendOnlyStepRecord(file) {
  if (!PATH_STEP_RECORD.test(String(file ?? ''))) return false
  return !['index.md', 'log.md', '.gitkeep'].includes(String(file).split('/').at(-1))
}

/** Only ledger steps may change address. Immutable event records keep both
 * their content and their original path; a correction supersedes them. */
export function isStepRecordRelocation(from, to) {
  const sourceIsStep = isAppendOnlyStepRecord(from) ||
    String(from ?? '').startsWith(`${HISTORY_DIR}/`)
  return sourceIsStep && isAppendOnlyStepRecord(to)
}

export function isImmutableRecord(file) {
  if (file === JOURNAL) return true
  const known = IMMUTABLE_RECORD_PREFIXES.some((prefix) => file.startsWith(prefix)) ||
    isAppendOnlyStepRecord(file)
  if (!known) return false
  return !['index.md', 'log.md', '.gitkeep'].includes(file.split('/').at(-1))
}

/**
 * Did an append-only record preserve everything it already said?
 *
 * In place, the old blob must be an exact byte prefix. During a relocation,
 * link targets may be repointed because the same destination has a different
 * relative address; `isVerbatimRelocation` normalises only those addresses and
 * still requires the entire earlier record to be a prefix.
 */
export function preservesAppendOnlyRecord(before, after, relocated = false) {
  if (before == null || after == null || String(before).length === 0) return false
  return relocated
    ? isVerbatimRelocation(before, after)
    : String(after).startsWith(String(before))
}

/**
 * Is this rename the SAME RECORD, relocated?
 *
 * `record-integrity` protects a record from being rewritten or from ceasing to
 * exist. It used to key on the file path, so it read a move as both — which is
 * how a migration that changed nothing about twenty-three records reported
 * twenty-three violations (CP-OPS-002 S08l). A path is where a record sits; it
 * is not what the record is.
 *
 * Two operations are sanctioned on a record that moves, and no others.
 * REPOINTING a link, because a link is an address rather than content and the
 * same target must keep resolving — the `history/` rollup convention already
 * said so. And APPENDING, because that is how a record grows without any earlier
 * sentence changing. So: strip every link target from both sides, and the old
 * text must be a PREFIX of the new one. Anything else is a rewrite wearing a
 * rename, and the frontmatter — which sits at the very start — is covered by the
 * same test, so a relocation cannot quietly change what record it claims to be.
 */
export function isVerbatimRelocation(before, after) {
  const strip = (text) => String(text ?? '').replace(/\]\([^)]*\)/g, '](-)')
  const from = strip(before)
  return from.length > 0 && strip(after).startsWith(from)
}

/** The ISO date at the head of a string, or null. Used on a filename and on a
 *  frontmatter `timestamp:`, which is why it accepts a trailing remainder. */
export function dateOf(value) {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(value ?? ''))
  return match ? match[1] : null
}

export function filenameDate(file) {
  return dateOf(String(file ?? '').split('/').at(-1))
}

/**
 * Two ISO dates written under different timezone conventions can name adjacent
 * calendar days for the same moment. A record written at 23:50 and committed
 * twenty minutes later is not misdated, and blocking it would make the author
 * write a date they know is wrong in order to satisfy a gate.
 */
export const RECORD_DATE_TOLERANCE_DAYS = 1

function daysApart(a, b) {
  return Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000
}

/**
 * A DATED RECORD SHOULD CARRY THE DATE OF THE EVENT IT RECORDS, and this
 * function is two different attempts at that sentence, kept apart on purpose.
 *
 * `disagreement` compares the two dates the AUTHOR wrote — the one in the
 * filename and the one in `timestamp:`. Objective, clock-free, and blocking:
 * when they differ, one of them is false and the record says so itself.
 *
 * `drift` compares the date the record CLAIMS with the date the commit that
 * introduced it was authored on. It is the only half carrying evidence the
 * author did not supply, and the only half that can see the defect this rule
 * was proposed for: every CP-UI-TYPOGRAPHY record was dated `2026-08-27` in
 * BOTH places while the ceremony, the audit and the journal entry happened on
 * the 31st. The author-agreement half is blind to that by construction.
 *
 * It stays ADVISORY, because a lag is not automatically a lie: a note taken on
 * one day and committed two days later is dated correctly, and a rule insisting
 * the two agree would block it. The evidence is real; the inference from it is a
 * judgement, and this protocol does not let a judgement fail a build.
 *
 * Pure: the caller supplies every date, so the checker never needs to know what
 * day it is.
 */
export function recordDateFindings(records) {
  const out = []
  for (const { file, named, declared, addedOn } of records) {
    if (named && declared && named !== declared) {
      out.push({ file, kind: 'disagreement', named, declared })
      continue
    }
    const carried = declared ?? named
    if (!carried || !addedOn) continue
    const drift = daysApart(carried, addedOn)
    if (Number.isFinite(drift) && drift > RECORD_DATE_TOLERANCE_DAYS) {
      out.push({ file, kind: 'drift', carried, addedOn, drift })
    }
  }
  return out
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

/** A path branch is `path/<id>`; everything else (the configured trunk, a bootstrap branch)
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

/** Where the concept wiki lives. A concept note is one idea, and the normative
 *  and learning text links to it instead of redefining it. */
export const CONCEPTS_DIR = CAIRN_CONFIG.roots.concepts

/**
 * A concept note nothing points at.
 *
 * REPLACES A HARD CAP, and the replacement is the point. The wiki carried a
 * blocking assertion that the article count stay under a fixed number. Its own
 * history: 66 at S07g, 67 at S07o, 71 at S07q — raised to exactly the new count
 * every time, so it never once bound. It also failed this protocol's admission
 * test (a further concept is not WRONG in the repository, only unconventional),
 * and it could be satisfied by merging two unrelated articles, which breaks the
 * one-idea rule while the number holds.
 *
 * Vocabulary bloat is real, but it begins where a word is added that nothing
 * needed — not at an arbitrary threshold. An unreferenced note is that, it is
 * objectively checkable, and its breach leaves something genuinely wrong: a page
 * no reader can arrive at. Growth itself is reported separately and never blocks
 * (ADR-020 decision 2b, owner ruling 2026-08-31).
 *
 * Pure: the caller supplies the file list and the set of linked targets.
 */
export function namesForReading(names, limit = 5) {
  return names.length <= limit
    ? names.join(', ')
    : `${names.slice(0, limit).join(', ')}, and ${names.length - limit} more`
}

export function orphanConcepts(conceptFiles, linkedTargets) {
  const linked = linkedTargets instanceof Set ? linkedTargets : new Set(linkedTargets)
  return conceptFiles.filter((file) => file !== 'index.md' && !linked.has(file))
}

/** Concept notes present now and absent at the comparison ref. `null` previous
 *  means the ref could not be read, which is not evidence of no growth — the
 *  caller reports nothing rather than claiming a number it does not have. */
export function addedConcepts(previous, current) {
  if (previous == null) return null
  const before = new Set(previous)
  return current.filter((file) => file !== 'index.md' && !before.has(file))
}

/** The trunk this repository integrates into, supplied by the host binding so
 *  the base default and the rebase gate cannot drift apart. */
export const TRUNK_BRANCH = CAIRN_CONFIG.trunk
export const REMOTE = CAIRN_CONFIG.remote
export const ENFORCEMENT_PROFILE = CAIRN_CONFIG.enforcementProfile

/** Tried in order. `<configured-remote>/<trunk>` first because it is the ref CI compares
 *  against, and gate parity is about matching CI rather than matching the
 *  local checkout. The local branch is the fallback for a clone with no
 *  remote, and it is a WEAKER answer: it can sit behind the real trunk. */
export const TRUNK_BASE_CANDIDATES = [`${REMOTE}/${TRUNK_BRANCH}`, TRUNK_BRANCH]

/**
 * WHICH BASE? The question every changed-file rule silently inherits.
 *
 * `npm run cairn-check` used to compare the WORKING TREE with HEAD, while CI
 * compared the BRANCH with the trunk. Both answers are correct about the
 * question they were asked, and only the second one decides the merge. On
 * `path/cp-ops-002` the local run saw 0 changed files and printed OK for many
 * pushes while CI saw 224 and reported nine blocking findings (S08 finding 5).
 *
 * The verdict a developer runs must therefore be the merge-deciding one by
 * DEFAULT, on the branch where a merge is pending. Narrowing it stays
 * available — `--working-tree` — because an uncommitted-only run is genuinely
 * useful mid-edit; it is now an opt-out, and it announces itself through
 * `base-parity` so a ledger cannot record a narrow verdict as a full one.
 *
 * Pure: the caller supplies ref resolution, so the decision is testable
 * without a repository.
 */
export function resolveBase({ flag = null, workingTree = false, branch, refExists = () => false }) {
  if (flag) return { base: flag, source: 'flag' }
  if (workingTree) return { base: null, source: 'opt-out' }
  // Off a path branch there is no pending merge to decide, so the working
  // tree is the right question and no parity claim is being made.
  if (!isPathBranch(branch)) return { base: null, source: 'trunk-work' }
  const resolved = TRUNK_BASE_CANDIDATES.find((ref) => refExists(ref))
  if (resolved) return { base: resolved, source: 'default-trunk' }
  // An unfetched or remote-less checkout cannot be given the merge-deciding
  // comparison. Fall back rather than refuse — and SAY SO, because a silent
  // fallback is the exact defect this function exists to remove.
  return { base: null, source: 'unresolvable' }
}

/** Roots where an unenforced protocol leaves something WRONG in the repo
 *  rather than merely unconventional — the admission test for blocking. */
export const GUARDED_ROOTS = CAIRN_CONFIG.roots.source.map(slash)

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
export const AREA_MAP = CAIRN_CONFIG.areas.map((area) => ({
  ...area,
  patterns: area.match.map(globToRegExp)
}))

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
 * Split a path's retention refs into generations.
 *
 * A ref written before ADR-021 has no generation segment. It is NOT reclassified
 * and NOT moved — moving a retention ref is the violation the whole rule exists
 * to catch — so it is reported separately, under `preNotation`, and judged for
 * reachability only. The flat namespace mixes two generations by construction
 * and cannot be made internally consistent without moving something.
 */
export function retentionGenerations(refs, pathId) {
  if (!RETENTION_ENABLED) return { generations: new Map(), preNotation: new Map() }
  const prefix = `${CHECKPOINT_REF_PREFIX}/${String(pathId ?? '').toLowerCase()}/`
  const generations = new Map()
  const preNotation = new Map()
  for (const [ref, oid] of refs ?? []) {
    if (!ref.startsWith(prefix)) continue
    const rest = ref.slice(prefix.length).split('/')
    if (rest.length === 1) {
      preNotation.set(rest[0], oid)
      continue
    }
    if (rest.length !== 2 || !GENERATION_SEGMENT.test(rest[0])) continue
    if (!generations.has(rest[0])) generations.set(rest[0], new Map())
    generations.get(rest[0]).set(rest[1], oid)
  }
  return { generations, preNotation }
}

/**
 * Which generation retention continues in, derived from ancestry rather than
 * stored (ADR-021 decision 2).
 *
 * A generation is one linear version of the branch. It closes at the next
 * rewriting push, and a rewrite is visible without being recorded: the refs it
 * wrote stop being ancestors of the tip. So the highest generation present is
 * the current one while all of its refs are still on the branch; when one is
 * not, that generation is closed and retention continues at the next number,
 * which is empty until someone opens it.
 *
 * A stored counter would be a claim, a claim needs a rule to check it, and the
 * rule would have nothing to check it against but these same refs. That is why
 * `base_commit` accuracy is still an open hole, and why this number is not
 * written down anywhere.
 */
export function currentGeneration(generations, onBranch) {
  const numbered = [...(generations ?? new Map()).keys()]
    .map((name) => ({ name, n: Number.parseInt(GENERATION_SEGMENT.exec(name)?.[1] ?? '', 10) }))
    .filter((entry) => Number.isInteger(entry.n))
    .sort((a, b) => b.n - a.n)
  const label = (n) => `g${String(n).padStart(2, '0')}`
  if (numbered.length === 0) return { name: label(1), units: new Map(), state: 'unopened' }
  const highest = numbered[0]
  const units = generations.get(highest.name)
  const open = [...units.values()].every((oid) => onBranch(oid))
  if (open) return { name: highest.name, units, state: 'open' }
  return { name: label(highest.n + 1), units: new Map(), state: 'rewritten', closed: highest.name }
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
 *
 * WHAT `-1` MEANS. This used to return `[]` when no retained commit was on the
 * branch — "no commits to judge". That is the reading a rebase produces, and a
 * rebase is mandatory before every merge, so the rule switched itself off at the
 * one moment it was written for: 41 of 55 commits below the floor, 13 refs
 * naming commits that had left the branch, gate `OK` (CP-OPS-002 S08j).
 *
 * A retained set that does not touch the branch is not an absent subject. It is
 * a branch on which nothing is retained, which is the finding. The floor exists
 * to spare history older than the convention, and under ADR-021 that history is
 * already outside the range — the range now starts at the path's own first
 * commit, not at its registration base.
 */
export function unretainedCheckpoints(commits, retained, provisional = new Set(), head = null) {
  const retainedSet = new Set(retained)
  if (retainedSet.size === 0) return []
  const oldest = commits.findIndex((commit) => retainedSet.has(commit))
  return commits
    .slice(oldest === -1 ? 0 : oldest)
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

export function scopeDigest(section, algorithm = CAIRN_CONFIG.scopeDigestAlgorithm) {
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
  'verify'
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
export function briefErrors(front, body) {
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
  // NO TOKEN BUDGET. Retired by owner ruling, 2026-08-31, under ADR-020.
  //
  // The brief carried `budget_tokens: 1200`, blocking. It fired five times in one
  // day and four of those were answered by rewriting sentences shorter — which is
  // what a budget teaches, because a budget is satisfiable by compression and
  // compressing an explanation is how a record starts saying something slightly
  // untrue. That is the failure this path spent nine units correcting.
  //
  // What replaces it is not nothing. ADR-020 requires the brief, like every
  // protocol artefact, to separate its normative content from its explanatory
  // content and keep only the first as required reading. A brief that has become
  // a chronicle fails that test — and it fails it for the right reason, by naming
  // what a cold reader could not answer, rather than by a number.
  //
  // That test is a judgement measured by cold resume, so it is not a predicate
  // here and is not claimed to be one. The conformance matrix says so.
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
  for (const area of AREA_MAP) {
    if (area.patterns.some((pattern) => pattern.test(file))) return area.name
  }
  return null
}

export function areaNote(areaName) {
  return AREA_MAP.find((area) => area.name === areaName)?.note ?? null
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
  relocations = [],
  branchSource = 'symbolic-ref',
  baseSource = 'flag',
  workUnits = null,
  retentionEnabled = RETENTION_ENABLED,
  addedRecords = [],
  retainedRefs = new Map(),
  provisionalInCandidate = [],
  headProvisional = false,
  scopeDigestFor = null,
  previousFronts = new Map(),
  journalEntries = [],
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

  // 0b. base parity — is this the verdict that decides the merge? -----
  // The sibling of branch identity. There, a rule could not name the branch;
  // here, it names the branch but judges a smaller set of files than the run
  // that will actually gate the merge. Both produce a green line over a
  // question nobody asked, and only one of them used to be visible.
  //
  // Advisory, never blocking: a developer with no fetched trunk must still be
  // able to run the checker, and a narrower run is not a protocol violation.
  // What it must not be is INVISIBLE, because "cairn-check OK" is copied into
  // ledgers as evidence.
  if (onPath && baseSource !== 'flag' && baseSource !== 'default-trunk') {
    const why =
      baseSource === 'opt-out'
        ? '--working-tree was requested'
        : `neither ${TRUNK_BASE_CANDIDATES.join(' nor ')} resolves in this checkout — fetch the trunk`
    add('advisory', 'base-parity',
      `this run compared the working tree with HEAD, not the branch with the trunk (${why}). ` +
      'Every changed-file rule therefore saw a smaller set than the run that decides the merge; ' +
      'record this verdict as the narrow one, or re-run without --working-tree')
  }

  // 1. branch → path -------------------------------------------------
  if (onPath) {
    if (!match) {
      add('blocking', 'branch-path',
        `branch "${branch}" has no coding path declaring it (expected a file in ${PATH_DIR}/ with ${METADATA_NAMESPACE}.branch: ${branch})`)
    } else if (!PATH_BRANCH_STATUSES.includes(match.front.status)) {
      add('blocking', 'branch-path',
        `${match.file} declares this branch but its status is "${match.front.status}" — a path branch must be running, blocked, or ready; done is recorded by integration on the trunk`)
    } else if (!isCommitPin(match.front.base_commit)) {
      add('blocking', 'branch-path', `${match.file} needs ${METADATA_NAMESPACE}.base_commit as a 7–64 digit Git hash`)
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
      `branch "${branch}" has no upstream — push every commit and set ${REMOTE}/${branch} as upstream before reporting the step complete`)
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
  for (const file of stateChanged.filter((entry) => DECLARATION_FILE.test(entry))) {
    // A declaration is identified by the id it declares, not by the file it
    // happens to sit in: `CP-<id>.md` and `CP-<id>/index.md` are the same
    // record in two shapes, and a migration between them retains it.
    const declared = DECLARATION_FILE.exec(file)[1]
    if (!paths.some((path) => path.file === file || path.front?.id === declared)) {
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

    // 4b. the merge-time journal entry ------------------------------
    // Required by AGENTS.md, enforced nowhere until now. It binds the change
    // that performs the integration, not the corpus: paths that merged before
    // the convention existed are not in any diff, and draining them is a
    // migration rather than a repair.
    if (path.front?.status === 'done' && stateChanged.includes(path.file)) {
      const previous = previousPaths instanceof Map
        ? previousPaths.get(path.file)
        : previousPaths?.[path.file]
      const arriving = previous !== undefined && previous?.status !== 'done'
      const id = String(path.front?.id ?? '')
      if (arriving && journalEntries == null) {
        add('blocking', 'journal-entry',
          `${path.file} reaches done, and the journal could not be read to check for its entry — missing evidence is not a pass`,
          'inconclusive')
      } else if (arriving && !journalRecords(journalEntries, id)) {
        // NO MIGRATION EXEMPTION HERE, deliberately. The v0.2 exception excuses
        // records that predate the ACCEPTANCE SCHEMA — a path closed weeks ago
        // cannot supply `accepted_by` without fabricating a signature. A journal
        // entry is not a schema field: it is written at merge time, in the
        // present, by whoever is merging, and every listed path can produce one.
        // Exempting them would grandfather a requirement they can satisfy today,
        // which is a bypass rather than a migration.
        add('blocking', 'journal-entry',
          `${path.file} reaches done with no journal entry declaring \`path: ${id}\` — write one file under ${JOURNAL_DIR}/ in this same change`)
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
        `${path.file}: ${METADATA_NAMESPACE}.subject_commit must equal the closing record subject_commit`)
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
        `cannot determine whether ${records.length} protected record(s) are additions, exact appends, or rewrites — provide complete record history and a comparison ref`,
        'inconclusive')
    }
  } else {
    const validRelocations = relocations.filter(([from, to]) => isStepRecordRelocation(from, to))
    const relocated = new Set(validRelocations.flat())
    if (validRelocations.length > 0) {
      add('advisory', 'record-integrity',
        `${validRelocations.length} append-only record(s) were relocated verbatim: ${validRelocations.slice(0, 3).map(([from, to]) => `${from.split('/').at(-1)} → ${to}`).join(', ')}${validRelocations.length > 3 ? ', …' : ''}. Links were repointed and nothing earlier was rewritten — stated rather than exempted in silence`)
    }
    for (const file of immutableMutations) {
      if (isImmutableRecord(file) && !relocated.has(file)) {
        if (isAppendOnlyStepRecord(file)) {
          add('blocking', 'record-integrity',
            `${file} no longer preserves its adding blob as a prefix — append a suffix, or add a superseding record instead of changing earlier text`)
        } else {
          add('blocking', 'record-integrity',
            `${file} is an existing immutable record and may not be modified, renamed, or deleted; add a superseding record instead`)
        }
      }
    }
  }

  // 4c. the dates a record carries --------------------------------
  // Immutability protects a record from being changed later; it says nothing
  // about a record that was already wrong when it was written. Scoped to the
  // records this change ADDS, because an existing one may not be edited to
  // satisfy a rule that did not exist when it was written — there, the fix
  // would be the violation.
  for (const finding of recordDateFindings(addedRecords)) {
    if (finding.kind === 'disagreement') {
      add('blocking', 'record-date',
        `${finding.file}: the filename says ${finding.named} and \`timestamp:\` says ${finding.declared} — one of the two dates this record carries is false`)
    } else {
      add('advisory', 'record-date',
        `${finding.file} is dated ${finding.carried} and was written on ${finding.addedOn}, ${finding.drift} days apart — a dated record states when its event happened, so record why this one carries an earlier date`)
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
    if (touched(slash(MODULE_DIR)).length === 0) {
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
      const note = areaNote(area)
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
  // Completed steps roll into the configured coding-path history directory,
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
  if (retentionEnabled && onPath && match && workUnits != null) {
    const id = String(match.front.id ?? '').toLowerCase()
    const due = retentionDue(workUnits)
    // Which generation retention continues in is an ANCESTRY question, so a
    // checkout that cannot resolve this branch's own commit range cannot answer
    // it. That is missing evidence, and it gets the same treatment as an
    // unfetched namespace rather than a confident verdict about a range nobody
    // could read.
    const branchOids = pathCommits == null ? null : new Set(pathCommits)
    const split = retentionGenerations(retainedRefs ?? new Map(), id)
    const generation = branchOids == null
      ? null
      : currentGeneration(split.generations, (oid) => branchOids.has(oid))
    // AN EMPTY NAMESPACE IS NOT AN ANSWER.
    //
    // `git for-each-ref refs/cairn/...` over a namespace that was never fetched
    // exits 0 and prints nothing — the same result as a namespace that is
    // present and empty. The guard below already carried the right sentence for
    // the second case, and it was UNREACHABLE, because the only thing that made
    // `retainedRefs` null was the command failing, and the command never fails.
    //
    // So the rule stated, with confidence, that eighteen refs did not exist
    // while all eighteen sat on the remote — and told the reader to create them,
    // which in that checkout would have accomplished nothing. `actions/checkout`
    // fetches `refs/heads/*` and `refs/tags/*` only, so this fired on every CI
    // run of every path (CP-OPS-002 S08b).
    //
    // The verdict does not soften: it stays blocking, and the run still exits
    // non-zero. What changes is the CLAIM and the instruction. A checkout that
    // cannot see the namespace has missing evidence, not evidence of absence.
    const invisible = retainedRefs != null && retainedRefs.size === 0 && due.length > 0
    if (retainedRefs == null || invisible) {
      const units = due.map((unit) => `${unit.unit} (${unit.step})`).join(', ')
      add('blocking', 'checkpoint-retention',
        `${CHECKPOINT_REF_PREFIX}/${id}/* is empty in this checkout while ${match.file} declares ${due.length} unit(s) due retention — ${units}. ` +
        `Either the namespace was never fetched (\`git fetch ${REMOTE} '+${CHECKPOINT_REF_PREFIX}/*:${CHECKPOINT_REF_PREFIX}/*'\`, which \`actions/checkout\` does NOT do) ` +
        'or the refs were never written. This checkout cannot tell which, and missing evidence is not a pass',
        'inconclusive')
    } else if (generation == null && due.length > 0) {
      add('blocking', 'checkpoint-retention',
        `cannot resolve this branch's own commit range against the trunk, so the current retention generation for ${id} is unknown while ${match.file} declares ${due.length} unit(s) due retention — fetch the trunk and the complete path history, then rerun the gate`,
        'inconclusive')
    } else if (generation != null && generation.state !== 'open' && due.length > 0) {
      // AN EMPTY CURRENT GENERATION IS THE FINDING, NOT THE ABSENCE OF ONE.
      //
      // Distinct from the inconclusive case above, and the distinction is the
      // whole of ADR-021 decision 4. There, the namespace could not be seen. Here
      // it is seen, older generations are in it, and the current one is empty —
      // which is exactly what a rewriting push leaves behind. The instruction is
      // specific because a finding nobody can act on is one people learn to
      // scroll past.
      const why = generation.state === 'rewritten'
        ? `${generation.closed} stopped being an ancestor of this branch, so it was closed by a rewrite`
        : `no generation has been opened for this path, and ${split.preNotation.size} ref(s) predate the notation`
      add('blocking', 'checkpoint-retention',
        `${CHECKPOINT_REF_PREFIX}/${id}/${generation.name}/ is empty while ${match.file} declares ${due.length} unit(s) due retention — ${why}. ` +
        `Open ${generation.name} by retaining every completed commit of this branch at ${CHECKPOINT_REF_PREFIX}/${id}/${generation.name}/<unit>, and move no existing ref`)
    } else {
      for (const unit of due) {
        const ref = `${CHECKPOINT_REF_PREFIX}/${id}/${generation?.name}/${unit.unit}`
        if (!retainedRefs.has(ref)) {
          add('blocking', 'checkpoint-retention',
            `${match.file} declares unit ${unit.unit} (${unit.step}) with no retention ref at ${ref} — create it before any rewriting push, or the next rebase orphans that checkpoint`)
        }
      }
    }
    // Suppressed when the namespace is invisible: "the newest ref is not
    // written yet" is the same unfounded claim as the blocking one, in a
    // quieter voice, and the inconclusive finding above already says what is
    // actually known.
    const newest = workUnits.at(-1)
    const newestRef = newest && generation
      ? `${CHECKPOINT_REF_PREFIX}/${id}/${generation.name}/${newest.unit}`
      : null
    if (newestRef && retainedRefs != null && !invisible && generation.state === 'open' &&
        !retainedRefs.has(newestRef)) {
      add('advisory', 'checkpoint-retention',
        `unit ${newest.unit} has no retention ref yet — write ${newestRef} once this commit exists, before the next rebase`)
    }

    // Every declared unit resolving a ref is NOT the same as every completed
    // commit being retained: a ref moved forward leaves the commit it used to
    // name unretained while every unit still checks out.
    // Judged against the CURRENT generation only. Earlier generations answer the
    // other question — what a ledger row was verified against — and their refs
    // are deliberately off this branch.
    if (pathCommits != null && retainedRefs != null && generation?.state === 'open') {
      const orphaned = unretainedCheckpoints(
        pathCommits, generation.units.values(), provisionalCommitOids, head
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
        `${match.file} declares no route: — add ${ROUTES.join(' | ')} explicitly; this host's configured default for newly generated paths is ${DEFAULT_ROUTE}${exempt ? ' (grandfathered: this path predates the rule)' : ''}`)
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
  if (touched(slash(CAIRN_CONFIG.roots.architecture)).length > 0 &&
      touched(slash(ADR_DIR)).length === 0) {
    add('advisory', 'decision-drift',
      `the constitution changed with no ADR in the same change — architecture decisions live in ${slash(ADR_DIR)}`)
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
  return metadataOf(readFrontmatter(`${text}\n`)?.data) ?? undefined
}

function previousPathStates(paths, ref) {
  const states = new Map()
  for (const path of paths) states.set(path.file, frontmatterAt(ref, path.file))
  return states
}

/** `base_commit` is not merely any ancestor. It names the trunk state just
 * before registration, so it must resolve to the first parent of the commit
 * that introduced this path declaration on the trunk. */
/** Where this record's declaration lives on the trunk, in either shape, or null.
 *  Looked up by the declared id for the same reason `pathRegistrationState` is:
 *  a record's history is not erased by moving the file that carries it. */
function declarationOnTrunk(trunkRef, id) {
  for (const candidate of [`${PATH_DIR}/${id}.md`, `${PATH_DIR}/${id}/index.md`]) {
    if (gitOrNull(['log', '-1', '--format=%H', trunkRef, '--', candidate])) return candidate
  }
  return null
}

function pathRegistrationBaseState(trunkRef, branch, paths) {
  if (!isPathBranch(branch)) return null
  const match = paths.find((path) => path.front?.branch === branch)
  const id = match?.front?.id
  if (!match || !id) return null
  if (LEGACY_UNREGISTERED_PATHS.has(id)) return 'grandfathered'
  if (!gitOrNull(['rev-parse', '--verify', trunkRef])) return null

  const onTrunk = declarationOnTrunk(trunkRef, id)
  if (!onTrunk) return null
  const additions = gitOrNull([
    'log', '--diff-filter=A', '--format=%H', '--reverse', trunkRef, '--', onTrunk
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
    `${BRIEF_DIR}/${id}-handoff.md`,
    `${AUDIT_DIR}/${id}-${subject}.md`,
    record?.__file
  ].filter(Boolean))
  if (path.front?.status === 'done') exact.add(ACTIVE_FILE)
  const journal = new RegExp(
    `^${JOURNAL_DIR.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&')}/\\d{4}-\\d{2}-\\d{2}-${id.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&')}\\.md$`
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
/**
 * Renames in this change that moved an append-only record without rewriting it.
 * The predicate is `isVerbatimRelocation`; this half is only the git plumbing
 * that finds the pairs and reads the two blobs.
 */
function verbatimRelocations(ref) {
  if (!ref || !gitOrNull(['rev-parse', '--verify', ref])) return []
  const pairs = []

  // Committed renames. `--name-status -z` emits status, then OLD, then NEW.
  const committed = String(gitRaw([
    'diff', '--find-renames', '--diff-filter=R', '--name-status', '-z', `${ref}..HEAD`
  ])).split('\0')
  for (let i = 0; i < committed.length;) {
    if (!committed[i]?.startsWith('R')) { i += 1; continue }
    pairs.push([committed[i + 1], committed[i + 2]])
    i += 3
  }

  // Staged renames, which is where a migration in progress lives. Porcelain v1
  // with -z emits the NEW path in the record and the ORIGINAL in the next field
  // — the opposite order from `diff --name-status`, and reading it the other way
  // round finds nothing and says so silently.
  const working = String(gitRaw(['status', '--porcelain', '-z'])).split('\0')
  for (let i = 0; i < working.length; i += 1) {
    const record = working[i]
    if (!record || record.length <= 3 || !record.slice(0, 2).includes('R')) continue
    pairs.push([working[i + 1], record.slice(3)])
    i += 1
  }

  const out = []
  for (const [from, to] of pairs) {
    if (!from || !to || !isStepRecordRelocation(from, to)) continue
    const before = gitOrNull(['show', `${ref}:${from}`])
    const after = existsSync(join(REPO, to)) ? readFileSync(join(REPO, to), 'utf8') : null
    if (before != null && after != null && isVerbatimRelocation(before, after)) out.push([from, to])
  }
  return out
}

/**
 * The adding commit and path reported by `git log --follow`.
 *
 * `--follow --diff-filter=A --format=%H --name-only` emits newest first. A
 * delete/re-add can therefore yield several pairs; the oldest pair is the
 * identity the current record claims to preserve. Kept pure so the plumbing
 * format has an adversarial fixture rather than being trusted by inspection.
 */
export function recordOriginFromFollowLog(raw) {
  const lines = String(raw ?? '').split('\n').map((line) => line.trim()).filter(Boolean)
  const entries = []
  let commit = null
  for (const line of lines) {
    if (/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(line)) {
      commit = line
    } else if (commit) {
      entries.push({ commit, file: line })
      commit = null
    }
  }
  return entries.at(-1) ?? null
}

function stepRecordOrigin(file) {
  const raw = gitOrNull([
    'log', '--follow', '--diff-filter=A', '--format=%H', '--name-only', '--', file
  ])
  return raw == null ? null : recordOriginFromFollowLog(raw)
}

/**
 * Born-sliced step records are compared with the blob that CREATED them, not
 * with whichever environmental ref the caller happened to supply.
 *
 * That distinction is the S08n gate-parity repair. CI compared S08m with the
 * previous pushed SHA and called a pure suffix append a rewrite; the next local
 * run compared with HEAD and forgot the question. Following the record to its
 * adding blob makes both contexts read one fact. Exact suffix appends pass;
 * changing any earlier byte, deleting the record, or an unreadable origin does
 * not. Flat live ledgers remain outside this predicate and stay declared as a
 * conformance gap.
 */
function appendOnlyStepRecordMutations(files) {
  const mutations = []
  for (const file of [...new Set(files.filter(isAppendOnlyStepRecord))]) {
    const after = existsSync(join(REPO, file)) ? readFileSync(join(REPO, file), 'utf8') : null
    const origin = stepRecordOrigin(file)

    if (!origin) {
      // A genuinely new working-tree record has no adding commit yet. A tracked
      // record with no readable origin is UNKNOWN, never silently an addition.
      const tracked = gitOrNull(['ls-files', '--error-unmatch', '--', file]) != null
      const stagedAddition = Boolean(gitOrNull([
        'diff', '--cached', '--diff-filter=A', '--name-only', '--', file
      ])?.trim())
      if (after != null && (!tracked || stagedAddition)) continue
      return null
    }

    const before = gitOrNull(['show', `${origin.commit}:${origin.file}`])
    if (!preservesAppendOnlyRecord(before, after, origin.file !== file)) {
      mutations.push(file)
    }
  }
  return mutations
}

function immutableRecordMutations(ref, changed = []) {
  if (!ref || !gitOrNull(['rev-parse', '--verify', ref])) return null
  const working = porcelainMutations(gitRaw(['status', '--porcelain', '-z']))
  const committed = nameStatusMutations(gitRaw([
    'diff', '--diff-filter=MDRTUXB', '--name-status', '-z', `${ref}..HEAD`
  ]))
  const strict = [...new Set([...committed, ...working])]
    .filter((file) => !isAppendOnlyStepRecord(file))
  const steps = appendOnlyStepRecordMutations(changed)
  if (steps == null) return null
  return [...new Set([...strict, ...steps])]
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

function markdownCorpus() {
  const roots = [...new Set([DOCUMENTATION_DIR, PROJECT_DIR])]
  return [...new Set(roots.flatMap((root) =>
    existsSync(join(REPO, root)) ? walk(root, []).filter((file) => file.endsWith('.md')) : []
  ))]
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

  // The declaration is looked up on the trunk by the ID it declares, in either
  // shape. Keying on this checkout's file path made a record's registration
  // depend on where the record sits TODAY, so migrating `CP-<id>.md` to
  // `CP-<id>/index.md` reported a path that has been registered since August as
  // never registered at all (CP-OPS-002 S08l).
  for (const candidate of [`${PATH_DIR}/${id}.md`, `${PATH_DIR}/${id}/index.md`]) {
    try {
      const text = execFileSync('git', ['show', `${trunkRef}:${candidate}`], {
        cwd: REPO,
        encoding: 'utf8'
      })
      if (registrationMatches(text, id, branch, match.front.base_commit)) return 'registered'
    } catch {
      // this shape is not on the trunk; try the other
    }
  }
  return 'missing'
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
  const local = file.replace(/^project\//, slash(PROJECT_DIR))
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
    const front = metadataOf(readFrontmatter(text)?.data)
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
  const rel = `${BRIEF_DIR}/${String(pathId).toLowerCase()}-handoff.md`
  if (!existsSync(join(REPO, rel))) return null
  const text = readFileSync(join(REPO, rel), 'utf8')
  const parsed = readFrontmatter(text)
  const front = metadataOf(parsed?.data) ?? parsed?.data ?? null
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
  if (!RETENTION_ENABLED || !pathId) return new Map()
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
/**
 * The path's OWN commits, oldest first.
 *
 * The floor is `merge-base(<trunk>, HEAD)`, not the declared `base_commit`
 * (ADR-021 decision 5). `base_commit` is where the path was REGISTERED; after a
 * rebase the path's commits begin at the trunk tip the branch was rebased onto,
 * and everything between the two belongs to whoever landed it. Measured on
 * `path/cp-ops-002`: ten commits in the old range were other paths', six of them
 * CP-UI-TYPOGRAPHY's, retained under its own path id. Judging them here would
 * mean either ten false findings or an exemption for the state that caused them.
 *
 * A trunk that cannot be resolved — a shallow clone, a checkout with no trunk —
 * makes the range unknown, and unknown returns null so the caller reports
 * inconclusive rather than a pass.
 */
function branchCommits(trunkRef) {
  const floor = gitOrNull(['merge-base', trunkRef, 'HEAD'])
  if (!isCommitPin(floor)) return null
  const raw = gitOrNull(['log', '--format=%H', '--reverse', `${floor}..HEAD`])
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

/**
 * Does the journal record this path's integration?
 *
 * `AGENTS.md` requires one journal file per entry, written at merge time. Until
 * now NO RULE ASKED. `same-work-unit` fires when *source* changes without a
 * module note or ledger, and a closing unit changes neither — so nothing asked.
 * Observed rather than hypothesised: CP-UI-TYPOGRAPHY was closed, audited, set
 * to `done` and proposed for merge with no entry, and every gate reported `OK`.
 * A human reviewer caught it (S08 brief, finding 2).
 *
 * It reads the configured metadata block's `path`, NOT the filename. The convention does encode the id in
 * the filename, and matching that would have been easier and wrong for the same
 * reason `hasCeremony` was wrong: a filename is not a declaration, and this path
 * has already repaired one rule that asked a filename question while its comment
 * claimed a semantic one. An entry declares which path it records, or it does
 * not record it.
 *
 * Pure: the caller supplies the loaded entries.
 */
export function journalRecords(entries, pathId) {
  return entries.some((entry) => entry?.path === pathId)
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

function loadJournal() {
  try {
    return readdirSync(join(REPO, JOURNAL_DIR))
      .filter((file) => file.endsWith('.md') && file !== 'index.md' && file !== 'log.md')
      .map((file) => ({
        ...(metadataOf(readFrontmatter(readFileSync(join(REPO, JOURNAL_DIR, file), 'utf8'))?.data) ?? {}),
        __file: `${JOURNAL_DIR}/${file}`
      }))
  } catch {
    return []
  }
}

/**
 * The records this change ADDS, with every date each one carries.
 *
 * `addedOn` is the AUTHOR date of the commit that introduced the file, never
 * the committer date: a rebase rewrites the second and preserves the first, and
 * a rebase before merge is mandatory here — a rule keyed on committer dates
 * would report every record on every rebased branch as freshly written.
 *
 * A record that exists only in the working tree has no such commit yet, so it
 * carries no third date and only the two the author wrote are compared. That is
 * a narrower question, not a silent pass: the same record is judged in full by
 * the branch-versus-trunk run that decides the merge.
 */
function addedRecordDates(changed, ref) {
  return changed
    .filter(isImmutableRecord)
    .filter((file) => !ref || gitOrNull(['cat-file', '-e', `${ref}:${file}`]) === null)
    .map((file) => {
      const absolute = join(REPO, file)
      const text = existsSync(absolute) ? readFileSync(absolute, 'utf8') : null
      return {
        file,
        named: filenameDate(file),
        declared: text ? dateOf(readFrontmatter(text)?.data?.timestamp) : null,
        // `--follow` because the question is WHEN THIS RECORD WAS WRITTEN, and
        // without it the answer is when its current path first appeared. A
        // record that moved would report the migration's date and be accused of
        // carrying an earlier one — the same substitution `record-integrity`
        // made about the same move, in a quieter voice (CP-OPS-002 S08l).
        addedOn:
          gitOrNull([
            'log', '--follow', '--diff-filter=A', '--format=%ad', '--date=short', '-1', '--', file
          ]) || null
      }
    })
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

/** Where a path record lives. Two shapes, and the folder is the one a new path
 *  is born in (ADR-020 decision 4): `CP-<id>/index.md` carries the declaration,
 *  the step index and the live header, with one file per step beside it. The
 *  flat `CP-<id>.md` is what every path used before, and it keeps working — a
 *  record is not migrated by a rule, it is migrated by someone doing the move. */
function pathRecordFiles() {
  if (!existsSync(join(REPO, PATH_DIR))) return []
  const out = []
  for (const entry of readdirSync(join(REPO, PATH_DIR), { withFileTypes: true })) {
    if (!entry.name.startsWith('CP-')) continue
    if (entry.isDirectory()) {
      if (existsSync(join(REPO, PATH_DIR, entry.name, 'index.md'))) {
        out.push(`${entry.name}/index.md`)
      }
    } else if (entry.name.endsWith('.md')) {
      out.push(entry.name)
    }
  }
  return out
}

/**
 * The work units a path record declares.
 *
 * A flat record holds them all in one file. A born-sliced record holds them in
 * `steps/`, one per file, and `index.md` holds none — so reading the declaration
 * file alone reports a path that has completed twenty-nine units as having
 * completed zero, which silently disarms `work-unit` AND `checkpoint-retention`
 * at once. The record is the FOLDER; the ledger is every step file in it.
 *
 * Sorted by ordinal, because "the newest unit" is what the retention exemption
 * turns on and directory order is not chronology.
 */
function pathWorkUnits(file) {
  const dir = file.endsWith('/index.md') ? file.slice(0, -'/index.md'.length) : null
  const files = [file]
  if (dir && existsSync(join(REPO, dir, 'steps'))) {
    for (const entry of readdirSync(join(REPO, dir, 'steps')).sort()) {
      if (entry.endsWith('.md') && !['index.md', 'log.md'].includes(entry)) {
        files.push(`${dir}/steps/${entry}`)
      }
    }
  }
  const units = files.flatMap((rel) => parseWorkUnits(readFileSync(join(REPO, rel), 'utf8')))
  return units.sort((a, b) =>
    (Number.parseInt(a.unit, 10) || 0) - (Number.parseInt(b.unit, 10) || 0))
}

function loadPaths() {
  return pathRecordFiles()
    .map((file) => {
      const rel = `${PATH_DIR}/${file}`
      const text = readFileSync(join(REPO, rel), 'utf8')
      const parsed = readFrontmatter(text)
      const front = metadataOf(parsed?.data)
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
function corpusFindings(branch, trunkRef = TRUNK_BRANCH, previousRef = null, changed = []) {
  const findings = []
  const corpus = loadPaths()

  // Concept wiki: an orphan blocks, growth is only reported. See orphanConcepts.
  const conceptDir = join(REPO, CONCEPTS_DIR)
  if (existsSync(conceptDir)) {
    const conceptFiles = readdirSync(conceptDir).filter((f) => f.endsWith('.md'))
    // A note counts as reached only from OUTSIDE the wiki. Two reasons, and the
    // second is why this is not merely strict:
    //   - the wiki index lists everything by construction, so counting it would
    //     make the rule unfailable — the defect this rule replaces;
    //   - counting sibling concepts would let two mutually-linking orphans pass,
    //     and a word reachable only from other words is a word the protocol
    //     itself never needed.
    // Measured before choosing it: all 71 pre-existing concepts are linked from
    // normative or learning text, so the strict reading fails none of them.
    const linked = new Set()
    const corpusDocs = markdownCorpus()
    for (const doc of corpusDocs) {
      if (doc.startsWith(`${CONCEPTS_DIR}/`)) continue
      const text = stripCode(readFileSync(join(REPO, doc), 'utf8'))
      for (const match of text.matchAll(/(?:concepts\/|\.\/)([a-z0-9-]+\.md)/g)) {
        linked.add(match[1])
      }
    }
    for (const orphan of orphanConcepts(conceptFiles, linked)) {
      findings.push({
        level: 'blocking',
        rule: 'concept-orphan',
        message: `${CONCEPTS_DIR}/${orphan}: no normative or learning text links this concept — a word nobody needed is where vocabulary bloat begins; link it where it is used, or remove it`
      })
    }
    // Growth is DIFF-SCOPED, like ledger-size and for the same reason: it speaks
    // to whoever is adding a concept, in the change where they add it. A corpus
    // sweep would report the same articles on every run for months, and a check
    // that cries wolf is one people switch off.
    if (changed.some((file) => file.startsWith(`${CONCEPTS_DIR}/`))) {
      const previous = previousRef
        ? (gitOrNull(['ls-tree', '--name-only', previousRef, `${CONCEPTS_DIR}/`]) ?? '')
            .split('\n').filter(Boolean).map((f) => f.split('/').at(-1))
        : null
      const added = addedConcepts(previous, conceptFiles)
      if (added && added.length > 0) {
        findings.push({
          level: 'advisory',
          rule: 'concept-growth',
          message: `the concept wiki gained ${added.length} article(s): ${namesForReading(added)}. Every concept is something a reader must learn before the normative text is readable, and the gradient runs one way — say in the ledger why each earns its page`
        })
      }
    }
  }

  // The derived running-paths view must match the path files it projects.
  // Objective, no judgment, one-command fix — and now asked in EVERY context,
  // because removing the exemption IS the repair (S08 part 1, item 3).
  //
  // The rule used to skip itself when the branch matched `path/*`, on reasoning
  // that was sound when it was written: a running path never hand-writes the
  // generated view. `actions/checkout` detaches, so CI's branch was `HEAD` and
  // the rule ran there — CP-UI-TYPOGRAPHY S04 was green locally and red in CI,
  // one tree, one command. A predicate that branches on where it runs cannot be
  // repaired by making both sides agree about the branch name; the branch name
  // has to stop being the question.
  //
  // The recorded plan was to key on the path's declared `status` instead. It
  // needs no key at all, and that is the finding: the view is already a pure
  // projection of the statuses declared IN THIS TREE, so a checkout can only
  // disagree with it when something here moved a status without regenerating.
  // A path branch that has moved nobody's status passes for free — which is
  // what the exemption was protecting — and a path setting its own
  // `status: done` at closure is caught, which is what it was hiding, because
  // under self-merge that path IS the last writer of this view.
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
  const linkExempt = (file) =>
    file.startsWith(`${DOCUMENTATION_DIR}/fixtures/`) || file === JOURNAL
  const docs = markdownCorpus().filter((file) => !linkExempt(file))
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
  const baseFlag = argv.includes('--base') ? argv[argv.indexOf('--base') + 1] : null
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
  const { base, source: baseSource } = resolveBase({
    flag: baseFlag,
    workingTree: argv.includes('--working-tree'),
    branch,
    refExists: (ref) => gitOrNull(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]) != null
  })
  const changed = changedFiles(base)
  const paths = loadPaths()
  const pathForBranch = paths.find((path) => path.front?.branch === branch) ?? null
  const trunkRef = base ?? TRUNK_BRANCH
  const previousRef = comparisonRef(base, explicitPrevious)
  const stateChanged = previousRef ? changedFiles(previousRef) : changed
  // Record immutability is forward-scoped per proposed change. CI passes the
  // previous pushed SHA; an ordinary local run compares the working tree with
  // HEAD. The broader trunk merge-base can predate the rule and would punish
  // historical migrations that were valid under their then-current schema.
  // Born-sliced step records do NOT inherit this environmental baseline: their
  // adding blob is stable and appendOnlyStepRecordMutations follows it directly.
  const recordRef = explicitPrevious ? previousRef : comparisonRef(null, null)
  const findings = [
    ...corpusFindings(branch, trunkRef, previousRef, changed),
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
      immutableMutations: immutableRecordMutations(recordRef, changed),
      relocations: verbatimRelocations(recordRef),
      branchSource,
      baseSource,
      workUnits: pathForBranch ? pathWorkUnits(pathForBranch.file) : null,
      // Judged against the SAME comparison every other changed-file rule uses,
      // so the local default and the CI command see one set of added records.
      addedRecords: addedRecordDates(changed, comparisonRef(base, null)),
      scopeDigestFor: scopeDigestOf,
      openingRecordFor: (id) => openingRecordFromSessions(loadSessions(), id),
      previousFronts: previousFrontStates(paths, previousRef),
      journalEntries: loadJournal(),
      trunkDelta: pathForBranch?.front?.status === 'ready'
        ? trunkDeltaSince(closingRecord(pathForBranch.front.id)?.base, trunkRef)
        : [],
      migrationStale: migrationDebt(paths),
      briefFor: briefRecord,
      redactionRecordExists: redactionIndex(),
      retainedRefs: retainedCheckpointRefs(pathForBranch?.front?.id),
      pathCommits: pathForBranch ? branchCommits(trunkRef) : null,
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

  // The header names the base as well as the branch. A verdict that does not
  // say what it compared cannot be read as evidence a year later, and this is
  // the line people paste into ledgers.
  const baseLabel = base ? `${base} (${baseSource})` : `working tree vs HEAD (${baseSource})`
  const binding = effectiveBinding()
  if (asJson) {
    console.log(JSON.stringify(
      { binding, branch, base, baseSource, changed: changed.length, findings }, null, 2))
  } else {
    console.log(
      `cairn-check — profile ${ENFORCEMENT_PROFILE}, branch ${branch}, base ${baseLabel}, ${changed.length} changed file(s)`
    )
    console.log(
      `binding — schema ${binding.version}; trunk ${binding.trunk} via ${binding.remote}; ` +
      `metadata ${binding.metadataNamespace}; new-path route ${binding.defaultRoute}; docs ${binding.documentationRoot}; ` +
      `project ${binding.projectRoot}; source ${binding.sourceRoots.join(', ')}`
    )
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
