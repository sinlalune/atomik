#!/usr/bin/env node
/**
 * cairn-postmortem — the mechanical half of a post-mortem, as facts.
 *
 * Every note under `feedbacks/` had two halves. One was judgement. The other
 * was Git and the forge, read by hand five times in three days: which commit
 * registered a path and what its parent was, whether the `ready` commit has
 * the shape a closure may take, whether the definition of done still
 * digests to its acceptance, whether every step still carries the blob that
 * added it, how many red runs a branch produced, how long a request stayed
 * open. That half is this command (ADR-014, decision 1).
 *
 * It prints WHAT A QUESTION TO THE OWNER IS BUILT FROM, and never the question
 * (ADR-021, decision 3). A reading that recommends is not a reading, and the
 * owner's options are written by whoever read the incident.
 *
 * Nothing here is recomputed. `cairn-check` exports its readings as pure
 * functions and this tool imports every one of them, and since 2026-09-14 the
 * Git plumbing AROUND them too — a record's two shapes, its history in a
 * range, the metadata it declared at a commit, whether a ref exists, the blob
 * that added a step record (ADR-026; ADR-014 decision 1). What it still asks
 * Git itself is the plainly local half: where this checkout stands, a commit's
 * parent, and the files under a path's `steps/` folder.
 *
 *   node tools/cairn-postmortem.mjs                 # the path of this branch, else every path
 *   node tools/cairn-postmortem.mjs --path CP-X-001
 *   node tools/cairn-postmortem.mjs --branch path/cp-x-001
 *
 * The forge half is read when `GITHUB_TOKEN` or `GH_TOKEN` is set and the
 * remote is a GitHub repository, and says why it was not read otherwise. No
 * reading of this tool reaches an exit code: an incident is not a verdict. A
 * malformed invocation does.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  PATH_DIR,
  REMOTE,
  TRUNK_BASE_CANDIDATES,
  closureFieldErrors,
  gitOrNull,
  isAppendOnlyStepRecord,
  openingFromRecord,
  preservesAppendOnlyRecord,
  readFrontmatter,
  recordFrontAt,
  recordHistory,
  recordShapes,
  refExists,
  resolveBranchRef,
  resolveScopeSection,
  scopeDigest,
  statusCommit,
  stepRecordOrigin
} from './cairn-check.mjs'
import { REPO, metadataOf } from './cairn-config.mjs'

/** The closing line. It says where the judgement is, and makes none. */
export const NO_JUDGEMENT =
  'These are the facts the repository and the forge gave. What follows from them, ' +
  'and the ways to go on, are written by whoever reads this.'

/** What an administrative commit of a BRANCH may declare. `done` belongs to
 *  the trunk — the integrating unit writes it, and ADR-008 decision 2 gives
 *  its shape to the checker — so a branch declaring it is the incident a
 *  post-mortem is opened for, and a reading that watched only for `ready`
 *  would answer *not written yet* about a branch that wrote the wrong one. */
const ADMINISTRATIVE_STATUSES = ['ready', 'done']

/* ------------------------------------------------------------------ *
 * the readings — pure, one line each
 * ------------------------------------------------------------------ */

/** ADR-004 decision 1: `base_commit` names the trunk state just before
 *  registration, so the commit it belongs to is the one that declared the
 *  record `running`, and the object to compare with is that commit's parent. */
export function registrationReading({ registration, parent, declaredBase }) {
  if (!registration) return 'no trunk commit declares this record running'
  if (!parent) {
    return `${registration} declared this record running and has no parent, so base_commit ${declaredBase ?? 'names nothing'} names no trunk state before it`
  }
  const same = parent === declaredBase
  return `${registration} declared this record running; its parent ${parent} and base_commit ${declaredBase ?? 'nothing'} are ${same ? 'the same object' : 'another object each'}`
}

