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
 *   node tools/cairn-check.mjs [--base <ref>] [--branch <name>] [--json]
 *
 * On a `path/*` branch the base DEFAULTS to the trunk, because that is the
 * comparison which decides the merge. There is no narrower form: one
 * invocation, one comparison, one verdict, on a laptop and in CI alike.
 *
 * BLOCKING failures exit 1. ADVISORY findings are printed and never fail:
 * a declared write surface is a signal, not a lock (owner ruling 4), and a
 * validator that blocks on judgment calls gets disabled within a week.
 */

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { REPO, installedConfig, metadataOf, slash } from './cairn-config.mjs'

const CAIRN_CONFIG = installedConfig()

export const METADATA_NAMESPACE = CAIRN_CONFIG.metadataNamespace
export const PROJECT_DIR = CAIRN_CONFIG.roots.project
export const DOCUMENTATION_DIR = CAIRN_CONFIG.roots.documentation
export const PATH_DIR = `${PROJECT_DIR}/coding-paths`
/** How an accepted candidate reaches the trunk, and therefore where closing
 *  acceptance is recorded. `pull-request` — the default — makes the request's
 *  description the coherence checklist and its approval the acceptance, and
 *  the checker proves only what Git holds. `manual-git` writes the same
 *  checklist and acceptance as one closing record in the path folder. */
export const INTEGRATION_TRANSPORT = CAIRN_CONFIG.transport.integration
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

/* ------------------------------------------------------------------ *
 * The profile line — ADR-029.
 *
 * The checker asks the host nothing. This line names the enforcement profile
 * the configuration declares and its two transports, and claims nothing about
 * what the host enforces: a profile is a claim about settings, and the
 * evidence for it is read on the host's own settings page, not here. The
 * GitHub reading that stood here is deleted; ADR-029 supersedes the two
 * decisions that asked for it.
 * ------------------------------------------------------------------ */

export function profileLine({ enforcementProfile, transports }) {
  return `profile — ${enforcementProfile}; transports registration ${transports.registration}, integration ${transports.integration}`
}

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
 * The set is finite and named. Nothing in the reference checker drains it any
 * more — `migration-debt` was retired with Cairn 1.0 as a host debt — so a
 * spent entry is deleted by whoever adopts the release, not by a failing gate.
 */
export const ROUTES = ['lightweight', 'full']

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

export const V02_MIGRATION_PATHS = new Set(CAIRN_CONFIG.migration.v02Records)

export const WORK_UNIT_TYPES = [
  'implementation',
  'documentation',
  'decision',
  'repair',
  'closure'
]

/** How this host keeps a path's history (ADR-022).
 *
 *  `forbidden` — the default, and the only policy the reference checker
 *  enforces: a published path branch is never rewritten, so the branch IS the
 *  retention, and `path-history` below reports a rewritten published commit.
 *
 *  `retained` — path branches may be rewritten, and the host pins every
 *  ledger-named commit in a retention namespace first. Cairn 1.0 keeps that
 *  as a plugin for the host that needs it: the configuration still declares
 *  the namespace, the concept page still describes it, and the reference
 *  checker no longer reads it. A `retained` host runs its own retention check
 *  or runs none, and the conformance page says so. */
export const PATH_HISTORY_POLICY = CAIRN_CONFIG.pathHistoryPolicy
export const REWRITING_FORBIDDEN = PATH_HISTORY_POLICY === 'forbidden'

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
    // silently declared less than it said — found live in the repository this
    // checker was cut from, where a widened declaration kept reporting drift.
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
  if (!front.id) errors.push(`missing ${METADATA_NAMESPACE}.id — a record names the path it declares, in the canonical CP-<UPPERCASE-ID> form its file is named after`)
  else {
    if (!/^CP-[A-Z0-9][A-Z0-9-]*$/.test(front.id)) {
      errors.push(`${METADATA_NAMESPACE}.id must use canonical CP-<UPPERCASE-ID> form — uppercase it, and rename the record and the branch to match, before the path is registered`)
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
      errors.push(`${METADATA_NAMESPACE}.id "${front.id}" does not match the record's own name (expected ${shape}, got ${parts.slice(-2).join('/')}) — rename the record to the id it declares, or declare the id it is named after`)
    }
  }
  if (!PATH_STATUSES.includes(front.status)) {
    errors.push(`status "${front.status}" is outside the vocabulary — declare one of ${PATH_STATUSES.join(' | ')}`)
  }
  if (['running', 'blocked', 'ready'].includes(front.status) && !front.branch) {
    errors.push(`status "${front.status}" requires ${METADATA_NAMESPACE}.branch — declare path/${String(front.id ?? '<id>').toLowerCase()}, the branch this path's one writer works in`)
  }
  if (
    ['running', 'blocked', 'ready'].includes(front.status) &&
    front.id &&
    front.branch &&
    front.branch !== `path/${front.id.toLowerCase()}`
  ) {
    errors.push(`${METADATA_NAMESPACE}.branch must equal path/${front.id.toLowerCase()} — rename the branch, or declare the id the branch is named after; one path is one branch`)
  }
  if (['running', 'blocked', 'ready'].includes(front.status) && !isCommitPin(front.base_commit)) {
    errors.push(`status "${front.status}" requires ${METADATA_NAMESPACE}.base_commit as a 7–64 digit Git hash — it is the parent of the commit that registered this path, read with \`git rev-parse <registration>^\``)
  }
  if (front.status === 'ready' && !isObjectId(front.subject_commit)) {
    errors.push(`status "ready" requires ${METADATA_NAMESPACE}.subject_commit as a full object id (${OBJECT_ID_FORMATS}) — it is the candidate the gates were run on, read with \`git rev-parse HEAD\` at that commit`)
  }
  if (front.depends_on !== undefined) {
    if (!Array.isArray(front.depends_on)) {
      errors.push(`${METADATA_NAMESPACE}.depends_on must be a list of path ids — write it as a YAML list, empty where this path waits on nothing`)
    } else {
      for (const id of front.depends_on) {
        if (!/^CP-[A-Z0-9][A-Z0-9-]*$/.test(String(id))) {
          errors.push(`${METADATA_NAMESPACE}.depends_on names "${id}", which is not a canonical CP-<UPPERCASE-ID> — name the path by the id its own record declares, or drop the entry`)
        } else if (id === front.id) {
          errors.push(`${METADATA_NAMESPACE}.depends_on names the path itself — remove it; a path that waits on itself is never unblocked in the live view`)
        }
      }
    }
  }
  if (front.status === 'archived' && front.resolution && !PATH_RESOLUTIONS.includes(front.resolution)) {
    errors.push(
      `${METADATA_NAMESPACE}.resolution "${front.resolution}" is outside the vocabulary — declare one of ${PATH_RESOLUTIONS.join(' | ')}`
    )
  }
  return errors
}

/** A transition is checked whenever the previous path state is available.
 * `null` means this is a newly created path declaration. */