/** ADR-008 decision 2: one administrative commit, moving only the fields a
 *  closure may move. Both halves are facts a reader wants at an incident, and
 *  a path that declared a closure twice has two — `moves` carries the commit
 *  and the record on either side of each, so none of them is read for the
 *  others and a commit whose sides cannot both be read silences no other.
 *
 *  `closureFieldErrors` answers `[]` for a comparison it could not make, which
 *  is why an unreadable side is said rather than rendered as the affirmative. */
export function closureReading({ moves = [], reachable = true }) {
  if (!reachable) return 'no ref of this branch is in this checkout, so its commits were not read'
  if (moves.length === 0) return `no commit of this branch declares ${ADMINISTRATIVE_STATUSES.join(' or ')} — the administrative commit is not written yet`
  const how = moves.length === 1 ? 'one commit of this branch declares' : `${moves.length} commits of this branch declare`
  const statuses = [...new Set(moves.map(({ current }) => current?.status).filter(Boolean))]
  const head = `${how} ${statuses.join(' and ') || 'a closure'}: ${moves.map(({ commit }) => commit).join(', ')}`

  const read = moves.filter(({ previous, current }) => previous && current)
  const unread = moves.filter(({ previous, current }) => !previous || !current)
  const fields = [...new Set(read
    .flatMap(({ previous, current }) => closureFieldErrors(previous, current))
    .map((error) => /`([^`]+)`/.exec(error)?.[1])
    .filter(Boolean))]
  const parts = []
  if (read.length) {
    parts.push(fields.length === 0
      ? 'moving only the fields a closure may move'
      : `also moving ${fields.map((field) => `\`${field}\``).join(', ')}, which the acceptance was measured against`)
  }
  if (unread.length) {
    parts.push(`with what ${unread.map(({ commit }) => commit).join(', ')} moved unread: this checkout cannot read the record on one side of it`)
  }
  return `${head} — ${parts.join('; ')}`
}

/** The digest of the definition of done as it stands, against the acceptance
 *  in force — the last block of the record's own `## Opening acceptance`. */
export function scopeReading({ recomputed, accepted }) {
  if (!recomputed) return 'the record has no section under the heading a definition of done is read from'
  if (!accepted) return `the definition of done digests to ${recomputed}; the acceptance in force carries no digest to compare it with`
  return recomputed === accepted
    ? `the definition of done digests to ${recomputed}, the same digest the acceptance in force names`
    : `the definition of done digests to ${recomputed}; the acceptance in force names ${accepted}, another digest`
}

/** A step record is append-only from the blob that added it. `before` is null
 *  where this checkout cannot read that blob, which is a third answer and not
 *  a rewrite. */
export function stepsReading(steps = []) {
  if (steps.length === 0) return 'no step record of this path is committed'
  const unreadable = steps.filter((step) => step.before == null)
  const rewritten = steps.filter((step) => step.before != null &&
    !preservesAppendOnlyRecord(step.before, step.after, Boolean(step.relocated)))
  const kept = steps.length - unreadable.length - rewritten.length
  const notes = [
    rewritten.length ? `${rewritten.map((step) => step.file).join(', ')} no longer carries it as a prefix` : null,
    unreadable.length ? `${unreadable.map((step) => step.file).join(', ')} has an adding blob this checkout cannot read` : null
  ].filter(Boolean)
  return `${kept} of ${steps.length} preserve the blob that added them${notes.length ? `; ${notes.join('; ')}` : ''}`
}

export function redRunsReading(answer) {
  if (!answer.read) return `not read — ${answer.why}`
  if (answer.red === 0) return 'no red run on this branch'
  return `${answer.red} red run${answer.red === 1 ? '' : 's'} on this branch`
}

export function requestsReading(answer) {
  if (!answer.read) return `not read — ${answer.why}`
  if (answer.requests.length === 0) return 'no request from this branch'
  const each = answer.requests
    .map(({ number, created_at: opened, merged_at: merged }) => {
      if (!merged) return `#${number} open since ${opened}`
      return `#${number} opened ${opened}, merged ${duration(opened, merged) ?? `at ${merged}`}`
    })
    .join('; ')
  return answer.more ? `${each} — and the forge had a full page, so this list is its first one` : each
}

/** Elapsed time in the units an incident is argued in, or null when either
 *  end is unreadable — a made-up duration is worse than a missing one. */
export function duration(from, to) {
  const start = Date.parse(from)
  const end = Date.parse(to)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  const minutes = Math.floor((end - start) / 60000)
  if (minutes < 1) return 'under a minute'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h${minutes % 60 ? ` ${minutes % 60}m` : ''}`
  return `${Math.floor(hours / 24)}d${hours % 24 ? ` ${hours % 24}h` : ''}`
}

/** One block per path: a heading, the readings aligned, and the closing line.
 *  Deterministic, so two people reading one incident paste one text. */
export function renderReadings({ pathId, branch, readings }) {
  const width = Math.max(...readings.map(([label]) => label.length))
  const rows = readings.map(([label, fact]) => `  ${label.padEnd(width)}  ${fact}`)
  return [`cairn-postmortem — ${pathId} on ${branch}`, '', ...rows, '', NO_JUDGEMENT, ''].join('\n')
}

/* ------------------------------------------------------------------ *
 * the forge — `request` is a parameter, so the suite proves the shape
 * without a network
 * ------------------------------------------------------------------ */

/** The owner and repository of a GitHub remote, or `null` for anything else —
 *  a self-hosted forge, and the local bare repositories the fixtures push to.
 *  "Not read" is an honest line; a wrong reading is not. */
export function githubSlug(url) {
  const match = /^(?:(?:https?|ssh|git)(?::\/\/)(?:[^@/]+@)?|(?:[^@/\s]+@))github\.com[:/]([^/\s]+)\/([^/\s]+?)(?:\.git)?$/i
    .exec(String(url ?? '').trim())
  return match ? { owner: match[1], repo: match[2] } : null
}

/** One GitHub read. An error is an ANSWER, never an exception: a reading must
 *  not be able to change an exit code, and an offline laptop must not wait on
 *  a socket. */
export async function githubRequest(url, { token, timeoutMs = 3000, doFetch = fetch } = {}) {
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), timeoutMs)
  try {
    const response = await doFetch(url, {
      signal: abort.signal,
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'user-agent': 'cairn-postmortem',
        'x-github-api-version': '2022-11-28'
      }
    })
    if (!response.ok) return { error: `HTTP ${response.status}` }
    return { value: await response.json() }
  } catch (error) {
    return { error: error?.name === 'AbortError' ? `no answer in ${timeoutMs}ms` : String(error?.message ?? error) }
  } finally {
    clearTimeout(timer)
  }
}

const NO_TOKEN = 'no token; set GITHUB_TOKEN or GH_TOKEN to read this branch\'s runs and requests'
const NOT_GITHUB = 'the configured remote is not a GitHub repository'
const NO_BRANCH = 'the record declares no branch, so the forge has nothing to be asked about'
/** The forge's own maximum. */
const PAGE = 100

export async function readRedRuns({ token, slug, branch, request }) {
  if (!branch) return { read: false, why: NO_BRANCH }
  if (!token) return { read: false, why: NO_TOKEN }
  if (!slug) return { read: false, why: NOT_GITHUB }
  // `per_page=1` because the answer wanted is `total_count`: one page of runs
  // is a payload the reading never opens.
  const answer = await request(`https://api.github.com/repos/${slug.owner}/${slug.repo}/actions/runs?branch=${encodeURIComponent(branch)}&status=failure&per_page=1`)
  if (answer.error) return { read: false, why: `the forge answered ${answer.error}` }
  return { read: true, red: answer.value?.total_count ?? 0 }
}

export async function readRequests({ token, slug, branch, request }) {
  if (!branch) return { read: false, why: NO_BRANCH }
  if (!token) return { read: false, why: NO_TOKEN }
  if (!slug) return { read: false, why: NOT_GITHUB }
  const head = encodeURIComponent(`${slug.owner}:${branch}`)
  const answer = await request(`https://api.github.com/repos/${slug.owner}/${slug.repo}/pulls?state=all&head=${head}&per_page=${PAGE}`)
  if (answer.error) return { read: false, why: `the forge answered ${answer.error}` }
  const requests = (Array.isArray(answer.value) ? answer.value : [])
    .map(({ number, created_at, merged_at }) => ({ number, created_at, merged_at: merged_at ?? null }))
  // A full page is a page with more behind it. Raising the size moves that
  // line; saying so is what keeps a truncated list from reading as the list.
  return { read: true, requests, more: requests.length === PAGE }
}

/* ------------------------------------------------------------------ *
 * the repository — every read is an answer, never an exception
 * ------------------------------------------------------------------ */



/** A record with no branch is a fact, not a blank. `null` reaches the readings
 *  that need one, which say so rather than asking the forge about a sentence. */
const branchOf = (record) => record.front.branch ?? null

/** Every path declaration, in either shape, in id order. */
function pathRecords() {
  const dir = join(REPO, PATH_DIR)
  if (!existsSync(dir)) return []
  const records = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.name.startsWith('CP-')) continue
    const rel = entry.isDirectory() ? `${entry.name}/index.md` : entry.name
    if (!rel.endsWith('.md') || !existsSync(join(dir, rel))) continue
    const text = readFileSync(join(dir, rel), 'utf8')
    const front = metadataOf(readFrontmatter(text)?.data)
    if (!front?.id) continue
    records.push({
      front,
      text,
      file: `${PATH_DIR}/${rel}`,
      folder: entry.isDirectory() ? `${PATH_DIR}/${entry.name}` : null
    })
  }
  return records.sort((a, b) => String(a.front.id).localeCompare(String(b.front.id)))
}

/** The committed step records of a path, each with the blob that added it.
 *  A record Git has no commit for is not yet a record with an adding blob, and
 *  is left out rather than reported as unreadable. */
function stepsOf(record) {
  if (!record.folder) return []
  const dir = join(REPO, record.folder, 'steps')
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    // A folder under `steps/` matches the step-record shape as readily as a
    // file does, and reading one as text throws where a reading must answer.
    .filter((entry) => entry.isFile())
    .map((entry) => `${record.folder}/steps/${entry.name}`)
    .filter(isAppendOnlyStepRecord)
    .sort()
    .map((file) => ({ file, origin: stepRecordOrigin(file) }))
    // HISTORY, not the index — and asked only of a record whose adding commit
    // was not found. `ls-files` answers about what is STAGED, so the step
    // record of the very unit that added this tool read as a record whose
    // adding blob could not be found. A record Git has no commit for is not
    // yet a record with an adding blob; one Git has and cannot resolve is.
    .filter(({ file, origin }) => origin || Boolean(gitOrNull(['log', '--format=%H', '-1', '--', file])))
    .map(({ file, origin }) => ({
      file,
      before: origin ? gitOrNull(['show', `${origin.commit}:${origin.file}`]) : null,
      after: readFileSync(join(REPO, file), 'utf8'),
      relocated: Boolean(origin && origin.file !== file)
    }))
}