export function transitionErrors(previous, current, onPathBranch = false, readyBehind = false) {
  const errors = []
  const to = current?.status
  // A comparison sees two ENDPOINTS. An integrating request's range holds the
  // merge as well as the integrating commit, so it finds `running` at the base
  // and `done` at the head while the `ready` the branch declared sits inside
  // the range, in a commit the merge brought in. ADR-001 decision 7 refuses a
  // trunk commit that takes a path to `done` WITH NO READY COMMIT BEHIND IT —
  // a question about the history, which the endpoints cannot answer and
  // `readyBehind` does (ADR-008 decision 2).
  const declared = previous?.status ?? null
  const from = readyBehind && declared === 'running' && to === 'done' ? 'ready' : declared
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

  // ADR-001 decision 7 removed the edge that let a trunk commit take a path
  // from `running` straight to `done`. It existed for the `manual-git` merge
  // unit, but on BOTH transports the administrative commit has already put the
  // path at `ready` on its branch, so the integrating unit records ready → done
  // and never needs the shortcut. What the shortcut hid is a closure that never
  // bound `subject_commit` to the record before the merge.
  if (!(allowed[String(from)] ?? []).includes(to)) {
    errors.push(
      !onPathBranch && from === 'running' && to === 'done'
        ? 'transition running → done is not allowed: the trunk records ready → done — declare `ready` on the branch, in the administrative commit that carries subject_commit, and record `done` on the trunk in a commit of its own after the merge'
        : `transition ${from ?? 'new'} → ${to ?? 'missing'} is not allowed — declare the state the work has actually reached${allowed[String(from)] ? `, one of ${allowed[String(from)].join(' | ')}` : ''}`
    )
  }
  if (onPathBranch && to === 'done') {
    errors.push('a path branch cannot claim `done` — declare `ready` here, and let the commit that integrates the candidate on the trunk record `done`')
  }
  if (to === 'archived' && !PATH_RESOLUTIONS.includes(current?.resolution)) {
    errors.push('status `archived` requires a resolution — declare completed, abandoned or superseded, so the record says what became of the work rather than only that it stopped')
  }
  if (to === 'archived' && from === 'done' && current?.resolution !== 'completed') {
    errors.push('done → archived requires resolution: completed — work that integrated is completed; declare it, or leave the path at done')
  }
  if (from === 'archived' && to === 'archived' && previous?.resolution !== current?.resolution) {
    errors.push(
      `an archived path's resolution is terminal: ${previous?.resolution ?? 'none'} cannot become ${current?.resolution ?? 'none'} — restore the resolution this record was archived with, and record the new judgement in a superseding record`
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
    errors.push('an unintegrated path archives as abandoned or superseded, never completed — declare which it was, or integrate the work and reach archived through done')
  }
  if (to === 'done' && current?.resolution !== 'completed') {
    errors.push('status `done` requires resolution: completed — declare it in the same commit that records done, or the integration says nothing about what landed')
  }
  if (to === 'done' && !isObjectId(current?.subject_commit)) {
    errors.push(`status \`done\` requires subject_commit as a full object id (${OBJECT_ID_FORMATS}) — it is the candidate that was accepted, already named by the record at \`ready\`; carry that value forward rather than typing a new one`)
  }
  return errors
}

/** `depends_on:` as a list, whatever the record carries. */
function dependsOn(front) {
  return Array.isArray(front?.depends_on) ? front.depends_on : []
}

/** The commit in which a record first declared a status — where a lifecycle
 *  event HAPPENED, as against where the file was touched.
 *
 *  ADR-004 decision 1 is the registration: the trunk commit in which the
 *  status became `running`, not the one that first added the file. A record
 *  may land as a `draft` and be activated later, and judging the draft's
 *  parent demanded a `base_commit` the work never forked from; the adopter
 *  answered that demand by rewriting the field, which is how the trunk came to
 *  carry a value the specification's own definition calls false. ADR-008
 *  decision 2 is the integration, and asks the same question of `done`.
 *
 *  `commits` is the record's history in the range, oldest first; `statusAt`
 *  reads the status the record declared in one of them, and each read is a
 *  `git show`, so the search stops at the first match. */
export function statusCommit(commits, statusAt, status = 'running') {
  return commits.find((commit) => statusAt(commit) === status) ?? null
}

/**
 * ADR-017 decision 2. The unit's fourth movement leaves a record: `#### Review`
 * in the step's own file, one line per finding the fresh context returned with
 * its disposition, or the sentence saying it found nothing.
 *
 * Returns the section's body, `''` where the heading stands with nothing under
 * it — the shape a writer leaves when the movement was skipped and the heading
 * copied from the template — and `null` where there is no section at all.
 *
 * The content is not read beyond that. Whether the reader was fresh, and
 * whether the dispositions are honest, is what the owner reads at the
 * candidate; a checker that scored them would be inventing a judgement.
 */
export function reviewSection(text) {
  const section = resolveScopeSection(String(text ?? ''), '#review')
  if (section == null) return null
  const nl = section.indexOf('\n')
  return nl === -1 ? '' : section.slice(nl + 1).trim()
}

/**
 * Is this the file a unit's ledger is kept in?
 *
 * A step record always. The FLAT record shape is its own ledger, so it counts
 * too — but the `index.md` of a FOLDER record never does: it may be edited
 * freely, and a `cairn-unit` block put there could publish a unit, or answer
 * for a unit's review, in a file that can be rewritten the next minute.
 */
export function isUnitLedger(file, recordFile) {
  const dir = String(recordFile ?? '').endsWith('/index.md')
  return isAppendOnlyStepRecord(file) || (!dir && file === recordFile)
}

/** The commit a record's resume section names as its checkpoint, or `null`
 *  when it names none — `unpinned`, empty, or anything that is not an object
 *  id. Fifteen adopter units left it `unpinned`, so neither path could be
 *  resumed cold from its own record, which is the one thing the section is
 *  for (ADR-004 decision 2). */
export function checkpointCommit(text) {
  const section = resolveScopeSection(String(text ?? ''), '#checkpoint')
  const commit = /^\s*commit\s*:\s*(\S+)/m.exec(section ?? '')?.[1]
  return commit && isObjectId(commit) ? commit : null
}

/** ADR-004 decision 5: which ref carries this branch's history, from where the
 *  checker stands. A `pull_request` run of the installed workflow is a
 *  detached checkout of the request head, on purpose — so there is no local
 *  ref and no upstream, and a rule that reads either found nothing on the one
 *  run that is the merge gate. */
export function resolveBranchRef({ branch, remote = REMOTE, detached = false, refExists = () => false }) {
  if (refExists(branch)) return { ref: branch, source: 'local' }
  // HEAD second, and only when the checkout is detached: that is the request
  // head, and it is the commit the gate must judge. Preferring the
  // remote-tracking ref here compares it with itself, so a rewritten published
  // commit passed the one run that is the merge gate.
  if (detached) return { ref: 'HEAD', source: 'head' }
  const tracking = `${remote}/${branch}`
  if (refExists(tracking)) return { ref: tracking, source: 'remote-tracking' }
  return { ref: 'HEAD', source: 'head' }
}

/** A dependency names a path this repository knows. `depends_on:` is the one
 *  edge Cairn keeps between paths, and an edge to nothing is a claim the live
 *  view cannot project: the path would wait forever on a name. */
export function dependencyFindings(paths) {
  const known = new Set(paths.map((path) => String(path.front?.id ?? '')).filter(Boolean))
  const findings = []
  for (const path of paths) {
    for (const id of dependsOn(path.front)) {
      if (!known.has(String(id))) {
        findings.push(`${path.file}: depends_on names ${id}, which no path record declares`)
      }
    }
  }
  return findings
}

/** Whether every path a record depends on has reached the trunk: `done`, or
 *  archived as completed. A dependency in any other state — or one the corpus
 *  does not know — is still waited on. Pure, shared with the live view. */
export function unmetDependencies(front, statuses) {
  const deps = dependsOn(front)
  return deps.filter((id) => {
    const dep = statuses.get(String(id))
    if (!dep) return true
    if (dep.status === 'done') return false
    return !(dep.status === 'archived' && dep.resolution === 'completed')
  })
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

/** A closing record's name carries the candidate it binds. */
export const CLOSING_RECORD = /^closing-([0-9a-f]{40}|[0-9a-f]{64})\.md$/

/** The verdict vocabulary a closing record must name, as STEMS: a record may
 *  qualify one — *drift noted, repaired before merge* — and refusing that
 *  would be a false verdict about a real review. */
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
 *  beneath it. Pure string work, so the rule is testable without a record. */
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

/** Is this closing record a completed review, or a scaffold wearing one?
 *  "Filled" once meant "the placeholder string is absent", which measured a
 *  DELETION rather than a review: a missing record, an untouched scaffold and
 *  a hollowed-out one must not look the same. What can honestly be asked is
 *  that the record NAMES a verdict from the stated vocabulary and ANSWERS at
 *  least one of its own questions — never whether the answers are any good. */
export function fillErrors(text, placeholder = 'TO BE FILLED') {
  const errors = []
  if (String(text).includes(placeholder)) errors.push(`still carries the scaffold placeholder — answer the questions ${placeholder} stands in for, or say in the record why one does not apply`)
  const verdict = String(metadataOf(readFrontmatter(String(text))?.data)?.verdict ?? '').trim()
  if (!verdict) errors.push('no `verdict:` in its frontmatter — state the review\'s outcome in one of the stated stems, so a reader need not infer it from the prose')
  else if (!VERDICT_STEMS.some((stem) => verdict.toLowerCase().startsWith(stem))) {
    errors.push(`verdict "${verdict}" names none of ${VERDICT_STEMS.join(' · ')} — begin it with one of those, and keep whatever else you want to say after it`)
  }
  if (findingsSections(String(text)).filter((s) => s.body !== '').length === 0) {
    errors.push('no findings section has been answered — answer at least one of the coherence questions under `## Findings`')
  }
  return errors
}

export function closingAcceptanceErrors(record, pathId) {
  const errors = []
  if (!record) return ['missing closing record — scaffold it with `cairn-audit --subject <candidate>` and answer its questions before declaring the path ready']
  if (record.path !== pathId) errors.push(`path must equal ${pathId} — this record sits in that path's folder, so name the path it closes`)
  if (!isObjectId(record.subject_commit)) {
    errors.push(`subject_commit must be a full object id (${OBJECT_ID_FORMATS}) — the candidate the gates were run on, read with \`git rev-parse HEAD\` at that commit`)
  }
  if (!String(record.accepted_by ?? '').trim()) errors.push('accepted_by is required — name whoever accepted this candidate, so the record says who is answerable for it')
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(String(record.accepted_at))) {
    errors.push('accepted_at must be an ISO UTC timestamp — write the moment the acceptance happened, as YYYY-MM-DDTHH:MM:SSZ')
  }
  if (record.decision !== 'accepted') errors.push('decision must equal accepted — a candidate integrates on an acceptance; where it was refused, return the record to `running` and produce another')
  if (!String(record.scope_ref ?? '').trim()) errors.push('scope_ref is required — name the same section the opening acceptance bound, so the two digests are comparable')
  // An empty list is the honest disposition of a candidate that raised no
  // advisory; `String([])` is '', and reading it as absent forced a reviewer
  // to invent an entry (greenfield pilot, 2026-09-01).
  if (!Array.isArray(record.advisory_disposition) &&
      !String(record.advisory_disposition ?? '').trim()) {
    errors.push('advisory_disposition is required — record it, empty where the candidate raised no advisory')
  }
  return errors
}

const IMMUTABLE_RECORD_PREFIXES = [
  `${HISTORY_DIR}/`,
  slash(JOURNAL_DIR)
]

/** A closing record inside a path folder: one per candidate, immutable. */
const PATH_CLOSING_RECORD = new RegExp(`^${PATH_DIR}/CP-[^/]+/closing-(?:[0-9a-f]{40}|[0-9a-f]{64})\\.md$`)

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
  const known = IMMUTABLE_RECORD_PREFIXES.some((prefix) => file.startsWith(prefix)) ||
    PATH_CLOSING_RECORD.test(String(file ?? '')) ||
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
 * twenty-three violations. A path is where a record sits; it is not what the
 * record is.
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

/**
 * REPAIR 005 of ADR-004 decision 6. Where history is never rewritten, a pushed
 * step record that was edited cannot be un-edited, and the remedy chapter 5
 * names — *add a superseding record naming both ids* — had no predicate: the
 * repair was recorded and not gated, which is how one wrong unit type on the
 * adopter became four faults nothing could clear.
 *
 * A later step of the same path binds the mutation by naming the blob the
 * record was added with and the blob it carries now. The shape is this
 * repository's own — `<file>@<blob>`, as `governs:` pins a document — with
 * Git's range punctuation between the two ids, in the repair step's own block:
 *
 *     supersedes: project/coding-paths/CP-X/steps/S15.md@64f13aa..35e6d65
 *
 * Both ids or none: a claim naming one blob says which text is gone without
 * saying what replaced it, which is the half that makes the record readable.
 */
export function parseSupersession(value) {
  const match = /^(\S+\.md)@([0-9a-f]{7,64})\.\.([0-9a-f]{7,64})$/.exec(String(value ?? ''))
  return match ? { file: match[1], before: match[2], after: match[3] } : null
}

/**
 * Is this unit's claim readable at all? Three conditions, and the exemption is
 * worth nothing without any one of them:
 *
 * - it is declared in an APPEND-ONLY STEP RECORD, never in the mutable
 *   `index.md` beside it — a sentence that can be added to clear a gate and
 *   deleted afterwards leaves the edit exempted and no record of the
 *   exemption, which is the opposite of what a superseding record is for;
 * - it is a COMPLETED UNIT, by the same reading `work-unit` uses, so half a
 *   block grants nothing;
 * - and it names another STEP RECORD in its own path's steps folder: ADR-004
 *   decision 3 applied to the rule standing beside it, so no path clears
 *   another path's edit and no record clears its own.
 *
 * There is deliberately no fourth condition for *later*. Not because a claim
 * could not be written first — a writer can hash the replacement text before
 * committing it — but because the claim has to name the blob the record
 * carries NOW, so whichever order the two commits land in, both texts are
 * named and both stay reachable, which is the whole of what a superseding
 * record is for. An ordinal comparison would add a predicate that refuses
 * nothing the binding does not already bind.
 *
 * Pure: everything here is read from the unit and its own file name.
 */
export function supersessionClaim(unit) {
  const declared = parseSupersession(unit?.supersedes)
  const file = String(unit?.__file ?? '')
  if (!declared || !isAppendOnlyStepRecord(file) || workUnitErrors(unit).length > 0) return null
  if (!isAppendOnlyStepRecord(declared.file) || declared.file === file) return null
  return dirname(declared.file) === dirname(file) ? declared : null
}

/** Does the claim describe THIS record? A writer copies abbreviated ids out of
 *  `git log`, so a declared id is a prefix of the real one — and a claim about
 *  a text the record does not carry binds nothing, which is the whole reason
 *  the ids are in the declaration rather than a sentence saying "superseded". */
export function supersessionBinds(declaration, { before, after } = {}) {
  const names = (id, declared) => Boolean(id) && String(id).startsWith(declared)
  return Boolean(declaration && names(before, declaration.before) && names(after, declaration.after))
}

/**
 * REPAIR 006 of ADR-004 decision 6. A provisional commit is resolved by a LATER
 * commit of the same path that publishes a completed unit, and by nothing else.
 *
 * The 1.0 rule matched the trailer anywhere in the range with no notion of
 * after, while the unit reference it implements is chronological: *the
 * completed unit's own commit supersedes it*. A timeless grep for a
 * chronological sentence refused a candidate whose draft had been finished
 * three commits earlier, and named the one remedy — fold it — that this host
 * forbids.
 *
 * Order is ancestry rather than the clock: on one branch the two agree, and
 * where they disagree an author date is a claim while reachability is a fact.
 *
 * Pure: the caller supplies the ordering.
 */
export function unresolvedProvisional(provisional, completions, isAncestor) {
  // A commit is its own ancestor, and a draft that also publishes a completed
  // step would otherwise clear itself — the one commit that says out loud it
  // is not finished, resolving the mark it carries.
  return provisional.filter((commit) =>
    !completions.some((unit) => unit !== commit && isAncestor(commit, unit)))
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
 * was proposed for: one path's four records — opening check, closing ceremony,
 * audit and journal entry — each carried the same date in BOTH places, four
 * days before the events they describe. The author-agreement half is blind to that by construction.
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

  if (!front.id) errors.push('missing adr.id — declare the record\'s own number, the one its filename carries')
  else if (expected && front.id !== expected) {
    errors.push(`adr.id "${front.id}" does not match the file name (${expected}) — rename the file to the id it declares, or declare the id it is named after; a record is cited by both`)
  }
  if (!ADR_STATUSES.includes(front.status)) {
    errors.push(`status "${front.status}" is outside the vocabulary — declare one of ${ADR_STATUSES.join(' | ')}; a decision is proposed, accepted, superseded or rejected, and nothing else`)
  } else if (bodyStatus && bodyStatus !== front.status) {
    errors.push(`adr.status "${front.status}" contradicts the document's own "Status: ${bodyStatus}" — make the two agree; the frontmatter is what every index reads and the line is what a person reads`)
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(front.date))) {
    errors.push('adr.date must be an ISO date (YYYY-MM-DD) — write the day the decision was made, not the day the file was touched')
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
 *
 * ABOUT THE REPOSITORY THE HOST CHECKED OUT, AND NO OTHER (S09d). The host's
 * variables describe `GITHUB_WORKSPACE`. This checker also runs inside
 * repositories the fixture suite builds under a temporary directory, and in
 * CI those runs inherited `GITHUB_REF_NAME=path/cp-ops-002` and were judged as
 * a branch none of them had: seventeen fixtures red in CI, green on every
 * laptop, for seven pushes. The environment is a proxy for "which branch is
 * this tree on", truthful only for the tree it describes — so a host variable
 * is trusted when the host names no workspace, or names this one.
 */
export function hostDescribes(env = {}, root = null) {
  const workspace = env.GITHUB_WORKSPACE
  if (!workspace || !root) return true
  const real = (dir) => {
    try { return realpathSync(dir) } catch { return resolve(dir) }
  }
  return real(workspace) === real(root)
}

export function resolveBranch({ flag, env = {}, symbolicRef, abbrevRef, root = null }) {
  if (flag) return { branch: flag, source: 'flag' }
  if (hostDescribes(env, root)) {
    // pull_request: the SOURCE branch of the PR, which is the path branch.
    if (env.GITHUB_HEAD_REF) return { branch: env.GITHUB_HEAD_REF, source: 'github-head-ref' }
    // push: the branch pushed to. On a pull_request this is "<n>/merge", which
    // names the merge preview rather than any branch — never trust it there.
    if (env.GITHUB_REF_NAME && !/^\d+\/(merge|head)$/.test(env.GITHUB_REF_NAME)) {
      return { branch: env.GITHUB_REF_NAME, source: 'github-ref-name' }
    }
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

/** A concept is named by its path under the root, so every folder's index is
 *  an index, not a note. */
const isConceptIndex = (file) => file.split('/').at(-1) === 'index.md'

/** Every concept note one document's text sends a reader to, each as a path
 *  under the concept root. The capture admits folders, so `../concepts/x.md`
 *  — which holds `./` at offset one — matches there first and takes
 *  `concepts/` with it; the note is whatever follows the LAST `concepts/`.
 *  Pure, because the whole of `concept-orphan` turns on this resolution. */
export function conceptLinkTargets(text) {
  const targets = new Set()
  // Which alternative matched decides what the captured folders mean, so the
  // prefix is captured too. Through `concepts/` — by either route — the
  // folders are the note's own. Reached by a bare `./` they are some other
  // document's: `./modules/application.md` is not a concept, and admitting it
  // would clear an orphan of that name.
  for (const [, prefix, path] of text.matchAll(/(concepts\/|\.\/)((?:[a-z0-9-]+\/)*[a-z0-9-]+\.md)/g)) {
    const cut = path.lastIndexOf('concepts/')
    if (cut !== -1) targets.add(path.slice(cut + 'concepts/'.length))
    else if (prefix === 'concepts/' || !path.includes('/')) targets.add(path)
  }
  return targets
}

export function orphanConcepts(conceptFiles, linkedTargets) {
  const linked = linkedTargets instanceof Set ? linkedTargets : new Set(linkedTargets)
  return conceptFiles.filter((file) => !isConceptIndex(file) && !linked.has(file))
}

/** Concept notes present now and absent at the comparison ref. `null` previous
 *  means the ref could not be read, which is not evidence of no growth — the
 *  caller reports nothing rather than claiming a number it does not have. */
export function addedConcepts(previous, current) {
  if (previous == null) return null
  const before = new Set(previous)
  return current.filter((file) => !isConceptIndex(file) && !before.has(file))
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
 * The verdict a developer runs is therefore the merge-deciding one, on the
 * branch where a merge is pending, and there is no narrower form. The 0.2
 * checker kept a `--working-tree` opt-out and announced it through a
 * `base-parity` advisory; Cairn 1.0 retired both, because a comparison nobody
 * should record is a comparison nobody should be offered. An explicit `--base`
 * remains for CI and for the tests, and the header names it.
 *
 * Pure: the caller supplies ref resolution, so the decision is testable
 * without a repository.
 */
export function resolveBase({ flag = null, branch, refExists = () => false }) {
  // A flag is taken as ASKED FOR, not as usable. Whether it can be compared
  // with THIS commit is one question with one answer, and `main` asks it, once,
  // with `merge-base`: a ref that does not resolve and a ref on an unrelated
  // history both fail it. Checking resolvability here as well would be a second
  // implementation of the same decision, and the weaker one.
  if (flag) return { base: flag, source: 'flag' }
  // Off a path branch there is no pending merge to decide, so the working
  // tree is the right question and no parity claim is being made.
  if (!isPathBranch(branch)) return { base: null, source: 'trunk-work' }
  const resolved = TRUNK_BASE_CANDIDATES.find((ref) => refExists(ref))
  if (resolved) return { base: resolved, source: 'default-trunk' }
  // An unfetched or remote-less checkout cannot be given the merge-deciding
  // comparison. Fall back rather than refuse — the header names the source,
  // and the trunk-containment rule reports the missing trunk as inconclusive,
  // so a narrowed run cannot read as the full one.
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
      // `**` is a globstar only when it is a WHOLE SEGMENT, which is what every
      // glob means by it and what `patternsMeet` reads. Glued to anything else
      // it is an ordinary `*`: compiled as `.*` it spanned separators, so
      // `docs/**.md` took in `docs/a/b.md` where the meet reader said it could
      // not, and two live paths could share a file with no overlap reported.
      const wholeSegment = pattern[i + 1] === '*' && (i === 0 || pattern[i - 1] === '/')
      const trailing = i + 2 === pattern.length
      if (wholeSegment && trailing) {
        out += '.*'
        i += 1
      } else if (wholeSegment && pattern[i + 2] === '/') {
        // Zero or more COMPLETE segments: `a/**/x.md` is `a/x.md` and
        // `a/b/x.md`, and never `a/zzzx.md`.
        out += '(?:[^/]+/)*'
        i += 2
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

/** Two declared surfaces MEET when some file matches both patterns.
 *
 *  Filling each pattern's wildcards to make one concrete file and offering it
 *  to the other is the obvious shortcut and it is wrong in both directions:
 *  `spec/**\/*.md` and `spec/reference/**` both name
 *  `spec/reference/conformance.md`, and `docs/*.md` and `docs/adr-*` both name
 *  `docs/adr-1.md`, yet no single filling of either satisfies the other. One
 *  filling can only line up a prefix with a prefix.
 *
 *  It is the same problem at two scales — `**` over segments, `*` over
 *  characters — so it is one function: walk both sides together, and where a
 *  wildcard stands, try consuming nothing and try consuming one token.
 *
 *  `**` is read here as zero or more whole SEGMENTS, which is what a `writes:`
 *  means by it and what `globToRegExp` — the matcher deciding whether a FILE is
 *  in a surface — compiles it to. The two agreed on everything else and parted
 *  on `**` until the closing request of CP-CAIRN-006: compiled as `.*` it took
 *  in `a/a/ax.md` for `a/**\/x.md`, which this reader has never done, so two
 *  live paths could share a file with no overlap reported. The suite sweeps
 *  both readings over an alphabet that now contains `**`.
 *
 *  One edge remains, and it is this reader that is broader: `a/**` meets `a`
 *  here, where no FILE named `a` is inside that surface. A surface is a set of
 *  files; whether two declarations can collide is a question about the
 *  declarations, and answering it generously is what an advisory is for.
 */
export function patternsMeet(a, b) {
  return tokensMeet(String(a).split('/'), String(b).split('/'), '**', segmentsMeet)
}

const segmentsMeet = (a, b) => tokensMeet([...a], [...b], '*', (x, y) => x === y)

/** Memoised on the pair of positions: a wildcard branches two ways at every
 *  one of them, and without this a pattern of a dozen `**` takes seconds. */
function tokensMeet(a, b, wild, leafMeets) {
  const seen = new Map()
  const meet = (i, j) => {
    const key = i * (b.length + 1) + j
    if (seen.has(key)) return seen.get(key)
    let answer
    if (i === a.length) answer = b.slice(j).every((token) => token === wild)
    else if (j === b.length) answer = a.slice(i).every((token) => token === wild)
    else if (a[i] === wild) answer = meet(i + 1, j) || meet(i, j + 1)
    else if (b[j] === wild) answer = meet(i, j + 1) || meet(i + 1, j)
    else answer = leafMeets(a[i], b[j]) && meet(i + 1, j + 1)
    seen.set(key, answer)
    return answer
  }
  return meet(0, 0)
}

/** ADR-003: pairs of live paths whose declared surfaces meet, each with the
 *  patterns that meet — silent when either declares `depends_on` the other,
 *  because the live view then shows one waiting on the other rather than
 *  racing it. On the adopter this was declared in prose under a coherence
 *  question, where no rule reads. */
export function writesOverlaps(paths) {
  // The statuses that may own a path branch ARE the live ones: `draft` has not
  // started and `done`/`archived` have finished, so neither holds a surface.
  const liveOnes = paths.filter((path) => PATH_BRANCH_STATUSES.includes(path.front?.status))
  const declares = (path, id) => dependsOn(path.front).map(String).includes(id)
  const found = []
  for (let i = 0; i < liveOnes.length; i += 1) {
    for (let j = i + 1; j < liveOnes.length; j += 1) {
      const [a, b] = [liveOnes[i], liveOnes[j]]
      const [idA, idB] = [String(a.front?.id ?? ''), String(b.front?.id ?? '')]
      if (declares(a, idB) || declares(b, idA)) continue
      const patterns = new Set()
      for (const one of a.writes ?? []) {
        for (const other of b.writes ?? []) {
          if (patternsMeet(one, other)) patterns.add(one === other ? one : `${one} ∩ ${other}`)
        }
      }
      if (patterns.size) found.push({ paths: [idA, idB], patterns: [...patterns] })
    }
  }
  return found
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
 *  `branch-identity` while still being counted as changed. Found by the one
 *  file that had such a name, which had already broken a `find` loop in the
 *  audit that named it.
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
 * knowable in advance; the commit that carries the step is the checkpoint, and
 * on a no-rewrite host it keeps the id it was verified as.
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
  if (!unit.step) errors.push('a cairn-unit block needs step — name the step this unit completed, as its own record does')
  if (!/^\d{1,4}$/.test(unit.unit ?? '')) {
    errors.push(`a cairn-unit block needs unit as a ledger ordinal, got "${unit.unit ?? ''}" — number it after the last completed unit of this path`)
  }
  if (!WORK_UNIT_TYPES.includes(unit.type)) {
    errors.push(
      `work-unit type "${unit.type ?? ''}" is outside ${WORK_UNIT_TYPES.join(' | ')} — declare the one whose surfaces this unit moved; and if the record is already pushed, correct it with a superseding step that binds both blobs, never by editing it`
    )
  }
  if (!unit.verified) errors.push('a cairn-unit block needs verified — name the gates you ran bare on this unit, so a reader knows what the claim rests on')
  return errors
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

/** The opening acceptance a path record carries inline: the last fenced YAML
 *  block under its `## Opening acceptance` heading. A later block is a scope
 *  amendment — a new acceptance naming the one it supersedes — so the last one
 *  is the acceptance in force. `null` when the record carries none.
 *
 *  Cairn 0.2 read this from a session record; 1.0 keeps it in the record it
 *  accepts, because a decision about a text belongs beside the text, and a
 *  path is one folder. Pure: the caller supplies the record's text. */
export function openingFromRecord(text) {
  const section = resolveScopeSection(String(text ?? ''), '#opening-acceptance')
  if (!section) return null
  const blocks = [...section.matchAll(/^```ya?ml[ \t]*\n([\s\S]*?)^```[ \t]*$/gm)]
  if (blocks.length === 0) return null
  const parsed = readFrontmatter(`---\n${blocks.at(-1)[1]}\n---\n`)
  return parsed?.data && Object.keys(parsed.data).length > 0 ? parsed.data : null
}

/** What an opening acceptance must say to accept anything: a decision, an
 *  actor, a UTC time, the scope it accepted and the digest that binds it. */
export function openingAcceptanceErrors(opening) {
  if (!opening) return ['no opening acceptance']
  const errors = []
  if (opening.decision !== 'accepted') errors.push('decision must equal accepted — a path opens on an acceptance, so record the owner\'s answer rather than the question')
  if (!String(opening.accepted_by ?? '').trim()) errors.push('accepted_by is required — name whoever accepted this scope, so the record says who is answerable for it')
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(String(opening.accepted_at))) {
    errors.push('accepted_at must be an ISO UTC timestamp — write the moment the acceptance happened, as YYYY-MM-DDTHH:MM:SSZ')
  }
  if (!String(opening.scope_ref ?? '').includes('#')) errors.push('scope_ref must name a file and a heading anchor — point it at this record\'s own `#definition-of-done`, so the digest below has text to bind')
  if (!/^[a-z0-9]+:[0-9a-f]+$/.test(String(opening.scope_digest ?? ''))) {
    errors.push('scope_digest is required — a scope accepted without a digest is bound to nothing; compute it with `cairn-check --scope-digest <record>#definition-of-done`')
  }
  return errors
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
      errors.push(`closure changed \`${key}\`, which acceptance was measured against — restore it to the value the candidate was accepted with; only ${mutable.join(', ')} may move when a path declares ${current.status}`)
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
    return ['advisory_disposition must be a list of { rule, disposition, reason } entries — write one entry per advisory the candidate raised']
  }
  if (!Array.isArray(attested)) {
    errors.push('advisories_at_candidate must list the advisory rules raised at the candidate — run the gate on the candidate and record the advisory rule names it reported')
    attested = []
  }
  const attestedSet = new Set(attested)
  for (const rule of raisedHere) {
    if (!attestedSet.has(rule)) {
      errors.push(`advisory "${rule}" is raised at the closure commit but is absent from advisories_at_candidate — add it to the attested set and dispose of it; the closure commit's findings are a subset of the candidate's, so its absence proves the set incomplete`)
    }
  }
  const named = new Set()
  for (const entry of disposition) {
    if (typeof entry !== 'object' || entry == null) {
      errors.push('every advisory_disposition entry must name a rule, a disposition and a reason — write each as a mapping with those three keys')
      continue
    }
    if (!entry.rule) errors.push('an advisory_disposition entry has no rule — name the advisory rule it disposes of, as the gate reported it')
    else named.add(entry.rule)
    if (!DISPOSITIONS.includes(entry.disposition)) {
      errors.push(`disposition "${entry.disposition ?? ''}" for ${entry.rule ?? 'an entry'} is outside ${DISPOSITIONS.join(' | ')} — declare which of those this advisory received`)
    }
    if (!String(entry.reason ?? '').trim()) {
      errors.push(`${entry.rule ?? 'an entry'} has no reason — state in one sentence why the advisory was disposed of that way`)
    }
    if (entry.disposition === 'deferred' && !(entry.owner && entry.follow_up)) {
      errors.push(`${entry.rule ?? 'an entry'} is deferred without an owner and a follow_up — name who carries it and where it is tracked, or dispose of it here`)
    }
  }
  for (const rule of attestedSet) {
    if (!named.has(rule)) errors.push(`advisory "${rule}" was raised at the candidate and has no disposition — add an entry saying whether it was fixed, accepted or deferred, and why`)
  }
  for (const rule of named) {
    if (!attestedSet.has(rule)) {
      errors.push(`advisory_disposition names "${rule}", which advisories_at_candidate does not list as raised — add it to the attested set if the candidate raised it, or remove the entry`)
    }
  }
  return errors
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

/** Escalation is one-way. A change does not become small by being called small,
 *  so the only direction a route may move is toward more ceremony. */
export function routeDescent(previous, current) {
  if (!previous || !current || previous === current) return null
  if (previous === 'full' && current !== 'full') {
    return `route moved from full to ${current} — restore \`full\`; escalation is one-way, and a change does not become small by being called small`
  }
  return null
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
  checkpointFor,
  closureFor,
  closureStateFor,
  previousPaths = new Map(),
  immutableMutations = [],
  relocations = [],
  supersessions = [],
  integrationStateFor = null,
  branchSource = 'symbolic-ref',
  baseSource = 'unresolvable',
  baseRequested = null,
  baseIsHead = false,
  workUnits = null,
  reviewFor = null,
  rewritingForbidden = REWRITING_FORBIDDEN,
  addedRecords = [],
  provisionalInCandidate = [],
  headProvisional = false,
  scopeDigestFor = null,
  subjectFrontFor = null,
  derivedViewCurrent = null,
  previousFronts = new Map(),
  journalEntries = [],
  trunkDelta = null,
  openingRecordFor = null,
  migrationExempt = V02_MIGRATION_PATHS,
  transport = INTEGRATION_TRANSPORT,
  redactionRecordExists = null
}) {
  const pullRequest = transport === 'pull-request'
  const findings = []
  const add = (level, rule, message, outcome = level === 'advisory' ? 'advisory' : 'fail') =>
    findings.push({ level, rule, outcome, message })
  const touched = (prefix) => changed.filter((file) => file.startsWith(prefix))
  const onPath = isPathBranch(branch)
  const match = paths.find((p) => p.front?.branch === branch)

  // 0. the COMPARISON itself. Every changed-file rule inherits it, so a base
  //    that does not resolve is not a smaller run — it is no run at all, and
  //    the old behaviour was to die inside `git merge-base` with a Node stack
  //    trace: a red gate carrying no finding. CI supplies this from the forge's
  //    own event, whose value on a branch's first push is forty zeros, so the
  //    first adopter to install the workflow meets it. Reported, never guessed
  //    at (ADR-026 decision 1's principle, one rule over).
  // A base that RESOLVES can still be no comparison: if it is this very
  // commit, `merge-base` is HEAD and the diff is empty. That is not a clean
  // tree — it is a question asked of itself, and it is how every integrating
  // unit this repository landed reached zero changed files under a green run.
  // Only on the TRUNK. On a path branch a base equal to HEAD means the branch
  // carries no commit yet, which is benign and which both invocations see
  // alike — the parity fixtures for this very requirement caught the first
  // draft of this rule reporting it on one invocation and not the other. On
  // the trunk it is never benign: HEAD is an arrival or trunk work, and a base
  // equal to it is a push compared with itself.
  if (baseIsHead && !onPath) {
    add('blocking', 'comparison',
      'the base given already contains this commit, so the comparison is empty and every changed-file rule was narrowed to the working tree — provide a base that predates what you are judging: the target branch for a request, and for a push to the trunk the commit it replaced',
      'inconclusive')
  }
  // Only where a base was ASKED for. `unresolvable` is also the answer for a
  // checkout with no trunk ref and no flag, which `resolveBase` falls back on
  // deliberately and `trunk-containment` reports; refusing there would refuse a
  // clone for not having fetched yet.
  if (baseSource === 'unresolvable' && baseRequested) {
    // The forge's sentinel for "nothing precedes this": a branch's first push.
    // That is a fact about the history, not a broken input, and failing a
    // repository's first push to its trunk would be the gate refusing a state
    // the writer cannot avoid.
    if (/^0{40,}$/.test(baseRequested)) {
      add('advisory', 'comparison',
        'no commit precedes this push — the forge names none, so this run judged the working tree alone; the next push to this ref compares against this commit')
    } else {
      add('blocking', 'comparison',
        `the base this run was asked to compare against cannot be compared with this commit (${baseRequested}), so every changed-file rule was narrowed to the working tree — fetch the ref first; where no ref reaches it, as after a force-push that rewound what the forge named, provide a --base that is still reachable`,
        'inconclusive')
    }
  }

  // 1. branch → path — and FAIL CLOSED when the branch has no name -------
  // Every path-scoped rule is guarded by the branch name. A check that cannot
  // name the branch cannot run the rules that protect the trunk, and silence is
  // indistinguishable from a pass: reporting "OK" there certifies a claim
  // nobody checked. So a detached checkout is the degenerate case of "no path
  // declares this branch" — inconclusive where an unenforced protocol leaves
  // the repository WRONG (source landing without a registered, current path),
  // advisory elsewhere, so a detached docs-only or tag build is not punished
  // for the way it was checked out. This was `branch-identity` in 0.2.
  if (branchSource === 'detached') {
    const guarded = changed.filter((file) => GUARDED_ROOTS.some((root) => file.startsWith(root)))
    const how =
      'resolve it from GITHUB_HEAD_REF, `git symbolic-ref --short HEAD`, or pass --branch <name>; ' +
      'in GitHub Actions also check out the pull request HEAD sha, because the default merge ref ' +
      'contains the base by construction and makes the trunk-containment gate pass without proving anything'
    if (guarded.length > 0) {
      add('blocking', 'branch-path',
        `detached checkout: the branch cannot be identified, so every path rule was SKIPPED while ${guarded.length} guarded file(s) changed — ${how}`,
        'inconclusive')
    } else {
      add('advisory', 'branch-path',
        `detached checkout: path rules were skipped because the branch could not be identified — ${how}`)
    }
  }
  if (onPath) {
    if (!match) {
      add('blocking', 'branch-path',
        `branch "${branch}" has no coding path declaring it — register the path first, landing a record in ${PATH_DIR}/ that declares ${METADATA_NAMESPACE}.branch: ${branch} on the trunk, or check out the branch the record you are working on names`)
    } else if (!PATH_BRANCH_STATUSES.includes(match.front.status)) {
      add('blocking', 'branch-path',
        `${match.file} declares this branch but its status is "${match.front.status}" — check out the branch whose record is live, or open a path for the work you meant to do here; a path branch is running, blocked or ready, and done is recorded by integration on the trunk`)
    } else if (!isCommitPin(match.front.base_commit)) {
      add('blocking', 'branch-path',
        `${match.file} needs ${METADATA_NAMESPACE}.base_commit as a 7–64 digit Git hash — the parent of the commit that registered this path, read with \`git rev-parse <registration>^\``)
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
    const baseMismatch = registrationBaseState?.state === 'mismatch' ? registrationBaseState : null
    if (registrationState !== 'grandfathered' && baseMismatch) {
      add('blocking', 'registration-base',
        `${match.file} base_commit is not the parent of its trunk registration commit ${baseMismatch.registration}, whose parent is ${baseMismatch.parent} — read \`git merge-base ${TRUNK_BRANCH} ${branch}\`: where it prints that parent, the field was read from the wrong commit and states the branch point once corrected; where it prints something earlier, the branch was created before registration, and \`spec/reference/repair.md\` names the repair — register retroactively in a \`repair\` unit, with the field at the real branch point`)
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
  // Each of these names the ref it read: "no upstream" and "read from the
  // remote-tracking ref" are the two answers a detached request-head checkout
  // can give, and they mean opposite things (ADR-004 decision 5).
  const readFrom = remoteCheckpoint?.branchRef
    ? ` (read from ${remoteCheckpoint.branchRef.ref}, the ${remoteCheckpoint.branchRef.source} ref)`
    : ''
  if (onPath && remoteCheckpoint?.state === 'missing') {
    add('advisory', 'remote-checkpoint',
      `branch "${branch}" has no upstream and ${REMOTE}/${branch} does not exist${readFrom} — push every commit and set ${REMOTE}/${branch} as upstream before reporting the step complete`)
  } else if (onPath && remoteCheckpoint?.state === 'unpushed') {
    add('advisory', 'remote-checkpoint',
      `the branch tip is not contained in ${remoteCheckpoint.upstream}${readFrom} — push this commit before reporting the step complete or offering an ordinary fresh-session handoff`)
  }

  // 2b. a published path branch is not rewritten (ADR-022) ------------------
  //
  // This REPLACES checkpoint retention rather than joining it. Retention exists
  // to keep ledger-named commits reachable across a rewrite; if nothing is
  // rewritten, the branch already keeps them, and after a --no-ff integration
  // merge the trunk keeps them permanently.
  //
  // Deliberately narrow, and the message says so. It proves that THIS checkout
  // has not rewritten what it published; it cannot prove a remote was never
  // rewritten by someone else, and it can only speak while a remote-tracking
  // ref is present to compare against.
  if (rewritingForbidden && onPath && remoteCheckpoint?.diverged) {
    add('blocking', 'path-history',
      `${remoteCheckpoint.upstream} is not an ancestor of ${remoteCheckpoint.branchRef?.ref ?? 'the branch tip'}, so a published commit was rewritten — this host declares pathHistoryPolicy: forbidden, under which a path branch is never rebased, amended, soft-reset or force-pushed once published. ` +
      'Recover the published tip and merge the trunk in rather than rebasing onto it; if the divergence is a concurrent push, this branch has more than one writer, which the path convention forbids')
  }

  // 3. the rebase gate (owner directive: "the rebase need should be an
  //    automated gate"). Every path merges ITSELF, so nothing else stops a
  //    stale branch from landing on a trunk it never saw. Objective, and one
  //    command fixes it — it serializes the MERGE, never the WORK.
  //
  //    The rule NAME is historical. What it checks is that the branch contains
  //    the trunk tip, and ADR-022 keeps that requirement exactly — it is the
  //    property that serializes the merge without an integrator. What changed is
  //    the operation that satisfies it: a no-rewrite host merges the trunk in
  //    rather than rebasing onto it. The id stays because audits and recorded
  //    advisory dispositions name it; the REMEDY follows the declared policy,
  //    because telling an operator to rebase under `pathHistoryPolicy:
  //    forbidden` would instruct the violation the next rule blocks.
  if (onPath && trunkContained === false) {
    const remedy = rewritingForbidden
      ? `merge the trunk into "${branch}"`
      : `rebase "${branch}" onto the trunk`
    add('blocking', 'rebase',
      `branch "${branch}" does not contain the trunk tip — ${remedy} before merging, and let CI run on that result, not a stale branch`)
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

  // ADR-008 decision 2. The integrating unit is ONE COMMIT FOR ONE PATH: one
  // commit from a clean trunk checkout carrying `done`, the resolution, the
  // live view and the journal entry. The arrivals are counted once here,
  // because "how many paths does this change integrate" is a question about
  // the change and not about any one record.
  const previousOf = (file) => (previousPaths instanceof Map
    ? previousPaths.get(file)
    : previousPaths?.[file])
  const arrivingDone = paths.filter((path) =>
    path.front?.status === 'done' &&
    stateChanged.includes(path.file) &&
    previousOf(path.file) !== undefined &&
    previousOf(path.file)?.status !== 'done')
  // One read per record reaching `done`, for the two rules that ask about it.
  // Only an arrival is read: a record that was already `done` integrated in
  // some earlier change, and this one has no integrating commit of its own.
  const integrationOf = new Map(arrivingDone
    .map((path) => [path.file, integrationStateFor?.(path.file, path.front?.id) ?? null]))
  // One commit for one path is the reading that binds (ADR-026 decision 3,
  // superseding ADR-008 decision 2's *never two paths in one request*). Two
  // arrivals in one COMMIT is the refusal; two in one comparison is an ordinary
  // request spanning two honest integrations, and refusing it would tell the
  // author to do what they already did. An arrival with no commit yet is the
  // one being prepared in the working tree, and there is one of those.
  const perCommit = new Map()
  for (const path of arrivingDone) {
    const key = integrationOf.get(path.file)?.commit ?? null
    if (!perCommit.has(key)) perCommit.set(key, [])
    perCommit.get(key).push(path.front.id)
  }
  for (const [commit, ids] of perCommit) {
    if (ids.length > 1) {
      add('blocking', 'acceptance',
        `${ids.join(', ')} reach done in ${commit ?? 'the commit being prepared'} — integrate one path per commit, from a clean trunk checkout, so that each integration can be read, reverted and journalled on its own`)
    }
  }
  // ADR-026 decision 4. On `pull-request` the candidate lands with the merge and
  // `done` follows in a commit of its own, so a merge object carrying the edit
  // is the shape ADR-008 decision 2 refuses. On `manual-git` that merge IS the
  // integrating unit — `cairn-close` step 5 and chapter 5 both prescribe it —
  // and this refusal does not reach there. It is not the only one that did —
  // see `tools/soundness.md` on the `transition` reading, which ADR-026 does
  // not decide and which WOULD refuse that closing. Until 2026-09-14 it did
  // not refuse anything: no run compared the trunk across an integrating
  // commit, so neither rule was reached on either transport. Item 13 of this
  // path gave them the comparison, and `comparison` reports when there is
  // none.
  if (pullRequest) {
    for (const path of arrivingDone) {
      const integration = integrationOf.get(path.file)
      if (integration?.merge) {
        add('blocking', 'acceptance',
          `${path.file} reaches done in ${integration.commit}, which is a merge object carrying the edit — land the candidate with the merge, then record done in one commit of its own on the trunk`)
      }
    }
  }

  for (const path of paths) {
    if (stateChanged.includes(path.file)) {
      const previous = previousOf(path.file)
      if (previous === undefined) {
        add('blocking', 'transition',
          `${path.file}: previous path state is unavailable — provide a complete comparison ref`,
          'inconclusive')
      } else {
        const legacy = migrationExempt.has(String(path.front?.id ?? ''))
        for (const error of transitionErrors(previous, path.front, onPath && path === match,
          integrationOf.get(path.file)?.readyBehind ?? false)) {
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
      const arriving = arrivingDone.includes(path)
      const id = String(path.front?.id ?? '')
      if (arriving && journalEntries == null) {
        add('blocking', 'journal-entry',
          `${path.file} reaches done, and the journal could not be read to check for its entry — provide ${JOURNAL_DIR}/ and rerun the gate; missing evidence is not a pass`,
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
          `${path.file} reaches done with no journal entry declaring \`${METADATA_NAMESPACE}.path: ${id}\` — write one file under ${JOURNAL_DIR}/ in this same change, with the id under the metadata block and nowhere else`)
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
    // On `manual-git` the closing record in the path folder IS the acceptance
    // and the coherence checklist, one file naming exactly `C`: its fields, its
    // verdict and its answered questions are read here. On `pull-request` the
    // request's description and approval are that record, kept by the forge;
    // the checker reads nothing about them and says so on the conformance
    // page, because a review is native to the forge and re-checking it here
    // would be the invented solution the manifesto warns about.
    if (!pullRequest) {
      for (const error of closingAcceptanceErrors(record, path.front.id)) {
        add(legacyRecord ? 'advisory' : 'blocking', 'acceptance',
          `${path.file}: ${error}${legacyRecord ? ' (grandfathered: closed before candidate-bound closure existed)' : ''}`)
      }
      if (record?.subject_commit && path.front.subject_commit !== record.subject_commit) {
        add('blocking', 'acceptance',
          `${path.file}: ${METADATA_NAMESPACE}.subject_commit must equal the closing record subject_commit — one closure binds one candidate, so write the closing record for the candidate this record names, or declare the candidate that record reviewed`)
      }
      for (const error of record?.__fill ?? []) {
        add('blocking', 'acceptance',
          `${record.__file} is not a completed review: ${error} — answer the coherence questions on this candidate before declaring the path ready`)
      }
    }
    const state = closureStateFor?.(path, record)
    if (state == null) {
      add(legacyRecord ? 'advisory' : 'blocking', 'acceptance',
        `${path.file}: cannot inspect the accepted candidate and administrative closure commit${legacyRecord ? ' (grandfathered: it ran on the trunk, so no candidate commit exists to inspect)' : ' — fetch the branch this record names and rerun the gate, so the closure is judged rather than assumed'}`,
        legacyRecord ? undefined : 'inconclusive')
    } else {
      if (!state.subjectIsAncestor) {
        add('blocking', 'acceptance',
          `${path.file}: accepted subject_commit is not an ancestor of HEAD — check out the branch that holds the candidate, or produce a new candidate and re-accept it; a closure judges the commit it names`)
      }
      // At `ready` the branch holds C and exactly one administrative commit,
      // whose files are judged. At `done` the candidate has been integrated by
      // the transport: the merge landed C and A, other paths may have landed
      // beside them, and what this checkout can prove is that C is reachable —
      // the closure surface was proved at `ready`, on the exact commit that
      // landed, and `journal-entry` and `transition` prove the rest.
      if (path.front.status === 'ready') {
        if (state.commitsAfterSubject !== 1) {
          add('blocking', 'acceptance',
            `${path.file}: ready requires exactly one administrative commit after subject_commit; found ${state.commitsAfterSubject} — declare ready in one commit that changes only the closure surface; work that belongs to the path needs a new candidate that contains it`)
        }
        if (state.forbiddenFiles?.length) {
          add('blocking', 'acceptance',
            `${path.file}: implementation changed after acceptance: ${state.forbiddenFiles.join(', ')} — the candidate is void; return the record to \`running\`, produce a new candidate and repeat review and acceptance on it`)
        }
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
    // REPAIR 005. A mutation that a later step of this path has bound — the
    // blob it replaces, the blob it adds — is the remedy chapter 5 names, not
    // a second violation: both texts stay reachable and the correction is a
    // new step. The claim is checked against the blobs the record really
    // carries, because a supersession nobody verifies is a sentence that
    // clears any edit.
    const claims = new Map(supersessions.map((claim) => [claim.file, claim]))
    for (const file of immutableMutations) {
      if (!isImmutableRecord(file) || relocated.has(file)) continue
      const claim = claims.get(file)
      if (!isAppendOnlyStepRecord(file)) {
        add('blocking', 'record-integrity',
          `${file} is an existing immutable record and may not be modified, renamed, or deleted; add a superseding record instead`)
      } else if (supersessionBinds(claim?.declared, claim?.actual)) {
        add('advisory', 'record-integrity',
          `${file} is superseded on this branch by ${claim.declaredIn}, which binds ${claim.declared.before} to ${claim.declared.after} — the earlier text stays reachable and the correction is a new step, stated rather than exempted in silence`)
      } else {
        add('blocking', 'record-integrity',
          claim
            ? `${file} no longer preserves its adding blob as a prefix, and the supersession in ${claim.declaredIn} binds ${claim.declared.before} to ${claim.declared.after}, which this record does not carry — it was added as ${claim.actual.before ?? 'a blob this checkout cannot read'} and carries ${claim.actual.after ?? 'no text'}`
            : `${file} no longer preserves its adding blob as a prefix — append a suffix, or supersede it from a later step of this path binding the blob it replaces to the blob it adds`)
      }
    }
  }

  // 4c. the dates a record carries --------------------------------
  // Immutability protects a record from being changed later; it says nothing
  // about a record that was already wrong when it was written. Scoped to the
  // records this change ADDS, because an existing one may not be edited to
  // satisfy a rule that did not exist when it was written — there, the fix
  // would be the violation. ADVISORY on both halves since Cairn 1.0: a
  // record's dates are evidence a reviewer weighs, and the manifesto's test
  // for blocking — the repository is WRONG, not merely questionable — is not
  // met by a date that a human wrote twice.
  for (const finding of recordDateFindings(addedRecords)) {
    if (finding.kind === 'disagreement') {
      add('advisory', 'record-date',
        `${finding.file}: the filename says ${finding.named} and \`timestamp:\` says ${finding.declared} — one of the two dates this record carries is false`)
    } else {
      add('advisory', 'record-date',
        `${finding.file} is dated ${finding.carried} and was written on ${finding.addedOn}, ${finding.drift} days apart — a dated record states when its event happened, so record why this one carries an earlier date`)
    }
  }

  // 4d. a running path records its opening acceptance ---------------------
  //
  //     A path becomes shared work through opening acceptance and THEN
  //     registration, so a record declaring `running` with no acceptance
  //     behind it fails the record's own schema: the declaration claims a
  //     state it has not earned. This was `opening-ceremony` in 0.2, a rule of
  //     its own that read a session note; Cairn 1.0 folds it into `schema`
  //     because the acceptance is part of the record, inline under its own
  //     heading in `index.md`.
  //
  //     Scoped to a path file IN THE DIFF declaring `running`, so a path that
  //     closed before the requirement existed is never examined.
  if (openingRecordFor) {
    for (const path of paths) {
      if (path.front?.status !== 'running' || !stateChanged.includes(path.file)) continue
      const id = path.front.id
      const opening = openingRecordFor(id)
      const errors = openingAcceptanceErrors(opening)
      if (errors.length === 0) continue
      if (LEGACY_UNDECLARED_OPENINGS.has(id)) {
        add('advisory', 'schema',
          `${path.file} predates the inline opening acceptance — write its \`## Opening acceptance\` section from the record it has, and do not copy the exception`)
        continue
      }
      add('blocking', 'schema',
        `${path.file} is running with no valid opening acceptance under \`## Opening acceptance\` (${errors.join('; ')}) — write that block into the record before the path runs; a path activates on recorded acceptance, never on a conversation`)
    }
  }

  // 3. a completed unit moves its source, its module note and its step together
  //    Not path-gated: source landing on the trunk without its note is exactly
  //    as undocumented. This half was `same-work-unit` in 0.2, with the area
  //    precision as `area-note`; both are the coherence half of `work-unit`
  //    now, because "source changed without its documents and its step is not
  //    a completed unit" is one sentence, not three rules.
  const sourceChanged = changed.filter(
    (file) =>
      GUARDED_ROOTS.some((root) => file.startsWith(root)) &&
      !file.includes('/tests/')
  )
  if (sourceChanged.length > 0) {
    if (touched(slash(MODULE_DIR)).length === 0) {
      add('blocking', 'work-unit',
        `source changed but no module note did — refresh the note for the area you changed, under ${slash(MODULE_DIR)}, in this same commit; code, tests, docs and the step land in ONE work unit`)
    }
    if (touched(`${PATH_DIR}/`).length === 0) {
      add('blocking', 'work-unit',
        'source changed but no coding path did — write this unit\'s step record and refresh the record\'s resume section in this same commit; every executed step updates its own record in the same unit')
    }
    // area precision is advisory: the map is a judgment call
    const areas = new Set(sourceChanged.map(areaOf).filter(Boolean))
    for (const area of areas) {
      const note = areaNote(area)
      if (resolveFile(note) && !changed.includes(note)) {
        add('advisory', 'work-unit',
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
        (file) => !matchesAny(file, declared) && !file.startsWith(`${PATH_DIR}/`) &&
          !isLifecycleRecord(file, match?.front?.id)
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
            ? `${match.file} changed while declaring current_step ${step}, with no \`cairn-unit\` block for that step — add one to that step's record, declaring its ledger ordinal, its type (${WORK_UNIT_TYPES.join(' | ')}) and what verified it`
            : `${match.file} changed with no \`cairn-unit\` block — add one to this unit's step record, declaring its ledger ordinal, its type (${WORK_UNIT_TYPES.join(' | ')}) and what verified it`)
      }
    }
    for (const unit of workUnits) {
      for (const error of workUnitErrors(unit)) {
        add('blocking', 'work-unit', `${match.file}: ${error}`)
      }
    }

    // ADR-017 decision 2. A unit has five movements, and the fourth leaves a
    // record: the fresh context's findings with their dispositions, in the
    // step's own file. The checker reads the section's PRESENCE, never its
    // content — whether the reader was fresh and whether the dispositions are
    // honest is what the owner reads at the candidate, and a rule that scored
    // them would be inventing a judgement.
    //
    // Only the CURRENT unit's step, so a step written before this rule existed
    // is not refused when a later unit is judged. `closure` carries no step
    // file, so it carries no review.
    //
    // The current unit is the newest one kept in a LEDGER, which `pathWorkUnits`
    // has already sorted last. `current_step` used to select it over that same
    // sorted list, so a field left behind could only ever point at an OLDER
    // unit, never a newer one; it stays in the schema, where `work-unit` reads
    // it, and selects nothing here (ADR-026 decision 2).
    //
    // Read in the unit's own ledger — its step record, or the flat record that
    // is one. Never in the `index.md` of a folder record: a block put there
    // would be answered by a section in a file that may be rewritten the next
    // minute, which is the opposite of what the record is for. On the flat
    // shape one section answers for every unit, which the conformance page
    // states as the gap it is.
    if (changed.includes(match.file) && reviewFor && workUnits.length > 0) {
      // Filtered, not just `at(-1)`: a block in the `index.md` of a folder
      // record answers for no unit, and taking the newest unconditionally let
      // such a block stand in front of the step record and skip the rule.
      const current = workUnits.filter((unit) => isUnitLedger(unit.__file, match.file)).at(-1)
      if (current && current.type !== 'closure') {
        const review = reviewFor(current.__file)
        if (!review) {
          add('blocking', 'review',
            `${current.__file} carries no ${review === null ? '`#### Review` section' : 'finding under its `#### Review` section'} — hand this unit's diff to a fresh context, then write it into that step between the self-review and the verification: one line per finding with its disposition, or one sentence saying the reader found nothing`)
        }
      }
    }

    // ADR-004 decision 2. The checkpoint is a claim of the unit, so it is
    // judged where the unit's other claims are. A record that declares
    // `running` and has completed a unit but names no commit cannot be
    // resumed cold from itself, which is the one thing the section is for —
    // fifteen adopter units left it `unpinned` and nobody found out until a
    // path had to be picked up in a new session.
    if (match.front?.status === 'running' && workUnits.length > 0 && checkpointFor && !checkpointFor(match.file)) {
      add('blocking', 'work-unit',
        `${match.file} declares running with ${workUnits.length} completed unit(s) and names no checkpoint — write the last commit the remote holds into the resume section's \`commit :\`, as a full object id`)
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
        `cannot read the commit range for ${match.front.id} against the trunk — fetch the trunk and the complete path history, and rerun the gate`,
        'inconclusive')
    } else if (provisionalInCandidate.length > 0) {
      add('blocking', 'provisional',
        `${provisionalInCandidate.length} commit(s) of this path between the base and the candidate still carry ${PROVISIONAL_TRAILER}: and nothing later finished them (${provisionalInCandidate.slice(0, 3).join(', ')}) — ${rewritingForbidden
          ? 'complete the work each was drafting in a unit of its own, whose commit publishes a step record; nothing is rewritten here, so a draft is superseded by the unit that finishes it and stays in the history as what it was'
          : 'fold each into the work unit it was drafting, retaining its checkpoint first, before proposing a candidate'}`)
    }
  }
  if (onPath && headProvisional) {
    add('advisory', 'provisional',
      `HEAD carries ${PROVISIONAL_TRAILER}: — this commit is durable but is not a checkpoint and must not be named as a resume point; ${rewritingForbidden
        ? 'finish the work it drafts in a unit of its own before proposing a candidate, and it is superseded where it stands'
        : 'fold it into that unit before proposing a candidate'}`)
  }

  // 9. scope is bound by digest, not by a pointer -----------------------
  // Implementation is bound to an object id and cannot quietly become
  // something else. `scope_ref` is a file path and a heading, so the sentence
  // it resolves to can be rewritten after acceptance and every record still
  // reads as valid. The digest gives scope the identity the code already had.
  // The acceptance in force is the opening block, and what it accepted is the
  // text its `scope_ref` resolves to NOW: if the two digests differ, the
  // definition of done moved after it was accepted, on either transport. On
  // `manual-git` the closing record re-states the digest it re-computed at C,
  // and must agree with the opening.
  //
  // ADR-002 decision 1 widened the guard. It used to read a CLOSED status on
  // the path's OWN branch, so a tick inside an integrating commit on the trunk
  // was never judged — which is how two Crumbz paths reached `done` ticked,
  // under green runs — and a tick between two units survived until closure.
  // The seal is now judged wherever the record changes, whatever its status,
  // and still at closure on the branch as before.
  const sealed = paths.filter((path) =>
    stateChanged.includes(path.file) ||
    (onPath && path === match && CLOSED_STATUSES.includes(path.front?.status)))
  for (const path of sealed) {
    const closing = onPath && path === match && CLOSED_STATUSES.includes(path.front?.status)
    const id = String(path.front?.id ?? '')
    const record = closing && !pullRequest ? closureFor?.(id) : null
    const exempt = migrationExempt.has(id)
    const opening = openingRecordFor?.(id)
    const expected = scopeDigestFor?.(opening?.scope_ref)

    if (!opening?.scope_digest) {
      // A record carrying no acceptance yet — a draft, or a registration
      // landing in this same change — is bound to nothing YET. That is only a
      // fault once the path is closing, which is where the rule always asked.
      if (closing) {
        add(exempt ? 'advisory' : 'blocking', 'scope-digest',
          `the opening acceptance for ${id} carries no scope_digest${exempt ? ' (grandfathered: this path predates the rule)' : ' — a scope accepted without a digest is bound to nothing; compute it with \`cairn-check --scope-digest <record>#definition-of-done\` and record it in a fresh acceptance naming the one it supersedes'}`)
      }
    } else if (expected === undefined) {
      add('blocking', 'scope-digest',
        `cannot resolve ${opening.scope_ref ?? 'the scope_ref this acceptance names'} for ${id} — provide the record it points at and rerun the gate; a scope that cannot be read cannot be shown unchanged`,
        'inconclusive')
    } else if (expected === null) {
      add('blocking', 'scope-digest',
        `${opening.scope_ref} names no section for ${id} — point scope_ref at a heading this record has, or restore the section it names; acceptance binds text that exists`)
    } else if (opening.scope_digest !== expected) {
      add('blocking', 'scope-digest',
        `the definition of done moved after acceptance: the opening acceptance says ${opening.scope_digest}, ${path.file} now digests to ${expected} — restore the accepted text or record a scope amendment`)
    } else if (record && record.scope_digest !== opening.scope_digest) {
      add(exempt ? 'advisory' : 'blocking', 'scope-digest',
        `the closing record for ${id} says ${record.scope_digest ?? 'nothing'} where the opening acceptance says ${opening.scope_digest} — restore the accepted text and re-compute the digest at the candidate, or record a scope amendment naming the acceptance it supersedes${exempt ? ' (grandfathered: this path predates the rule)' : ''}`)
    }
  }

  // 9a. two live paths on the same files --------------------------------
  // Advisory, because whether two paths may race on a file is the owner's
  // call and the record is where the call is written. Reported for the pairs
  // THIS run belongs to — the registration of the later path, and every unit
  // of either — rather than for every pair in the corpus on every run.
  const currentId = match?.front?.id == null ? null : String(match.front.id)
  const involved = (id) => id === currentId ||
    paths.some((path) => String(path.front?.id ?? '') === id && stateChanged.includes(path.file))
  for (const overlap of writesOverlaps(paths)) {
    if (!overlap.paths.some(involved)) continue
    add('advisory', 'writes-overlap',
      `${overlap.paths.join(' and ')} are both live and declare surfaces that meet: ${overlap.patterns.join(', ')} — declare depends_on from the path that should wait, and this goes quiet; or accept the race in one sentence of that path's opening acceptance, and dispose of this advisory in the closing review, because nothing reads that sentence and it stays visible until one of the two closes`)
  }

  // 9b. closure moves fields, not files (`closure-surface` in 0.2) --------
  // An administrative closure that changes anything acceptance was measured
  // against is not an acceptance of that candidate, so this is `acceptance`.
  if (onPath && match && CLOSED_STATUSES.includes(match.front.status)) {
    // Against the record AT THE CANDIDATE, not the trunk's copy. Acceptance
    // was measured against C; the trunk holds the record as it was registered,
    // and every field that legitimately moved while the path ran — a widened
    // `writes:`, the current step — read as a closure change (greenfield
    // pilot, 2026-09-01). Without a readable candidate copy, fall back.
    const previous = subjectFrontFor?.(match) ?? previousFronts.get(match.file)
    for (const error of closureFieldErrors(previous, match.front)) {
      add('blocking', 'acceptance', `${match.file}: ${error}`)
    }
  }

  // 10. acceptance drift -------------------------------------------------
  // NOT `trunk === base`. That rule is the obvious one and it livelocks: every
  // landing invalidates every other open acceptance, so where audit plus
  // acceptance outlast the trunk's landing interval nothing ever closes.
  //
  // `T` — the trunk tip the candidate was read against — is DERIVED: the
  // branch merged the trunk in before C, so T is the merge-base of the branch
  // and the trunk, and the delta is what the trunk did since. No record has to
  // name it, on either transport.
  if (onPath && match && match.front.status === 'ready') {
    if (trunkDelta == null) {
      add('blocking', 'acceptance-drift',
        'cannot read the trunk delta since the base the candidate was read against — fetch the complete trunk and rerun the gate',
        'inconclusive')
    } else {
      const drifted = acceptanceDrift(trunkDelta, match.writes ?? [], match.governs ?? [])
      if (drifted.length > 0) {
        add('blocking', 'acceptance-drift',
          `the trunk moved inside this path's declared surfaces since the base the candidate was read against (${drifted.slice(0, 3).join(', ')}) — return to running, merge the trunk in, and repeat review and acceptance`)
      }
    }
  }

  // 11. every advisory gets a disposition (`advisory-disposition` in 0.2) ---
  // The dispositions are part of the acceptance record — the pull request's
  // checklist, or the closing record on a manual-git host — so an acceptance
  // whose dispositions do not match the candidate's advisories is incomplete.
  // On `pull-request` the dispositions are the request's checklist, reviewed
  // by the approver; the checker has nothing to compare them with.
  if (!pullRequest && onPath && match && CLOSED_STATUSES.includes(match.front.status)) {
    const id = String(match.front.id ?? '')
    const record = closureFor?.(id)
    // `A ⊂ C` holds for advisories about the WORK. It does not hold for an
    // advisory the closing record itself causes: `role-collapse` needs a
    // closing record to exist, so it fires at A and never at C, and requiring
    // it in the set attested AT C demanded a false attestation (greenfield
    // pilot, 2026-09-01). It stays visible in every run; it is not disposed.
    const raised = [...new Set(findings
      .filter((f) => f.level === 'advisory' && !CLOSURE_RAISED_ADVISORIES.has(f.rule))
      .map((f) => f.rule))]
    if (record && !migrationExempt.has(id)) {
      for (const error of dispositionErrors(
        record.advisory_disposition, record.advisories_at_candidate, raised
      )) {
        add('blocking', 'acceptance', `${id}: ${error}`)
      }
    } else if (record && typeof record.advisory_disposition === 'string') {
      add('advisory', 'acceptance',
        `${id} records advisory_disposition as prose, which nothing can check — the structured list is required for paths opened after this rule`)
    }
  }

  // 12. collapsed roles are recorded, not forbidden (`role-collapse` in 0.2)
  // A solo developer with agents holds every role, which makes closing
  // acceptance a signature the signer issued to themselves. Forbidding that
  // would exclude the setup most likely to adopt Cairn first. The requirement
  // is that the weakness is legible instead of invisible — an advisory about
  // the acceptance, raised under its name. On `pull-request` the forge shows
  // who approved; a self-approval is its rule to allow or refuse.
  if (!pullRequest && onPath && match && CLOSED_STATUSES.includes(match.front.status)) {
    const id = String(match.front.id ?? '')
    const opening = openingRecordFor?.(id)
    const closing = closureFor?.(id)
    if (opening?.accepted_by && closing?.accepted_by && opening.accepted_by === closing.accepted_by) {
      add('advisory', 'acceptance',
        `${opening.accepted_by} recorded both the opening and the closing acceptance for ${id} — a self-issued signature is permitted and must stay visible; this repository cannot claim an enforcement profile above local on its strength`)
    }
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
      add('blocking', 'route',
        `${match.file} declares route "${route}", outside ${ROUTES.join(' | ')} — declare \`full\` where the work touches the control plane, the decision plane or two implemented areas, and \`lightweight\` otherwise`)
    } else {
      const triggers = fullRouteTriggers(match.writes ?? [], areaOf, (workUnits ?? []).length)
      if (route === 'lightweight' && triggers.length > 0) {
        add('blocking', 'route',
          `${match.file} declares route: lightweight while ${triggers.join('; ')} — escalate to full before the next checkpoint and record the trigger in the ledger`)
      }
      const descent = routeDescent(previousFronts.get(match.file)?.route, route)
      if (descent) add('blocking', 'route', `${match.file}: ${descent}`)
    }
  }

  // 16. redaction names the record that authorised it ----------------------
  // Advisory since Cairn 1.0: a marker naming no record is a defect a reviewer
  // must see, and the ceremony it points at is a procedure the checker cannot
  // verify happened — rotation first, quoting nothing — so it reports rather
  // than blocks.
  if (redactionRecordExists) {
    for (const file of changed) {
      const markers = redactionRecordExists.markersIn?.(file) ?? []
      for (const marker of markers) {
        if (!redactionRecordExists.has(marker)) {
          add('advisory', 'redaction',
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
export function gitOrNull(args) {
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

/** Does this name resolve to a commit? Four readings spelled the same
 *  expression — two here, `resolveBase`'s trunk guard, and the post-mortem. */
export const refExists = (ref) => gitOrNull(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]) != null

function changedFiles(base) {
  // --untracked-files=all, because without it Git lists a NEW DIRECTORY as one
  // entry and none of the files inside it. A born-sliced path record is born
  // in a new folder, so at registration the record itself was invisible to
  // every rule keyed on the changed set: the greenfield pilot (2026-09-01)
  // removed the opening acceptance, ran the gate on the untracked tree and
  // read OK; staging the same tree read FAILED on `opening-ceremony`.
  // -z on BOTH halves: the readable forms C-quote any path with a space or a
  // non-ASCII byte, and a quoted path matches no glob and no guarded root (see
  // porcelainPaths). The --base half is the one CI runs, so it had the same
  // hole. NUL separation also removes the "is a newline in this name?" question
  // rather than answering it.
  const working = porcelainPaths(gitRaw(['status', '--porcelain', '-z', '--untracked-files=all']))
  if (base) {
    const merge = git(['merge-base', base, 'HEAD'])
    const committed = gitRaw(['diff', '--name-only', '-z', `${merge}..HEAD`]).split('\0')
    return [...new Set([...committed, ...working].filter(Boolean))]
  }
  return working
}

/** The state against which this proposed work is judged. A trunk run compares
 * with HEAD; a branch run compares with its trunk merge-base. There is no
 * third form: `--previous` let CI compare each push with the one before it,
 * which is how twenty-six edited records went unjudged. */
function comparisonRef(base) {
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

function pathRegistrationBaseState(trunkRef, branch, paths) {
  if (!isPathBranch(branch)) return null
  const match = paths.find((path) => path.front?.branch === branch)
  const id = match?.front?.id
  if (!match || !id) return null
  if (LEGACY_UNREGISTERED_PATHS.has(id)) return 'grandfathered'
  if (!gitOrNull(['rev-parse', '--verify', trunkRef])) return null

  // `base_commit` is not merely any ancestor: it names the trunk state just
  // before registration, so it must resolve to the parent of the commit that
  // declared this path `running`. Both record shapes are read, by the declared
  // id, for the same reason `pathRegistrationState` reads both — a record's
  // history is not erased by moving the file that carries it.
  // Not only the commit that ADDED the record: it may land as a draft and be
  // activated later (ADR-004 decision 1). And NOT `--first-parent`. On a `pull-request` registration transport the
  // activation reaches the trunk as a merge, and that merge's first parent is
  // the trunk AT THE MERGE — a commit the registrant could not have pinned,
  // because the trunk may move between authoring the record and merging it.
  // The commit that declared `running` is the one whose parent is the base the
  // work forks from, which is what `base_commit` names.
  const { commits, statusAt } = recordHistory(trunkRef, recordShapes(id, match.file))
  const registration = statusCommit(commits, statusAt)
  if (!registration) return null
  const parent = gitOrNull(['rev-parse', `${registration}^`])
  const declared = gitOrNull(['rev-parse', match.front.base_commit])
  if (!parent || !declared) return null
  return parent === declared ? 'match' : { state: 'mismatch', registration, parent }
}

/** Advisories the closure itself raises, which therefore cannot have been
 *  raised at the candidate and are not part of the attested set: an
 *  `acceptance` advisory (a collapsed reviewer, a prose disposition) needs the
 *  closing record to exist, and `remote-checkpoint` at A is about the closure
 *  commit's own push state — the documented order commits A, runs the gate,
 *  then pushes, so it fires at every honest closure (greenfield pilot,
 *  2026-09-01). `writes-overlap` is here for a third reason: its value turns
 *  on OTHER path records' current status, so it can appear between the
 *  candidate and the closure without one line of this path's tree changing,
 *  and the subset check would then report an attestation as incomplete when
 *  nothing about the work moved. All three stay visible; none is disposed. */
export const CLOSURE_RAISED_ADVISORIES = new Set(['acceptance', 'remote-checkpoint', 'writes-overlap'])

/** The records the lifecycle itself requires a path to write outside its
 *  folder — its journal entry. They are outputs of the protocol, not of the work, so a
 *  `writes:` declaration that omits them is not stale. Before this, every
 *  closure raised `scope-drift` on its own audit and closing record, and the
 *  attestation rule then demanded that advisory be attested as raised at the
 *  candidate, where it never was (greenfield pilot, 2026-09-01). */
export function isLifecycleRecord(file, pathId) {
  const id = String(pathId ?? '').toLowerCase()
  if (!id || !file) return false
  const name = String(file).split('/').at(-1)
  return file.startsWith(`${JOURNAL_DIR}/`) && name.includes(id)
}

function closureAllowedFiles(path, record) {
  const id = String(path.front?.id ?? '').toLowerCase()
  const exact = new Set([path.file, record?.__file].filter(Boolean))
  // The live view is DERIVED from the record's status, so a closure that
  // moves the status must regenerate it — `derived-view` blocks otherwise.
  // Admitting it only at `done` made `ready` unreachable: the view was stale
  // and regenerating it was "implementation after acceptance" (greenfield
  // pilot, 2026-09-01). A generated projection is never implementation.
  exact.add(ACTIVE_FILE)
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
  // The candidate is the one the path declares. On manual-git the closing
  // record must name the same id, and `acceptance` says so separately; on
  // pull-request there is no record, and the declaration is all Git holds.
  const subject = path?.front?.subject_commit ?? record?.subject_commit
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

  // The closure commit is prepared in the working tree BEFORE it exists, and
  // the protocol requires the gate to run before that commit. An uncommitted
  // closure therefore counts as the pending administrative commit, and its
  // files are judged. The committed-only diff never judged them: the
  // pre-commit run at A saw zero commits and an empty file list, so it blocked
  // on the count while checking nothing (greenfield pilot, 2026-09-01).
  const pending = porcelainPaths(gitRaw(['status', '--porcelain', '-z', '--untracked-files=all']))
  const committed = Number(gitOrNull(['rev-list', '--count', `${subject}..HEAD`]))
  const count = Number.isFinite(committed) ? committed + (pending.length > 0 ? 1 : 0) : null
  const files = [...new Set([
    ...gitRaw(['diff', '--name-only', '-z', `${subject}..HEAD`]).split('\0'),
    ...pending
  ])].filter(Boolean)
  const allowed = closureAllowedFiles(path, record)
  return {
    subjectIsAncestor: true,
    commitsAfterSubject: count,
    forbiddenFiles: files.filter((file) => !allowed(file))
  }
}

/** Where a record's history can be found: the two shapes a declaration takes,
 *  and — because no rule requires a record's filename to equal the id it
 *  declares — the file it is actually at. A record landed flat and sliced into
 *  a folder has its earlier states under one name and its later ones under the
 *  other, and a checker that reads one of them reads half a history. */
export function recordShapes(id, file = null) {
  return [...new Set([`${PATH_DIR}/${id}.md`, `${PATH_DIR}/${id}/index.md`, ...(file ? [file] : [])])]
}

/**
 * A record's history in a range, oldest first, with a reader for the status it
 * declared at any commit.
 *
 * The caller supplies the names to walk — `recordShapes` gives both of the two
 * a record may sit under, because a record's history is not erased by moving
 * the file that carries it.
 *
 * `--topo-order` because the question is always about ancestry, and `--reverse`
 * alone orders by commit date, which a rebase or a skewed clock can invert.
 */
export function recordHistory(range, shapes, firstParent = false) {
  const raw = gitOrNull([
    'log', '--format=%H', '--topo-order', '--reverse',
    ...(firstParent ? ['--first-parent'] : []), range, '--', ...shapes
  ])
  return {
    commits: raw?.split('\n').filter(Boolean) ?? [],
    statusAt: (commit) => recordFrontAt(commit, shapes)?.status
  }
}

/** A record's own metadata block as of one commit, read from the first of the
 *  shapes that exists there. `null` where the record was not under any of them
 *  yet, which is a fact about that commit and not a failure to read.
 *
 *  Memoised for the life of the process, on the name the caller gave rather
 *  than a resolved id: a range is walked as `c` and `c^`, which are two names
 *  for one commit, and callers pass `HEAD` and `<sha>^` unresolved. Git objects
 *  do not change under a run, so the only cost of the weaker key is a miss. */
const FRONT_AT = new Map()
export function recordFrontAt(commit, shapes) {
  if (!commit) return null
  const key = `${commit}\u0000${shapes.join('\u0000')}`
  if (FRONT_AT.has(key)) return FRONT_AT.get(key)
  let front = null
  for (const shape of shapes) {
    const text = gitOrNull(['show', `${commit}:${shape}`])
    if (text != null) {
      front = metadataOf(readFrontmatter(text)?.data)
      break
    }
  }
  FRONT_AT.set(key, front)
  return front
}

/**
 * ADR-008 decision 2. What this comparison holds about a record's integration:
 * the commit in which the TRUNK came to say `done`, whether that commit is a
 * merge object, and what the record said in any commit immediately behind it —
 * ANY PARENT since ADR-027, not the first, because on `manual-git` the
 * integrating unit IS the merge and the branch's `ready` sits on its second.
 *
 * `--first-parent`, which is the opposite of what `pathRegistrationBaseState`
 * needs and for the opposite reason. There the question is which commit the
 * registrant's `base_commit` should name, so a merge's first parent — the trunk
 * as it stood at the merge — is exactly the wrong answer. Here the question is
 * what the TRUNK said over time, and a walk that follows the branch side
 * answers it about a branch: without the flag, a merge bringing in a branch
 * that had already declared `done` is TREESAME to that branch and never
 * appears, so the arrival looks like an ordinary commit and the merge object
 * carrying it goes unread.
 *
 * That walk and `readyBehind` answer different questions and take different
 * views on purpose: WHICH commit the trunk came to say `done` in is a fact
 * about the trunk's own line, so the walk follows first parents; what the
 * record said behind that commit is a fact about the commits it was made from,
 * so the reading looks at all of them (ADR-027).
 *
 * `commit` is null when the arrival is not committed yet — the writer
 * preparing the integrating commit in the working tree has no commit to judge,
 * and the shape is read by the run that does see it: the integrating request's,
 * which compares the trunk with the commit that would land.
 */
function integrationState(file, ref, id) {
  if (!ref) return null
  const { commits, statusAt } = recordHistory(`${ref}..HEAD`, recordShapes(id, file), true)
  const commit = statusCommit(commits, statusAt, 'done')
  const parents = commit
    ? gitOrNull(['log', '--format=%P', '-1', commit])?.split(/\s+/).filter(Boolean) ?? []
    : []
  return {
    commit,
    merge: parents.length > 1,
    // What the record said in a commit IMMEDIATELY BEHIND this one — not "a
    // `ready` somewhere in the range", which would reopen the edge ADR-001
    // decision 7 closes.
    //
    // ANY parent, and that is a WIDENING with a cost, not a free one: a merge
    // parent can carry an arbitrarily stale record, so a `ready` that the trunk
    // later withdrew (`ready` → `running` is legal) is resurrected by merging a
    // branch still sitting at it, and the arrival goes green. ADR-027 accepts
    // that, names it in its consequences, and `tools/cairn-fixture.test.mjs`
    // pins it as NOT refused so it cannot be mistaken for coverage. Closing it
    // means dating each parent's last state change; the trust boundary
    // (chapter 5) puts a writer doing two deliberate things in sequence outside
    // what these checks are for.
    //
    // Any, not the first (ADR-027). `commit^` was the shorthand for "the commit
    // before", written when every arrival in view was a plain one. On
    // `manual-git` the `--no-ff` merge IS the integrating unit: its first parent
    // is the trunk, where the record still read `running`, and the `ready` the
    // branch declared sits on its SECOND — so the first-parent reading refused
    // every honest closing on that transport, which is what ADR-001 decision
    // 7's own reasoning says cannot happen ("on both transports the
    // administrative commit has already put the path at `ready` on its
    // branch"). An octopus merge has more than two, and any of them may carry
    // it. Where nothing is committed yet, the trunk's current state is that
    // commit's parent-to-be.
    readyBehind: (commit ? parents : ['HEAD']).some((parent) => statusAt(parent) === 'ready')
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
  const working = String(gitRaw(['status', '--porcelain', '-z', '--untracked-files=all'])).split('\0')
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

export function stepRecordOrigin(file) {
  const addedAt = (...flags) => {
    const raw = gitOrNull(['log', ...flags, '--diff-filter=A', '--format=%H', '--name-only', '--', file])
    return raw == null ? null : recordOriginFromFollowLog(raw)
  }
  const followed = addedAt('--follow')
  // `--follow` re-runs rename detection to carry a record across a move, and
  // two step records of the same path are similar enough to be paired by it:
  // one written from the template beside another is reported as that other's
  // rename, and its adding blob is then the SIBLING's, which no valid record
  // can have as a prefix. A relocation removes its source; a file still sitting
  // there was never moved. So where the followed source still exists, the
  // question is the narrower one, and the record is read as what it is — added.
  if (followed && followed.file !== file && existsSync(join(REPO, followed.file))) {
    return addedAt()
  }
  return followed
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
  const working = porcelainMutations(gitRaw(['status', '--porcelain', '-z', '--untracked-files=all']))
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

/** Where the procedures live, as Agent Skills: one folder per skill at the
 *  repository root, installed by the kit beside the tools. A fixed name, like
 *  the specification's, because it is the standard's shape rather than a role
 *  a host binds. */
export const SKILLS_DIR = 'skills'

function markdownCorpus() {
  // The specification lives beside its concept wiki — `spec/` at the root of
  // the protocol's own repository, wherever an adopter binds it — so the wiki's
  // parent joins the two planes, and the skills join them where they exist:
  // a procedure that links a page that moved is as broken as any other link.
  // Files reached twice dedupe by path.
  const roots = [...new Set([DOCUMENTATION_DIR, PROJECT_DIR, dirname(CONCEPTS_DIR), SKILLS_DIR])]
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
  // `CP-<id>/index.md` reported a path registered weeks earlier as never
  // registered at all.
  for (const candidate of [`${PATH_DIR}/${id}.md`, `${PATH_DIR}/${id}/index.md`]) {
    try {
      // stderr piped: the first shape tried is usually absent, and Git's
      // `fatal: path ... does not exist` above an OK verdict teaches people to
      // ignore the output (greenfield pilot, 2026-09-01).
      const text = execFileSync('git', ['show', `${trunkRef}:${candidate}`], {
        cwd: REPO,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
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
/** The path record as it stood at its accepted candidate — the baseline a
 *  closure commit is allowed to differ from. `undefined` when there is no
 *  candidate or its copy cannot be read, so the caller can fall back. */
function subjectFrontOf(path) {
  const subject = path?.front?.subject_commit
  if (!isObjectId(subject)) return undefined
  const text = gitOrNull(['show', `${subject}:${path.file}`])
  if (text == null) return undefined
  return metadataOf(readFrontmatter(text)?.data) ?? undefined
}

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

/** Files the trunk changed since the base the candidate was read against —
 *  the merge-base of this branch and the trunk, because the branch merged the
 *  trunk in before the candidate was produced. `null` when the trunk cannot
 *  be resolved, which is missing evidence rather than no drift. */
function trunkDeltaSinceBase(trunkRef) {
  const base = gitOrNull(['merge-base', trunkRef, 'HEAD'])
  if (!isCommitPin(base)) return null
  const raw = gitOrNull(['diff', '--name-only', '-z', base, trunkRef])
  if (raw == null) return null
  return raw.split('\0').filter(Boolean)
}

/** Redaction records and the markers that must point at one. */
function redactionIndex() {
  const ids = new Set()
  if (existsSync(join(REPO, PROJECT_DIR))) {
    for (const file of walk(PROJECT_DIR, [])) {
      const name = file.split('/').at(-1)
      if (name.includes('redaction') && name.endsWith('.md')) ids.add(name.replace(/\.md$/, ''))
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

/** Is one commit reachable from the other? */
function commitIsAncestor(a, b) {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', a, b], { cwd: REPO, stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/**
 * ADR-004 decision 3. `base_commit..subject_commit` is a PINNED range, and on a
 * host that forbids rewriting the only way to a current base is to merge the
 * trunk in — so every trunk commit merged since registration is inside it,
 * carrying other paths' completed units and other paths' drafts. The
 * merge-base comparison every changed-file rule uses corrects itself as the
 * branch merges; a pinned range cannot, so it is scoped here: `--not <trunk>`
 * leaves this branch's own commits, which on one-writer-per-branch are this
 * path's.
 *
 * What remains is then read chronologically, as repair 006 asks: a draft the
 * path itself finished later is resolved, and is not a reason to refuse a
 * candidate.
 */
function unresolvedProvisionalCommits(path, trunkRef) {
  const from = path?.front?.base_commit
  const to = path?.front?.subject_commit
  if (!isCommitPin(from) || !isCommitPin(to)) return []
  // No trunk, no scoping — and an unscoped range is the reading this rule
  // exists to stop, so the run says it could not decide rather than deciding
  // on the broader question.
  if (!trunkRef || !refExists(trunkRef)) return null
  const range = [`${from}..${to}`, '--not', trunkRef]
  const raw = gitOrNull(['log', '--format=%H', `--grep=^${PROVISIONAL_TRAILER}:`, ...range])
  if (raw == null) return null
  const provisional = raw.split('\n').map((line) => line.trim()).filter(Boolean)
  if (provisional.length === 0) return []
  const completions = unitCompletionCommits(range, path)
  if (completions == null) return null
  return unresolvedProvisional(provisional, completions, commitIsAncestor)
}

/**
 * The commits in this range that publish a completed unit of THIS path: a
 * `cairn-unit` block, valid by the same reading the `work-unit` rule uses, for
 * a step the record did not carry at that commit's parent.
 *
 * Scoped to this path's own record — its folder, or the flat file that is its
 * own ledger. The adopter's first repair counted a step record under any
 * `CP-*` folder, so another path's units, merged in from the trunk, cleared
 * this path's draft; the reviewer who found it named two such records by id.
 *
 * A merge commit lists no files here, which is the right answer twice over:
 * merging the trunk in finishes nothing of this path's own.
 */
function unitCompletionCommits(range, path) {
  const dir = path.file.endsWith('/index.md') ? path.file.slice(0, -'/index.md'.length) : null
  const raw = gitOrNull(['log', '--format=%H', '--name-only', ...range, '--', dir ?? path.file])
  // Unreadable is not "nothing finished it": that answer refuses the
  // candidate, which is a verdict this rule has no evidence for.
  if (raw == null) return null
  // A unit is published by a step record, or by the FLAT record that is its own
  // ledger — never by the plan, and never by the `index.md` of a folder
  // record, which may be edited freely and would let a block added there and
  // deleted afterwards resolve a draft. Same argument as `supersessionClaim`.
  const ledger = (file) => isUnitLedger(file, path.file)
  return commitsWithFiles(raw)
    .filter(({ commit, files }) => files.some((file) => ledger(file) && publishesAUnit(commit, file)))
    .map(({ commit }) => commit)
}

/** `--format=%H --name-only` emits a hash, a blank line, then that commit's
 *  files. Kept pure so the plumbing format has a test rather than being
 *  trusted by inspection, as `recordOriginFromFollowLog` is for its own. */
export function commitsWithFiles(raw) {
  const out = []
  for (const line of String(raw ?? '').split('\n').map((text) => text.trim())) {
    if (isObjectId(line)) out.push({ commit: line, files: [] })
    else if (line && out.length > 0) out.at(-1).files.push(line)
  }
  return out
}

/** The steps a record declares as completed units, at one ref. */
function completedStepsAt(ref, file) {
  const text = gitOrNull(['show', `${ref}:${file}`])
  if (text == null) return []
  return parseWorkUnits(text)
    .filter((unit) => workUnitErrors(unit).length === 0)
    .map((unit) => unit.step)
}

/** Did this commit publish a step the record did not carry before it? */
function publishesAUnit(commit, file) {
  const before = completedStepsAt(`${commit}^`, file)
  return completedStepsAt(commit, file).some((step) => !before.includes(step))
}

/** REPAIR 005. The supersessions this path's own records declare, each carried
 *  with the blobs the record it names actually has: the blob that added it,
 *  followed through relocations, and the blob it carries now. Whether the claim
 *  binds is decided in `evaluate`, where it can be tested without a
 *  repository. */
function declaredSupersessions(workUnits) {
  const out = []
  for (const unit of workUnits ?? []) {
    const declared = supersessionClaim(unit)
    if (!declared) continue
    const origin = stepRecordOrigin(declared.file)
    out.push({
      file: declared.file,
      declaredIn: unit.__file,
      declared,
      actual: {
        before: origin ? gitOrNull(['rev-parse', `${origin.commit}:${origin.file}`]) : null,
        after: existsSync(join(REPO, declared.file)) ? gitOrNull(['hash-object', '--', declared.file]) : null
      }
    })
  }
  return out
}

function headCarriesProvisionalTrailer() {
  const raw = gitOrNull(['log', '-1', '--format=%B', 'HEAD'])
  return raw != null && new RegExp(`^${PROVISIONAL_TRAILER}:`, 'm').test(raw)
}

function pathRemoteCheckpoint(branch) {
  if (!isPathBranch(branch)) return null

  // ADR-004 decision 5. `@{upstream}` is HEAD's upstream, and a detached
  // request-head checkout — which is what the installed workflow produces on
  // every `pull_request` event, on purpose — has none. Reading it alone
  // reported "no upstream" on the one run that is the merge gate. Resolve the
  // branch's own ref instead: the local one, else the remote-tracking one,
  // else HEAD.
  const resolved = resolveBranchRef({
    branch,
    detached: gitOrNull(['symbolic-ref', '--short', '-q', 'HEAD']) == null,
    refExists
  })
  // THE BRANCH'S upstream, not HEAD's. `@{upstream}` alone is HEAD's, so
  // standing on the trunk while naming a path branch compared that branch's
  // tip with `origin/<trunk>` — which reported a published commit as rewritten
  // on a repository where nothing was. A detached checkout has no configured
  // upstream at all, and there the remote-tracking ref answers the same
  // question.
  const tracking = `${REMOTE}/${branch}`
  const upstream = gitOrNull(['rev-parse', '--abbrev-ref', '--symbolic-full-name', `${branch}@{upstream}`]) ??
    (refExists(tracking) ? tracking : null)
  if (!upstream) return { state: 'missing', upstream: null, branchRef: resolved }

  // Three shapes, and only the third is a rewrite.
  //
  //   HEAD reachable from upstream  → published (or simply behind)
  //   upstream reachable from HEAD  → ahead, the ordinary unpushed commit
  //   neither                       → DIVERGED
  //
  // With one writer per path branch, divergence means what was published is no
  // longer in this branch's history: a rebase, an amend, a soft-reset fold, or
  // a force-push. That is exactly what ADR-022 forbids, and unlike the policy
  // field itself it is a fact a local checkout can read.
  const head = resolved.ref
  if (commitIsAncestor(head, upstream)) return { state: 'published', upstream, diverged: false, branchRef: resolved }
  return { state: 'unpushed', upstream, diverged: !commitIsAncestor(upstream, head), branchRef: resolved }
}

/**
 * Does the journal record this path's integration?
 *
 * `AGENTS.md` requires one journal file per entry, written at merge time. Until
 * now NO RULE ASKED. `same-work-unit` fires when *source* changes without a
 * module note or ledger, and a closing unit changes neither — so nothing asked.
 * Observed rather than hypothesised: a path was closed, audited, set to `done`
 * and proposed for merge with no entry, and every gate reported `OK`. A human
 * reviewer caught it.
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
        // made about the same move, in a quieter voice.
        addedOn:
          gitOrNull([
            'log', '--follow', '--diff-filter=A', '--format=%ad', '--date=short', '-1', '--', file
          ]) || null
      }
    })
}

/** The closing record for a path — `closing-<C>.md` in its folder — with its
 *  metadata, its file, and whether it is a completed review. The one naming
 *  the current candidate when a subject is given, else the latest by name.
 *  `null` when the path has none, or is not a folder record. */
export function closingRecordIn(files, pathDir, subjectCommit = null) {
  const names = files.filter((name) => CLOSING_RECORD.test(name)).sort()
  const chosen = subjectCommit
    ? names.find((name) => CLOSING_RECORD.exec(name)[1] === subjectCommit)
    : names.at(-1)
  return chosen ? `${pathDir}/${chosen}` : null
}

function closingRecord(pathId, subjectCommit = null, paths = loadPaths()) {
  const path = paths.find((entry) => entry.front?.id === pathId)
  if (!path?.file.endsWith('/index.md')) return null
  const dir = path.file.slice(0, -'/index.md'.length)
  if (!existsSync(join(REPO, dir))) return null
  const file = closingRecordIn(readdirSync(join(REPO, dir)), dir, subjectCommit)
  if (!file) return null
  const text = readFileSync(join(REPO, file), 'utf8')
  return { ...(metadataOf(readFrontmatter(text)?.data) ?? {}), __file: file, __fill: fillErrors(text) }
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
 * completed zero, which silently disarms `work-unit`. The record is the FOLDER;
 * the ledger is every step file in it.
 *
 * Sorted by ordinal, because directory order is not chronology.
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
  const units = files.flatMap((rel) =>
    parseWorkUnits(readFileSync(join(REPO, rel), 'utf8')).map((unit) => ({ ...unit, __file: rel })))
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
        parseError: parsed?.error ?? null
      }
    })
}

/** The opening acceptance a path carries in its own record, by id. */
function openingRecord(pathId, paths) {
  const path = paths.find((entry) => entry.front?.id === pathId)
  if (!path) return null
  return openingFromRecord(readFileSync(join(REPO, path.file), 'utf8'))
}

/** Schema + link integrity over the whole corpus, not just the diff: these
 *  are cheap and catching them late is the expensive part. */
/** Whether the generated live view equals what its generator produces now. */
function activeViewCurrent() {
  try {
    execFileSync('node', [join(REPO, 'tools/cairn-active.mjs'), '--check'], {
      cwd: REPO,
      stdio: 'pipe'
    })
    return true
  } catch {
    return false
  }
}

function corpusFindings(previousRef = null, changed = [], viewCurrent = null) {
  const findings = []
  const corpus = loadPaths()

  // Concept wiki: an orphan blocks, growth is only reported. See orphanConcepts.
  const conceptDir = join(REPO, CONCEPTS_DIR)
  if (existsSync(conceptDir)) {
    // Read RECURSIVELY: an adopter's root is three folders (ADR-011 d2), and
    // `readdirSync` returns the folder rather than the note inside it, so a
    // flat read polices a wiki nobody keeps at the root any more.
    const conceptFiles = walk(CONCEPTS_DIR)
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.slice(CONCEPTS_DIR.length + 1))
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
      for (const target of conceptLinkTargets(text)) linked.add(target)
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
        ? (gitOrNull(['ls-tree', '-r', '--name-only', previousRef, `${CONCEPTS_DIR}/`]) ?? '')
            .split('\n').filter(Boolean).map((f) => f.slice(CONCEPTS_DIR.length + 1))
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
  // the rule ran there — one path's unit was green locally and red in CI, on
  // one tree, under one command. A predicate that branches on where it runs cannot be
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
  if (!(viewCurrent ?? activeViewCurrent())) {
    findings.push({
      level: 'blocking',
      rule: 'derived-view',
      message: `${ACTIVE_FILE}: the derived running-paths view is stale — run \`npm run cairn-active\``
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

  for (const error of [...duplicatePathIdentityFindings(corpus), ...dependencyFindings(corpus)]) {
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

  // Two exemptions, each for a reason that would otherwise make this check
  // wrong rather than strict. Restored here after Cairn 1.1 lost them in
  // e18bbe4 (CP-CAIRN-006 S02), where the journal became a folder and took the
  // expression that named both with it:
  //   docs/fixtures/  — sample documents PORTRAYING another vault; their links
  //                     point into that imaginary vault by design
  //   log.md          — the frozen 0.2 journal; it says "stays exactly as
  //                     written" in its own header, and a gate must not demand
  //                     an edit to history
  const linkExempt = (file) =>
    file.startsWith(`${DOCUMENTATION_DIR}/fixtures/`) || file === `${PROJECT_DIR}/log.md`
  for (const doc of markdownCorpus().filter((file) => !linkExempt(file))) {
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

async function main() {
  const argv = process.argv.slice(2)
  if (argv.includes('--scope-digest')) {
    // The digest a record carries is verified by `scopeDigestOf`, so it is
    // produced by `scopeDigestOf`. The operations page used to hand the human
    // a `sed | sha256sum` pipeline that included the next heading and omitted
    // the algorithm prefix — a digest the gate rejected at closure as "the
    // definition of done moved" (greenfield pilot, 2026-09-01).
    const ref = argv[argv.indexOf('--scope-digest') + 1]
    const digest = scopeDigestOf(ref)
    if (digest === undefined) {
      console.error(`cairn-check: cannot read ${ref ?? 'the scope_ref'} — pass <file>#<heading-anchor>`)
      process.exit(1)
    }
    if (digest === null) {
      console.error(`cairn-check: ${ref} names no such section`)
      process.exit(1)
    }
    console.log(digest)
    process.exit(0)
  }
  const baseFlag = argv.includes('--base') ? argv[argv.indexOf('--base') + 1] : null
  const asJson = argv.includes('--json')
  const flag = argv.includes('--branch') ? argv[argv.indexOf('--branch') + 1] : null

  const { branch, source: branchSource } = resolveBranch({
    flag,
    env: process.env,
    root: REPO,
    symbolicRef: gitOrNull(['symbolic-ref', '--short', 'HEAD']),
    abbrevRef: git(['rev-parse', '--abbrev-ref', 'HEAD'])
  })
  let { base, source: baseSource } = resolveBase({
    flag: baseFlag,
    branch,
    refExists
  })
  // What the run was ASKED for, so an unusable base can name itself.
  const baseRequested = baseFlag ?? null
  // A base can RESOLVE and still not be comparable: two histories with no
  // common ancestor make `git merge-base` exit non-zero, and `changedFiles`
  // calls the throwing form. `refExists` answers "is this a commit", never
  // "can it be compared with mine". This runs BEFORE `changedFiles`, because
  // the whole point is that nothing downstream may throw on it.
  if (base && gitOrNull(['merge-base', base, 'HEAD']) === null) {
    base = null
    baseSource = 'unresolvable'
  }
  const changed = changedFiles(base)
  // Resolved, and already containing this commit: the comparison is empty.
  // IDENTITY is not the test — a base that is a DESCENDANT of HEAD gives the
  // same empty diff, and a force-push that rewinds the trunk sends exactly
  // that as the commit it replaced. The test is whether the merge-base is HEAD.
  const baseIsHead = Boolean(base) &&
    gitOrNull(['merge-base', base, 'HEAD']) === gitOrNull(['rev-parse', 'HEAD^{commit}'])
  const viewCurrent = activeViewCurrent()
  const paths = loadPaths()
  const pathForBranch = paths.find((path) => path.front?.branch === branch) ?? null
  const workUnits = pathForBranch ? pathWorkUnits(pathForBranch.file) : null
  const trunkRef = base ?? TRUNK_BRANCH
  const previousRef = comparisonRef(base)
  const stateChanged = previousRef ? changedFiles(previousRef) : changed
  // Record immutability is judged against the SAME comparison every other
  // changed-file rule uses: the merge-base with the trunk on a path branch,
  // HEAD on the trunk. The 0.2 checker compared event records with HEAD only,
  // so a committed edit to an immutable record was invisible to every push
  // run and surfaced only when a pull request compared the branch with the
  // trunk. Born-sliced step records do not depend on this
  // ref at all: their adding blob is stable and appendOnlyStepRecordMutations
  // follows it directly.
  const findings = [
    ...corpusFindings(previousRef, changed, viewCurrent),
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
      checkpointFor: (file) => checkpointCommit(readFileSync(join(REPO, file), 'utf8')),
      closureFor: (id, subject) => closingRecord(id, subject, paths),
      closureStateFor: pathClosureState,
      previousPaths: previousPathStates(paths, previousRef),
      immutableMutations: immutableRecordMutations(previousRef, changed),
      relocations: verbatimRelocations(previousRef),
      supersessions: declaredSupersessions(workUnits),
      integrationStateFor: (file, id) => integrationState(file, previousRef, id),
      branchSource,
      baseSource,
      baseRequested,
      baseIsHead,
      workUnits,
      reviewFor: (file) => reviewSection(readFileSync(join(REPO, file), 'utf8')),
      // Judged against the SAME comparison every other changed-file rule uses,
      // so the local default and the CI command see one set of added records.
      addedRecords: addedRecordDates(changed, previousRef),
      scopeDigestFor: scopeDigestOf,
      subjectFrontFor: subjectFrontOf,
      derivedViewCurrent: viewCurrent,
      openingRecordFor: (id) => openingRecord(id, paths),
      previousFronts: previousFrontStates(paths, previousRef),
      journalEntries: loadJournal(),
      trunkDelta: pathForBranch?.front?.status === 'ready' ? trunkDeltaSinceBase(trunkRef) : [],
      redactionRecordExists: redactionIndex(),
      provisionalInCandidate: pathForBranch
        ? unresolvedProvisionalCommits(pathForBranch, trunkRef)
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
  const profile = { enforcementProfile: ENFORCEMENT_PROFILE, transports: { ...CAIRN_CONFIG.transport } }
  if (asJson) {
    console.log(JSON.stringify(
      { binding, profile, branch, base, baseSource, changed: changed.length, findings }, null, 2))
  } else {
    console.log(
      `cairn-check — profile ${ENFORCEMENT_PROFILE}, branch ${branch}, base ${baseLabel}, ${changed.length} changed file(s)`
    )
    console.log(
      `binding — schema ${binding.version}; trunk ${binding.trunk} via ${binding.remote}; ` +
      `metadata ${binding.metadataNamespace}; new-path route ${binding.defaultRoute}; docs ${binding.documentationRoot}; ` +
      `project ${binding.projectRoot}; source ${binding.sourceRoots.join(', ')}; ` +
      `path history ${PATH_HISTORY_POLICY}${REWRITING_FORBIDDEN ? ' (no rewriting)' : ' (rewriting allowed; retention is the host\'s to check, not this checker\'s)'}`
    )
    console.log(profileLine(profile))
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
  // A rejection here would exit 0 with no verdict printed, which is the one
  // failure mode a gate must not have.
  main().catch((error) => {
    console.error(`cairn-check: ${error?.stack ?? error}`)
    process.exit(1)
  })
}