async function readingsFor(record, forge, { detached, head }) {
  const shapes = recordShapes(record.front.id, record.file)
  const branch = branchOf(record)

  const trunk = TRUNK_BASE_CANDIDATES.find(refExists)
  const trunkHistory = trunk ? recordHistory(trunk, shapes) : { commits: [], statusAt: () => undefined }
  const registration = statusCommit(trunkHistory.commits, trunkHistory.statusAt)
  const declared = record.front.base_commit

  // HEAD answers FOR A BRANCH only where HEAD is that branch: the detached
  // request head CI judges, which the run names with `--branch`. Anywhere else
  // `resolveBranchRef` falls back to HEAD, and reading another path's closure
  // off this checkout's own tip would be a reading about the wrong branch.
  const resolved = branch ? resolveBranchRef({ branch, remote: REMOTE, detached, refExists }) : null
  const reachable = Boolean(resolved) &&
    (resolved.source !== 'head' || (detached && branch === head))
  const range = declared && reachable ? `${declared}..${resolved.ref}` : null
  const commits = range ? recordHistory(range, shapes).commits : []
  // The parent is RESOLVED, so the record at it is the same cache entry as the
  // record at the previous commit of the range and is read once for both. The
  // filter keeps the commits where the record ENTERED a closed status, not
  // every commit that reads closed afterwards: the second set grows with the
  // branch and says nothing about the closure's shape.
  const moves = commits
    .map((commit) => ({
      commit,
      previous: recordFrontAt(gitOrNull(['rev-parse', `${commit}^`]), shapes),
      current: recordFrontAt(commit, shapes)
    }))
    .filter(({ previous, current }) =>
      ADMINISTRATIVE_STATUSES.includes(current?.status) && !ADMINISTRATIVE_STATUSES.includes(previous?.status))

  return [
    ['registration', registrationReading({
      registration,
      parent: registration ? gitOrNull(['rev-parse', `${registration}^`]) : null,
      declaredBase: declared ? gitOrNull(['rev-parse', declared]) ?? declared : null
    })],
    ['administrative commit', closureReading({ moves, reachable })],
    ['definition of done', scopeReading({
      recomputed: scopeDigest(resolveScopeSection(record.text, '#definition-of-done')),
      accepted: openingFromRecord(record.text)?.scope_digest ?? null
    })],
    ['step records', stepsReading(stepsOf(record))],
    ['red runs', redRunsReading(await readRedRuns({ ...forge, branch }))],
    ['requests', requestsReading(await readRequests({ ...forge, branch }))]
  ]
}

const OPTIONS = ['--path', '--branch']

async function main() {
  const argv = process.argv
  const flag = (name) => {
    const at = argv.indexOf(name)
    if (at === -1) return null
    const value = argv[at + 1]
    // A flag with nothing after it used to read as a flag that was not given,
    // so a typed `--path` swept every record instead of refusing.
    if (!value || value.startsWith('--')) {
      console.error(`cairn-postmortem — ${name} needs a value`)
      process.exit(2)
    }
    return value
  }
  const unknown = argv.slice(2).filter((word) => word.startsWith('--') && !OPTIONS.includes(word))
  if (unknown.length) {
    console.error(`cairn-postmortem — ${unknown.join(', ')} is not an option of this command; it takes ${OPTIONS.join(' and ')}`)
    process.exit(2)
  }
  const id = flag('--path')
  const branch = flag('--branch') ?? gitOrNull(['rev-parse', '--abbrev-ref', 'HEAD'])
  const records = pathRecords()
  const named = id
    ? records.filter((record) => record.front.id === id)
    : records.filter((record) => record.front.branch === branch)

  if (id && named.length === 0) {
    console.log(`cairn-postmortem — no path record declares ${id}`)
    return
  }
  // Off a path branch there is no one incident to read, so the reading is the
  // repository's: every declaration, in id order.
  const wanted = named.length ? named : records
  if (wanted.length === 0) {
    console.log('cairn-postmortem — no path record to read')
    return
  }

  // `||`, as the checker reads the same two variables: a workflow maps an
  // unset secret in as the EMPTY STRING, which `??` would take as the answer
  // and never look at the second name.
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || ''
  const forge = {
    token,
    slug: githubSlug(gitOrNull(['remote', 'get-url', REMOTE])),
    request: (url) => githubRequest(url, { token })
  }
  const where = { detached: gitOrNull(['symbolic-ref', '--quiet', 'HEAD']) == null, head: branch }
  for (const record of wanted) {
    console.log(renderReadings({
      pathId: record.front.id,
      branch: branchOf(record) ?? 'no branch declared',
      readings: await readingsFor(record, forge, where)
    }))
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main()
}
