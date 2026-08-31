/**
 * Tests for the Cairn validator — run with Node's own test runner:
 *
 *   node --test tools/
 *
 * Deliberately not vitest: the validator must stay runnable with plain
 * `node` in any pipeline, so its tests carry no dependency either.
 *
 * The point of these cases is that a validator which only ever passes is
 * worthless. Every blocking rule is exercised in the state that should
 * FAIL it, and in the neighbouring state that should not.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import {
  adrFrontmatterErrors,
  approxTokens,
  closingAcceptanceErrors,
  closingRecordFromSessions,
  areaOf,
  ceremonyFromSessions,
  duplicatePathIdentityFindings,
  openingFromSessions,
  evaluate,
  globToRegExp,
  isCommitPin,
  isImmutableRecord,
  isPathBranch,
  LEDGER_TOKEN_BUDGET,
  matchesAny,
  nameStatusMutations,
  parseWrites,
  parseWorkUnits,
  pathFrontmatterErrors,
  PATH_STALE_DAYS,
  porcelainPaths,
  porcelainMutations,
  readFrontmatter,
  registrationMatches,
  resolveBranch,
  staleRunningPaths,
  stripCode,
  transitionErrors,
  retentionDue,
  unretainedCheckpoints,
  workUnitErrors,
  resolveScopeSection,
  scopeDigest,
  closureFieldErrors,
  acceptanceDrift,
  dispositionErrors,
  migrationDebt,
  V02_MIGRATION_PATHS,
  openingRecordFromSessions,
  CLOSURE_MUTABLE_FIELDS,
  closureMutableFields,
  isObjectId,
  DISPOSITIONS,
  fullRouteTriggers,
  foundationSurfaceViolations,
  routeDescent,
  briefErrors,
  redactionMarkers,
  ROUTES,
  BRIEF_FIELDS,
  BRIEF_SECTIONS,
  CHECKPOINT_REF_PREFIX,
  PROVISIONAL_TRAILER,
  WORK_UNIT_TYPES
} from './cairn-check.mjs'

const A_PATH = {
  file: 'atomik-project/coding-paths/CP-MVP-010.md',
  front: {
    id: 'CP-MVP-010',
    route: 'lightweight',
    status: 'running',
    base_commit: '70f7e27',
    branch: 'path/cp-mvp-010'
  },
  writes: ['apps/desktop/electron-main/graph-index.ts', 'docs/modules/atomik-desktop-graph.md']
}

const CANDIDATE = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

const acceptedRecord = (pathId = A_PATH.front.id, subject = CANDIDATE) => ({
  path: pathId,
  ceremony: 'closing',
  subject_commit: subject,
  accepted_by: 'reviewer@example.test',
  accepted_at: '2026-08-25T12:00:00Z',
  decision: 'accepted',
  scope_ref: `project/coding-paths/${pathId}.md#definition-of-done`,
  advisory_disposition: 'all fixed or explicitly deferred in this record',
  __file: `atomik-project/sessions/2026-08-25-${pathId.toLowerCase()}-closing.md`
})

/** `git status --porcelain -z` output: NUL-terminated records, never quoted. */
const z = (...records) => records.map((r) => `${r}\0`).join('')

const run = (changed, branch, paths = [A_PATH], extra = {}) =>
  evaluate({
    changed,
    branch,
    paths,
    resolveFile: () => true,
    trunkContained: true,
    registrationState: 'registered',
    registrationBaseState: 'match',
    closureFor: (id) => acceptedRecord(id),
    closureStateFor: (path) => ({
      subjectIsAncestor: true,
      commitsAfterSubject: path.front.status === 'done' ? 2 : 1,
      forbiddenFiles: []
    }),
    openingFor: () => true,
    previousPaths: new Map(paths.map((path) => [path.file, path.front])),
    immutableMutations: [],
    ...extra
  })

const rules = (findings, level) =>
  findings.filter((f) => f.level === level).map((f) => f.rule)

test('a path branch with no coding path declaring it is blocked', () => {
  const found = run(['README.md'], 'path/orphan', [])
  assert.ok(rules(found, 'blocking').includes('branch-path'))
})

test('a declared path that is neither running nor closing as done is blocked', () => {
  const stale = { ...A_PATH, front: { ...A_PATH.front, status: 'draft' } }
  const found = run(['README.md'], 'path/cp-mvp-010', [stale])
  assert.ok(rules(found, 'blocking').includes('branch-path'))
})

test('a path branch may declare ready only for an exactly accepted candidate', () => {
  const ready = {
    ...A_PATH,
    front: { ...A_PATH.front, status: 'ready', subject_commit: CANDIDATE }
  }
  const closing = [ready.file, 'atomik-project/sessions/cp-mvp-010-closing.md']

  const recorded = run(closing, 'path/cp-mvp-010', [ready], {
    previousPaths: new Map([[ready.file, A_PATH.front]])
  })
  assert.ok(!rules(recorded, 'blocking').includes('branch-path'))
  assert.ok(!rules(recorded, 'blocking').includes('acceptance'))

  const missing = run(closing, 'path/cp-mvp-010', [ready], {
    previousPaths: new Map([[ready.file, A_PATH.front]]),
    closureFor: () => null
  })
  assert.ok(rules(missing, 'blocking').includes('acceptance'))
})

test('a running path with no base commit is blocked', () => {
  const partial = { ...A_PATH, front: { id: 'X', status: 'running', branch: 'path/cp-mvp-010' } }
  const found = run(['README.md'], 'path/cp-mvp-010', [partial])
  assert.ok(
    found.some((f) => f.rule === 'branch-path' && f.message.includes('atomik.base_commit'))
  )
})

/**
 * A path file added only on its own branch cannot contribute to the trunk's
 * global ACTIVE.md projection. Registration is therefore a trunk fact, not a
 * promise in the branch: new paths are blocked until the same accepted
 * identity/status/branch/base tuple exists on the trunk. Paths that were
 * already running when this rule landed are finite, visible migration cases.
 */
test('an unregistered path branch is blocked; a grandfathered one is advisory', () => {
  const missing = run(['README.md'], 'path/cp-mvp-010', [A_PATH], {
    registrationState: 'missing'
  })
  assert.ok(rules(missing, 'blocking').includes('registration'))

  const grandfathered = run(['README.md'], 'path/cp-mvp-010', [A_PATH], {
    registrationState: 'grandfathered'
  })
  assert.ok(!rules(grandfathered, 'blocking').includes('registration'))
  assert.ok(rules(grandfathered, 'advisory').includes('registration'))

  const registered = run(['README.md'], 'path/cp-mvp-010', [A_PATH])
  assert.ok(!rules(registered, 'blocking').includes('registration'))
})

test('unavailable registration evidence is inconclusive and still exits through blocking', () => {
  const found = run(['README.md'], 'path/cp-mvp-010', [A_PATH], {
    registrationState: null,
    registrationBaseState: null
  })
  for (const rule of ['registration', 'registration-base']) {
    assert.ok(found.some((finding) =>
      finding.rule === rule && finding.level === 'blocking' &&
      finding.outcome === 'inconclusive'))
  }
})

test('a base_commit different from the registration parent is blocked', () => {
  const found = run(['README.md'], 'path/cp-mvp-010', [A_PATH], {
    registrationBaseState: 'mismatch'
  })
  assert.ok(rules(found, 'blocking').includes('registration-base'))
})

test('a trunk registration must match the path identity, running state and branch', () => {
  const registered = [
    '---',
    'title: Registered path',
    'atomik:',
    '  id: CP-MVP-010',
    '  status: running',
    '  branch: path/cp-mvp-010',
    '  base_commit: abc1234',
    '---',
    ''
  ].join('\n')

  assert.ok(registrationMatches(registered, 'CP-MVP-010', 'path/cp-mvp-010', 'abc1234'))
  assert.ok(!registrationMatches(registered, 'CP-MVP-011', 'path/cp-mvp-010', 'abc1234'))
  assert.ok(!registrationMatches(registered, 'CP-MVP-010', 'path/cp-other', 'abc1234'))
  assert.ok(!registrationMatches(registered, 'CP-MVP-010', 'path/cp-mvp-010', 'def5678'))
  assert.ok(!registrationMatches(registered.replace('status: running', 'status: draft'), 'CP-MVP-010', 'path/cp-mvp-010', 'abc1234'))
  assert.ok(!registrationMatches('not frontmatter', 'CP-MVP-010', 'path/cp-mvp-010', 'abc1234'))
})

test('an unpublished path HEAD is advisory; a published HEAD and trunk are quiet', () => {
  const missing = run(['README.md'], 'path/cp-mvp-010', [A_PATH], {
    remoteCheckpoint: { state: 'missing', upstream: null }
  })
  assert.ok(rules(missing, 'advisory').includes('remote-checkpoint'))
  assert.ok(!rules(missing, 'blocking').includes('remote-checkpoint'))

  const unpushed = run(['README.md'], 'path/cp-mvp-010', [A_PATH], {
    remoteCheckpoint: { state: 'unpushed', upstream: 'origin/path/cp-mvp-010' }
  })
  assert.ok(rules(unpushed, 'advisory').includes('remote-checkpoint'))
  assert.ok(unpushed.some(
    (finding) => finding.rule === 'remote-checkpoint' && finding.message.includes('origin/path/cp-mvp-010')
  ))

  const published = run(['README.md'], 'path/cp-mvp-010', [A_PATH], {
    remoteCheckpoint: { state: 'published', upstream: 'origin/path/cp-mvp-010' }
  })
  assert.ok(!rules(published, 'advisory').includes('remote-checkpoint'))

  const trunk = run(['README.md'], 'master', [A_PATH], {
    remoteCheckpoint: { state: 'unpushed', upstream: 'origin/master' }
  })
  assert.ok(!rules(trunk, 'advisory').includes('remote-checkpoint'))
})

test('base commits are real-looking Git pins, not YAML null strings', () => {
  assert.ok(isCommitPin('70f7e27'))
  assert.ok(isCommitPin('70f7e27aabbccddeeff001122334455667788990'))
  assert.ok(!isCommitPin('null'))
  assert.ok(!isCommitPin('HEAD'))
  assert.ok(!isCommitPin(undefined))
})

/**
 * THE REBASE GATE. Every path merges itself, so nothing else stops a stale
 * branch from landing on a trunk it never saw. Unknown (null) must read as
 * "cannot tell", never as a pass — a fresh or shallow checkout must fetch the
 * evidence before this critical gate can certify a candidate.
 */
test('a path branch behind the trunk is blocked; up to date is not', () => {
  const stale = run(['README.md'], 'path/cp-mvp-010', [A_PATH], { trunkContained: false })
  assert.ok(rules(stale, 'blocking').includes('rebase'))

  const fresh = run(['README.md'], 'path/cp-mvp-010', [A_PATH], { trunkContained: true })
  assert.ok(!rules(fresh, 'blocking').includes('rebase'))

  const unknown = run(['README.md'], 'path/cp-mvp-010', [A_PATH], { trunkContained: null })
  assert.ok(rules(unknown, 'blocking').includes('rebase'))
  assert.ok(unknown.some((finding) => finding.rule === 'rebase' &&
    finding.outcome === 'inconclusive'))
})

test('the trunk itself is never asked to rebase onto itself', () => {
  const found = run(['README.md'], 'master', [A_PATH], { trunkContained: false })
  assert.ok(!rules(found, 'blocking').includes('rebase'))
})

/**
 * `done` is an integration fact on the trunk and is backed by the exact closing
 * acceptance, not by a path-id-only ceremony marker.
 */
test('a path marked done without exact candidate acceptance is blocked', () => {
  const done = {
    ...A_PATH,
    front: {
      ...A_PATH.front,
      status: 'done',
      subject_commit: CANDIDATE,
      resolution: 'completed'
    }
  }
  const closing = [done.file, 'atomik-project/sessions/x.md']

  const missing = run(closing, 'master', [done], {
    previousPaths: new Map([[done.file, A_PATH.front]]),
    closureFor: () => null
  })
  assert.ok(rules(missing, 'blocking').includes('acceptance'))

  const recorded = run(closing, 'master', [done], {
    previousPaths: new Map([[done.file, A_PATH.front]])
  })
  assert.ok(!rules(recorded, 'blocking').includes('acceptance'))
})

test('paths that closed before the rule existed are left alone', () => {
  // The full branch diff may include a historical migration of this file. The
  // exact proposed work unit does not, so the new schema must not punish it.
  const legacy = { ...A_PATH, front: { ...A_PATH.front, status: 'done' } }
  const found = run([legacy.file], 'master', [legacy], {
    stateChanged: [],
    closureFor: () => null
  })
  assert.ok(!rules(found, 'blocking').includes('acceptance'))
  assert.ok(!rules(found, 'blocking').includes('transition'))
})

test('the journal warns but never blocks', () => {
  const found = run(['atomik-project/log.md'], 'path/cp-mvp-010')
  assert.deepEqual(rules(found, 'blocking'), [])
  assert.ok(rules(found, 'advisory').includes('single-truth'))
})

/**
 * Statements of record are ADVISORY, not blocking. Four real merges were
 * run before this was downgraded: two journal appends CONFLICT visibly,
 * adjacent table rows CONFLICT visibly, distant table rows merge CLEANLY
 * AND CORRECTLY, and only "parent closed by one path while another adds
 * itself" merges into a contradiction. Git handles three of the four, so
 * the rule cannot claim merge safety as its reason — and a rule enforced
 * for a reason that does not survive testing gets ignored.
 */
test('a path touching a generated or shared file is warned, not blocked', () => {
  for (const file of [
    'atomik-project/coding-paths/ACTIVE.md',
    'atomik-project/coding-paths/index.md',
    'docs/modules/atomik-desktop.md'
  ]) {
    const found = run([file], 'path/cp-mvp-010')
    assert.ok(rules(found, 'advisory').includes('single-truth'), `${file} should warn`)
    assert.deepEqual(rules(found, 'blocking'), [], `${file} must not block`)
  }
})

test('on the trunk those same files draw no finding', () => {
  const found = run(
    ['atomik-project/log.md', 'atomik-project/coding-paths/ACTIVE.md'],
    'master'
  )
  assert.deepEqual(rules(found, 'blocking'), [])
})

test('source without a module note is blocked, with it is not', () => {
  const withoutDocs = run(
    ['apps/desktop/electron-main/graph-index.ts', 'atomik-project/coding-paths/CP-MVP-010.md'],
    'path/cp-mvp-010'
  )
  assert.ok(rules(withoutDocs, 'blocking').includes('same-work-unit'))

  const complete = run(
    [
      'apps/desktop/electron-main/graph-index.ts',
      'docs/modules/atomik-desktop-graph.md',
      'atomik-project/coding-paths/CP-MVP-010.md'
    ],
    'path/cp-mvp-010'
  )
  assert.deepEqual(rules(complete, 'blocking'), [])
})

test('same-work-unit guards apps, packages, and shared source roots', () => {
  for (const source of ['packages/protocol/index.ts', 'shared/schema.ts']) {
    const missing = run([source, A_PATH.file], 'path/cp-mvp-010')
    assert.ok(rules(missing, 'blocking').includes('same-work-unit'), source)
    const complete = run(
      [source, 'docs/modules/atomik-desktop-shell.md', A_PATH.file],
      'path/cp-mvp-010'
    )
    assert.ok(!rules(complete, 'blocking').includes('same-work-unit'), source)
  }
})

test('source without a coding path update is blocked', () => {
  const found = run(
    ['apps/desktop/electron-main/graph-index.ts', 'docs/modules/atomik-desktop-graph.md'],
    'path/cp-mvp-010'
  )
  assert.ok(
    found.some((f) => f.rule === 'same-work-unit' && f.message.includes('Work Ledger'))
  )
})

test('a docs-only change is never asked for a module note', () => {
  const found = run(['docs/bedrock/35_35-coding-path-execution-state.md', 'docs/adr/ADR-012-x.md'], 'path/cp-mvp-010')
  assert.deepEqual(rules(found, 'blocking'), [])
})

test('scope drift is advisory, never blocking', () => {
  const found = run(
    [
      'apps/desktop/electron-main/graph-index.ts',
      'apps/desktop/renderer/src/editor/EditorPane.tsx',
      'docs/modules/atomik-desktop-graph.md',
      'atomik-project/coding-paths/CP-MVP-010.md'
    ],
    'path/cp-mvp-010'
  )
  assert.deepEqual(rules(found, 'blocking'), [])
  assert.ok(rules(found, 'advisory').includes('scope-drift'))
})

test('bedrock changed without an ADR is advisory', () => {
  const found = run(['docs/bedrock/22_22-agent-handoff.md'], 'master')
  assert.ok(rules(found, 'advisory').includes('decision-drift'))
  assert.deepEqual(rules(found, 'blocking'), [])
})

test('branch names', () => {
  assert.ok(isPathBranch('path/cp-mvp-010'))
  assert.ok(isPathBranch('path/cp-settings'))
  assert.ok(!isPathBranch('master'))
  assert.ok(!isPathBranch('lane/retrieval'))
  assert.ok(!isPathBranch('feature/x'))
  assert.ok(!isPathBranch('path/'))
  assert.ok(!isPathBranch(undefined))
})

test('globs: ** crosses separators, * does not', () => {
  assert.ok(globToRegExp('apps/**').test('apps/desktop/a/b.ts'))
  assert.ok(globToRegExp('apps/**/*.ts').test('apps/desktop/a/b.ts'))
  assert.ok(globToRegExp('tests/*.ts').test('tests/a.ts'))
  assert.ok(!globToRegExp('tests/*.ts').test('tests/deep/a.ts'))
  assert.ok(matchesAny('docs/x.md', ['apps/**', 'docs/*.md']))
})

test('code fences and inline spans are stripped before links are judged', () => {
  const text = [
    'A real [link](./real.md).',
    '',
    '```text',
    'a vault picture: [extracted](./extracted.md)',
    '```',
    '',
    'inline `[nope](./nope.md)` stays out.'
  ].join('\n')
  const stripped = stripCode(text)
  assert.ok(stripped.includes('./real.md'))
  assert.ok(!stripped.includes('./extracted.md'))
  assert.ok(!stripped.includes('./nope.md'))
})

test('frontmatter: yaml nesting, json bedrock blocks, and garbage', () => {
  const yaml = readFrontmatter('---\ntype: X\natomik:\n  id: CP-1\n  status: running\n---\n# t\n')
  assert.equal(yaml.data.atomik.id, 'CP-1')
  assert.equal(yaml.data.atomik.status, 'running')

  const json = readFrontmatter('---\n{ "id": "35-x", "title": "T" }\n---\n')
  assert.equal(json.data.id, '35-x')

  assert.equal(readFrontmatter('no frontmatter here'), null)
  assert.equal(readFrontmatter('---\n{ broken json\n---\n').error, 'unparseable JSON frontmatter')
})

test('running path schema requires the fields the global projection consumes', () => {
  assert.deepEqual(pathFrontmatterErrors(A_PATH.front), [])
  assert.ok(pathFrontmatterErrors({ id: 'CP-X', status: 'running' }).some(
    (error) => error.includes('atomik.branch')
  ))
  assert.ok(pathFrontmatterErrors({ id: 'CP-X', status: 'running', branch: 'path/cp-x' }).some(
    (error) => error.includes('atomik.base_commit')
  ))
  assert.ok(pathFrontmatterErrors({
    id: 'CP-X', status: 'running', branch: 'path/cp-x', base_commit: 'null'
  }).some((error) => error.includes('Git hash')))
})

test('ready and blocked preserve branch traceability; ready also pins its candidate', () => {
  const blocked = { ...A_PATH.front, status: 'blocked' }
  assert.deepEqual(pathFrontmatterErrors(blocked), [])
  assert.ok(pathFrontmatterErrors({ id: 'CP-X', status: 'blocked' })
    .some((error) => error.includes('atomik.branch')))

  const ready = { ...A_PATH.front, status: 'ready', subject_commit: CANDIDATE }
  assert.deepEqual(pathFrontmatterErrors(ready), [])
  assert.ok(pathFrontmatterErrors({ ...ready, subject_commit: 'aaaaaaa' })
    .some((error) => error.includes('full object id')),
    'a prefix is never a candidate identity')
  assert.deepEqual(
    pathFrontmatterErrors({ ...ready, subject_commit: 'b'.repeat(64) }),
    [],
    'a SHA-256 repository conforms to the specification and must conform to the checker'
  )
})

test('path identity, filename, and branch use one reconstructable convention', () => {
  assert.deepEqual(pathFrontmatterErrors(
    A_PATH.front,
    'atomik-project/coding-paths/CP-MVP-010.md'
  ), [])
  assert.ok(pathFrontmatterErrors(
    { ...A_PATH.front, branch: 'path/something-else' },
    'atomik-project/coding-paths/CP-MVP-010.md'
  ).some((error) => error.includes('must equal path/cp-mvp-010')))
  assert.ok(pathFrontmatterErrors(
    A_PATH.front,
    'atomik-project/coding-paths/CP-WRONG.md'
  ).some((error) => error.includes('does not match the file name')))
})

test('area mapping routes source to its module note', () => {
  assert.equal(areaOf('apps/desktop/shared/graph-core.ts'), 'graph')
  assert.equal(areaOf('apps/desktop/renderer/src/editor/EditorPane.tsx'), 'editor')
  assert.equal(areaOf('apps/desktop/electron-main/pdf-import.ts'), 'sources')
  assert.equal(areaOf('apps/desktop/electron-main/ai-settings.ts'), 'ai')
  assert.equal(areaOf('apps/desktop/electron-main/vault.ts'), 'vault')
  assert.equal(areaOf('apps/desktop/shared/retrieval-core.ts'), 'vault')
  assert.equal(areaOf('apps/desktop/electron-main/retrieval.ts'), 'vault')
  assert.equal(areaOf('apps/desktop/electron-main/lane.ts'), 'shell')
  assert.equal(areaOf('docs/index.md'), null)
})

test('porcelain paths survive an unstaged first record', () => {
  // The bug this covers: trimming the whole stdout before slicing eats the
  // leading space of ` M path`, and with it the path's first character —
  // every rule downstream then reads `tomik-project/…` (CP-MVP-010 S01).
  const raw = z(
    ' M atomik-project/coding-paths/CP-MVP-010.md',
    '?? docs/adr/ADR-013.md',
    'A  apps/desktop/shared/retrieval-core.ts'
  )
  assert.deepEqual(porcelainPaths(raw), [
    'atomik-project/coding-paths/CP-MVP-010.md',
    'docs/adr/ADR-013.md',
    'apps/desktop/shared/retrieval-core.ts'
  ])
})

test('porcelain paths: renames report the new path, noise is dropped', () => {
  // -z puts the NEW path in the record and the ORIGINAL in the next field.
  // The original is not a changed file: reporting it would name a path that
  // no longer exists.
  assert.deepEqual(porcelainPaths(z('R  docs/new.md', 'docs/old.md')), ['docs/new.md'])
  assert.deepEqual(
    porcelainPaths(z('C  docs/copy.md', 'docs/src.md', ' M docs/after.md')),
    ['docs/copy.md', 'docs/after.md']
  )
  assert.deepEqual(porcelainPaths(''), [])
  assert.deepEqual(porcelainPaths(z('', '')), [])
})

test('append-only mutation parsing permits additions and reports existing changes', () => {
  assert.deepEqual(porcelainMutations(z(
    '?? atomik-project/audits/new.md',
    'A  atomik-project/sessions/new.md',
    ' M atomik-project/audits/existing.md',
    'D  atomik-project/log/existing.md',
    'R  atomik-project/audits/renamed.md',
    'atomik-project/audits/old.md'
  )), [
    'atomik-project/audits/existing.md',
    'atomik-project/log/existing.md',
    'atomik-project/audits/renamed.md',
    'atomik-project/audits/old.md'
  ])
})

test('committed mutation parsing keeps both sides of renames and treats copies as additions', () => {
  assert.deepEqual(nameStatusMutations([
    'M', 'atomik-project/audits/existing.md',
    'A', 'atomik-project/audits/new.md',
    'R100', 'atomik-project/audits/old.md', 'elsewhere/renamed.md',
    'C100', 'atomik-project/audits/source.md', 'atomik-project/audits/copy.md',
    ''
  ].join('\0')), [
    'atomik-project/audits/existing.md',
    'atomik-project/audits/old.md',
    'elsewhere/renamed.md'
  ])
})

test('append-only namespaces exclude their mutable index and log views', () => {
  assert.equal(isImmutableRecord('atomik-project/sessions/2026-08-25-x.md'), true)
  assert.equal(isImmutableRecord('atomik-project/audits/cp-x-aaaa.md'), true)
  assert.equal(isImmutableRecord('atomik-project/sessions/index.md'), false)
  assert.equal(isImmutableRecord('atomik-project/audits/log.md'), false)
  assert.equal(isImmutableRecord('atomik-project/log/index.md'), false)
  assert.equal(isImmutableRecord('atomik-project/log.md'), true)
})

test('a path with a space is read whole, not quoted (CP-OPS-002 S06d)', () => {
  // The readable porcelain C-QUOTES such a path — `"briefs/feedback on  MVP-001.md"`,
  // quotes included — and that string matches no writes: glob, no guarded root
  // and no area pattern. A source file whose name contains a space was counted
  // as changed and then invisible to every rule that asks WHICH file it is,
  // `same-work-unit` included. -z is why this now holds.
  const spaced = 'atomik-project/briefs/feedback on  MVP-001.md'
  assert.deepEqual(porcelainPaths(z(`D  ${spaced}`)), [spaced])
  assert.deepEqual(porcelainPaths(z('A  apps/desktop/electron-main/two words.ts')), [
    'apps/desktop/electron-main/two words.ts'
  ])
  // and the guarded-root test that the quoted form defeated now passes
  assert.ok(porcelainPaths(z('A  apps/desktop/electron-main/two words.ts'))[0]
    .startsWith('apps/'))
})


/* ------------------------------------------------------------------ *
 * F1 — a check that cannot name the branch must not report OK
 *
 * `git rev-parse --abbrev-ref HEAD` answers "HEAD" in a detached checkout,
 * and actions/checkout detaches on every pull_request. Six path rules went
 * silent in exactly the run meant to enforce them, and the validator printed
 * "OK — protocol satisfied" over a stale, unregistered branch carrying 96
 * changed source files (audit 2026-08-24, F1).
 * ------------------------------------------------------------------ */

test('branch resolution prefers the host over the checkout', () => {
  // The CI case that was broken: detached, but GITHUB_HEAD_REF knows the name.
  assert.deepEqual(
    resolveBranch({ env: { GITHUB_HEAD_REF: 'path/cp-mvp-011' }, symbolicRef: null, abbrevRef: 'HEAD' }),
    { branch: 'path/cp-mvp-011', source: 'github-head-ref' }
  )
  // An explicit flag outranks everything, so the rules stay testable.
  assert.equal(
    resolveBranch({ flag: 'path/x', env: { GITHUB_HEAD_REF: 'path/y' } }).branch,
    'path/x'
  )
  // A push event names a real branch.
  assert.deepEqual(
    resolveBranch({ env: { GITHUB_REF_NAME: 'master' }, symbolicRef: null, abbrevRef: 'HEAD' }),
    { branch: 'master', source: 'github-ref-name' }
  )
  // "<n>/merge" is the merge preview, not a branch — never trust it.
  assert.equal(
    resolveBranch({ env: { GITHUB_REF_NAME: '42/merge' }, symbolicRef: null, abbrevRef: 'HEAD' }).source,
    'detached'
  )
  // Ordinary local run.
  assert.deepEqual(
    resolveBranch({ env: {}, symbolicRef: 'master', abbrevRef: 'master' }),
    { branch: 'master', source: 'symbolic-ref' }
  )
})

test('a detached checkout changing source is BLOCKED, never silently OK', () => {
  const found = run(['apps/desktop/electron-main/index.ts', 'docs/modules/atomik-desktop-shell.md',
    'atomik-project/coding-paths/CP-MVP-010.md'], 'HEAD', [A_PATH], { branchSource: 'detached' })
  assert.ok(rules(found, 'blocking').includes('branch-identity'),
    'source changed while every path rule was skipped — that must fail, not pass')
})

test('a detached checkout touching no guarded root is advisory only', () => {
  // A docs-only or tag build must not be punished for how it was checked out:
  // a false blocking verdict costs more than a missed one.
  const found = run(['docs/index.md'], 'HEAD', [A_PATH], { branchSource: 'detached' })
  assert.deepEqual(rules(found, 'blocking'), [])
  assert.ok(rules(found, 'advisory').includes('branch-identity'))
})

test('a normally resolved branch raises no identity finding', () => {
  const found = run(['docs/index.md'], 'path/cp-mvp-010')
  assert.ok(![...rules(found, 'blocking'), ...rules(found, 'advisory')].includes('branch-identity'))
})

/* ------------------------------------------------------------------ *
 * F2 — the closing ceremony must be declared, not inferred from a filename
 *
 * paths.md requires an OPENING check note before a path may branch, so the
 * old filename substring always matched and the rule could not fail for any
 * compliant path (audit 2026-08-24, F2).
 * ------------------------------------------------------------------ */

test('an opening check is not a closing ceremony', () => {
  const opening = [{ path: 'CP-MVP-010', ceremony: 'opening' }]
  assert.equal(ceremonyFromSessions(opening, 'CP-MVP-010'), false)

  const closing = [...opening, { path: 'CP-MVP-010', ceremony: 'closing' }]
  assert.equal(ceremonyFromSessions(closing, 'CP-MVP-010'), true)
})

test('a ceremony note belongs to exactly one path', () => {
  const notes = [{ path: 'CP-MVP-0010', ceremony: 'closing' }]
  // substring matching made CP-MVP-001 pass on CP-MVP-0010's note
  assert.equal(ceremonyFromSessions(notes, 'CP-MVP-001'), false)
  // an undeclared note proves nothing
  assert.equal(ceremonyFromSessions([{ path: 'CP-MVP-001' }], 'CP-MVP-001'), false)
  assert.equal(ceremonyFromSessions([], 'CP-MVP-001'), false)
})

test('closing lookup selects the acceptance for the current candidate', () => {
  const old = acceptedRecord(A_PATH.front.id, 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb')
  const current = acceptedRecord(A_PATH.front.id, CANDIDATE)
  assert.equal(
    closingRecordFromSessions([old, current], A_PATH.front.id, CANDIDATE),
    current
  )
  assert.equal(
    closingRecordFromSessions([old], A_PATH.front.id, CANDIDATE),
    null
  )
})

test('closing acceptance names the exact candidate, actor, time, scope, and advisory disposition', () => {
  assert.deepEqual(closingAcceptanceErrors(acceptedRecord(), A_PATH.front.id), [])
  const incomplete = {
    path: A_PATH.front.id,
    ceremony: 'closing',
    subject_commit: 'aaaaaaa',
    decision: 'accepted'
  }
  const errors = closingAcceptanceErrors(incomplete, A_PATH.front.id)
  for (const field of [
    'subject_commit', 'accepted_by', 'accepted_at', 'scope_ref', 'advisory_disposition'
  ]) assert.ok(errors.some((error) => error.includes(field)), field)
})

test('implementation changes after exact acceptance invalidate ready', () => {
  const ready = {
    ...A_PATH,
    front: { ...A_PATH.front, status: 'ready', subject_commit: CANDIDATE }
  }
  const found = run([ready.file], 'path/cp-mvp-010', [ready], {
    previousPaths: new Map([[ready.file, A_PATH.front]]),
    closureStateFor: () => ({
      subjectIsAncestor: true,
      commitsAfterSubject: 1,
      forbiddenFiles: ['apps/desktop/electron-main/index.ts']
    })
  })
  assert.ok(found.some((finding) =>
    finding.rule === 'acceptance' && finding.message.includes('implementation changed')))
})

test('an existing durable record cannot be rewritten, but a new record may be added', () => {
  const existing = run(
    ['atomik-project/audits/existing.md'],
    'path/cp-mvp-010',
    [A_PATH],
    { immutableMutations: ['atomik-project/audits/existing.md'] }
  )
  assert.ok(rules(existing, 'blocking').includes('record-integrity'))

  const added = run(
    ['atomik-project/audits/new.md'],
    'path/cp-mvp-010',
    [A_PATH],
    { immutableMutations: [] }
  )
  assert.ok(!rules(added, 'blocking').includes('record-integrity'))

  const unknown = run(
    ['atomik-project/audits/maybe-new.md'],
    'path/cp-mvp-010',
    [A_PATH],
    { immutableMutations: null }
  )
  assert.ok(unknown.some((finding) =>
    finding.rule === 'record-integrity' && finding.outcome === 'inconclusive'))
})

test('ready with only an opening check on record is blocked', () => {
  const ready = {
    ...A_PATH,
    front: { ...A_PATH.front, status: 'ready', subject_commit: CANDIDATE }
  }
  const sessions = [{ path: 'CP-MVP-010', ceremony: 'opening' }]
  const found = run([ready.file], 'path/cp-mvp-010', [ready], {
    previousPaths: new Map([[ready.file, A_PATH.front]]),
    closureFor: (id) => {
      const closed = ceremonyFromSessions(sessions, id)
      return closed ? acceptedRecord(id) : null
    }
  })
  assert.ok(rules(found, 'blocking').includes('acceptance'))
})


/* ------------------------------------------------------------------ *
 * The OPENING check is gated too (owner directive 2026-08-24)
 *
 * F2 repaired the closing gate and left its twin a convention, so a path could
 * be registered, branched and worked with no recorded acceptance at all. Both
 * halves are now declared the same way and matched on the exact id.
 * ------------------------------------------------------------------ */

test('a closing ceremony is not an opening check', () => {
  const closing = [{ path: 'CP-MVP-010', ceremony: 'closing' }]
  assert.equal(openingFromSessions(closing, 'CP-MVP-010'), false)

  const both = [...closing, { path: 'CP-MVP-010', ceremony: 'opening' }]
  assert.equal(openingFromSessions(both, 'CP-MVP-010'), true)
  // and the id still has to match exactly
  assert.equal(openingFromSessions(both, 'CP-MVP-0100'), false)
})

test('a running path with no recorded opening check is blocked', () => {
  const found = run([A_PATH.file], 'path/cp-mvp-010', [A_PATH], {
    openingFor: () => false
  })
  assert.ok(rules(found, 'blocking').includes('opening-ceremony'))
})

test('a running path with its opening check on record passes', () => {
  const found = run([A_PATH.file], 'path/cp-mvp-010', [A_PATH], {
    openingFor: (id) => openingFromSessions([{ path: id, ceremony: 'opening' }], id)
  })
  assert.ok(!rules(found, 'blocking').includes('opening-ceremony'))
})

test('a path this change does not touch is never examined', () => {
  // The eight paths that closed before session notes existed must stay
  // untouched: a change that does not touch them cannot make them wrong.
  const found = run(['docs/index.md'], 'path/cp-mvp-010', [A_PATH], {
    openingFor: () => false
  })
  assert.ok(!rules(found, 'blocking').includes('opening-ceremony'))
})

test('a path that is not running is out of scope for the opening gate', () => {
  const done = {
    ...A_PATH,
    front: {
      ...A_PATH.front,
      status: 'done',
      subject_commit: CANDIDATE,
      resolution: 'completed'
    }
  }
  const found = run([done.file], 'path/cp-mvp-010', [done], {
    openingFor: () => false,
    previousPaths: new Map([[done.file, A_PATH.front]])
  })
  assert.ok(!rules(found, 'blocking').includes('opening-ceremony'))
})

test('the two in-flight paths that predate the schema are advisory, not blocked', () => {
  const legacy = {
    ...A_PATH,
    file: 'atomik-project/coding-paths/CP-MVP-011.md',
    front: { ...A_PATH.front, id: 'CP-MVP-011', branch: 'path/cp-mvp-011' }
  }
  const found = run([legacy.file], 'path/cp-mvp-011', [legacy], { openingFor: () => false })

  assert.ok(!rules(found, 'blocking').includes('opening-ceremony'))
  assert.ok(rules(found, 'advisory').includes('opening-ceremony'))
})

/* ------------------------------------------------------------------ *
 * F5 — frontmatter validation reaches the plane that holds decisions
 *
 * pathFrontmatterErrors() guarded the execution plane while docs/adr/ — the
 * canonical decisions that `decision-drift` points at — had no frontmatter at
 * all, and nothing to check it with (audit 2026-08-24, F5).
 * ------------------------------------------------------------------ */

const AN_ADR = 'docs/adr/ADR-012-parallel-paths-self-merge.md'
const ADR_FRONT = { id: 'ADR-012', status: 'accepted', date: '2026-08-15' }

test('a well-formed ADR raises nothing', () => {
  assert.deepEqual(adrFrontmatterErrors(ADR_FRONT, AN_ADR, 'accepted'), [])
  // no Status: line in the body is not a finding — the rule is that the two agree
  assert.deepEqual(adrFrontmatterErrors(ADR_FRONT, AN_ADR, null), [])
})

test('an ADR whose two halves disagree about its status is caught', () => {
  const errors = adrFrontmatterErrors(ADR_FRONT, AN_ADR, 'superseded')
  assert.equal(errors.length, 1)
  assert.match(errors[0], /contradicts the document's own/)
})

test('an ADR id must match its file name', () => {
  const errors = adrFrontmatterErrors({ ...ADR_FRONT, id: 'ADR-011' }, AN_ADR, 'accepted')
  assert.match(errors[0], /does not match the file name/)
})

test('an ADR needs a frontmatter block, a known status and an ISO date', () => {
  assert.deepEqual(adrFrontmatterErrors(null, AN_ADR), ['missing adr: frontmatter block'])

  const bad = adrFrontmatterErrors({ id: 'ADR-012', status: 'ratified', date: 'August' }, AN_ADR)
  assert.equal(bad.length, 2)
  assert.match(bad[0], /outside the vocabulary/)
  assert.match(bad[1], /ISO date/)
})

/* ------------------------------------------------------------------ *
 * F4 — the ledger has a boundary, and it is ADVISORY
 *
 * A path file is mandatory reading for whoever resumes that path and grows
 * with every step. CP-MVP-008 reached ~23.5 k tokens while the whole entry
 * chain before it costs ~9.3 k (audit 2026-08-24, F4). The rule speaks only
 * to the person already editing the file: a corpus sweep would report the
 * same historical files on every run, and that is how a check gets switched
 * off.
 * ------------------------------------------------------------------ */

const OVERSIZED = {
  ...A_PATH,
  tokens: LEDGER_TOKEN_BUDGET + 1
}

test('an oversized path file in the diff advises rolling steps into history', () => {
  const found = run([OVERSIZED.file], 'path/cp-mvp-010', [OVERSIZED])

  assert.ok(rules(found, 'advisory').includes('ledger-size'))
  // it must never stop a step: the file is large, not wrong
  assert.deepEqual(rules(found, 'blocking'), [])
})

test('an oversized path file nobody touched stays silent', () => {
  const found = run(['docs/index.md'], 'path/cp-mvp-010', [OVERSIZED])
  assert.ok(!rules(found, 'advisory').includes('ledger-size'))
})

test('a path file under the budget raises nothing', () => {
  const small = { ...A_PATH, tokens: LEDGER_TOKEN_BUDGET }
  const found = run([small.file], 'path/cp-mvp-010', [small])
  assert.ok(!rules(found, 'advisory').includes('ledger-size'))
})

test('approxTokens uses the proxy the audit used', () => {
  // words x 4/3 — the F4 table's own arithmetic, so a finding and the record
  // are comparable numbers rather than two disagreeing measurements.
  assert.equal(approxTokens('one two three'), 4)
  assert.equal(approxTokens(''), 0)
  assert.equal(approxTokens('   \n  '), 0)
})

/* ------------------------------------------------------------------ *
 * F13 — the PUBLISHED schema must be the one the parser reads
 *
 * The D1 operator guide prescribed `atomik: { path, ceremony }`, which the
 * reader files under the `atomik` section and never sees at the root. The
 * `ceremony` rule is BLOCKING, so an operator following the published guide
 * would have failed the merge of the path that note was written to close
 * (audit 2026-08-24, F13; ADR-016).
 *
 * These read the SHIPPED template rather than a copy of it: a restatement is
 * what drifted, so the test refuses to restate.
 * ------------------------------------------------------------------ */

/** The frontmatter of the first ```md fence under a named section heading. */
function shippedTemplate(file, heading) {
  const text = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
  const section = text.slice(text.indexOf(heading))
  const open = section.indexOf('```md\n')
  const body = section.slice(open + '```md\n'.length)
  return body.slice(0, body.indexOf('```'))
}

test('the nested ceremony form the guide once prescribed declares nothing', () => {
  const nested = [
    '---', 'type: Atomik Session Record', 'atomik:',
    '  path: CP-MVP-010', '  ceremony: closing', '---', '', '# closing ceremony', ''
  ].join('\n')

  const note = readFrontmatter(nested).data
  assert.equal(note.path, undefined)                     // it landed in `atomik`
  assert.deepEqual(note.atomik, { path: 'CP-MVP-010', ceremony: 'closing' })
  assert.equal(ceremonyFromSessions([note], 'CP-MVP-010'), false)
})

test('the ceremony template shipped in bedrock 24 satisfies the gate', () => {
  const note = readFrontmatter(
    shippedTemplate('docs/bedrock/24_24-doc-templates.md', '## Session note and ceremony template')
  ).data

  assert.equal(note.path, 'CP-EXAMPLE-001')
  assert.equal(ceremonyFromSessions([note], 'CP-EXAMPLE-001'), true)
})

test('an inline comment is stripped from a scalar, the way it already was from a list item', () => {
  // This reverses an earlier deliberate choice, because the choice caused the
  // bug it was meant to avoid. Taking values verbatim to end of line meant
  // `writes:   # ADVISORY — a signal, never a lock` produced a NON-EMPTY value,
  // so the key stopped opening a list and the path silently declared no write
  // surface at all — the F9 failure one line higher up. Found live in this
  // repository on `governs:`. A quoted value keeps its `#`, because there it is
  // content rather than a comment.
  const commented = readFrontmatter(
    ['---', 'path: CP-MVP-010', 'ceremony: closing   # opening | closing', '---', ''].join('\n')
  ).data

  assert.equal(commented.ceremony, 'closing')
  assert.equal(ceremonyFromSessions([commented], 'CP-MVP-010'), true)

  const wholeLine = readFrontmatter(
    ['---', 'cairn:', '  writes:   # ADVISORY, never a lock', '    - src/**', '---', ''].join('\n')
  ).data
  assert.deepEqual(wholeLine.cairn.writes, ['src/**'],
    'a key whose entire value is a comment must still open its list')

  const quoted = readFrontmatter(
    ['---', "title: 'a heading # with a hash'", '---', ''].join('\n')
  ).data
  assert.equal(quoted.title, "'a heading # with a hash'")
})


/* ------------------------------------------------------------------ *
 * F9 — `writes:` is parsed from the FRONTMATTER, not the document
 * ------------------------------------------------------------------ */

test('the frontmatter terminator is not a write surface', () => {
  const doc = [
    '---', 'atomik:', '  id: CP-X', '  writes:',
    '    - apps/desktop/a.ts', '    - apps/desktop/b.ts',
    '---', '', '# Title', '', '- a body bullet', '- another body bullet', ''
  ].join('\n')
  // The old scan consumed `---` as an entry and then ran into the body.
  assert.deepEqual(parseWrites(doc), ['apps/desktop/a.ts', 'apps/desktop/b.ts'])
})

test('a writes: list survives the trailing comment the template shows', () => {
  // bedrock 24 / paths.md write it exactly this way; the old regex demanded
  // `writes:` be followed immediately by a newline and parsed ZERO entries,
  // which silently switches scope-drift off for any path copied from the doc.
  const doc = [
    '---', 'atomik:', '  id: CP-X',
    '  writes:                    # ADVISORY — a signal, never a lock',
    '    - apps/desktop/a.ts',
    '---', '', '# Title', ''
  ].join('\n')
  assert.deepEqual(parseWrites(doc), ['apps/desktop/a.ts'])
})

test('a trailing comment on a writes: ITEM is not part of the surface', () => {
  const doc = [
    '---', 'atomik:', '  writes:',
    '    - docs/adr/**              # every ADR, backfilled at S05',
    '    - apps/desktop/a.ts',
    '---', ''
  ].join('\n')
  // The same trap F9 fixed one line higher: the comment became part of the glob,
  // so a widened declaration kept reporting scope drift (found live, CP-OPS-002 S05).
  assert.deepEqual(parseWrites(doc), ['docs/adr/**', 'apps/desktop/a.ts'])
})

test('no writes: block, or no frontmatter, declares nothing', () => {
  assert.deepEqual(parseWrites('---\natomik:\n  id: CP-X\n---\n\n- bullet\n'), [])
  assert.deepEqual(parseWrites('# just a document\n\n- bullet\n'), [])
  assert.deepEqual(parseWrites(''), [])
})


/* ------------------------------------------------------------------ *
 * ADR-017 — the coding-path lifecycle
 *
 * `archived` is the single terminal state and the exit an abandoned path
 * takes too; `active` is retired; and the hole ADR-012 recorded — nothing
 * notices a path that needs archiving — is closed by an ADVISORY signal,
 * never a blocking one.
 * ------------------------------------------------------------------ */

const running = (id, branch) => ({
  file: `atomik-project/coding-paths/${id}.md`,
  front: { id, status: 'running', branch, base_commit: '7aa3b1d' },
  writes: []
})

test('path ids and branch names are unique across the repository corpus', () => {
  const paths = [
    running('CP-A', 'path/cp-a'),
    running('CP-A', 'path/cp-b'),
    running('CP-C', 'path/cp-a')
  ]
  const errors = duplicatePathIdentityFindings(paths)
  assert.ok(errors.some((error) => error.startsWith('id "CP-A"')))
  assert.ok(errors.some((error) => error.startsWith('branch "path/cp-a"')))
})

test('lifecycle transitions distinguish ready from integrated done', () => {
  const ready = { ...A_PATH.front, status: 'ready', subject_commit: CANDIDATE }
  const done = {
    ...ready,
    status: 'done',
    resolution: 'completed'
  }
  assert.deepEqual(transitionErrors(A_PATH.front, ready, true), [])
  assert.deepEqual(transitionErrors(A_PATH.front, done, false), [])
  assert.ok(transitionErrors(A_PATH.front, done, true)
    .some((error) => error.includes('cannot claim `done`')))
  assert.ok(transitionErrors({ ...A_PATH.front, status: 'blocked' }, ready, true)
    .some((error) => error.includes('not allowed')))
  assert.ok(transitionErrors(A_PATH.front, { ...A_PATH.front, status: 'archived' })
    .some((error) => error.includes('requires resolution')))
  assert.ok(transitionErrors(A_PATH.front, {
    ...A_PATH.front, status: 'archived', resolution: 'completed'
  }).some((error) => error.includes('never completed')))
  assert.deepEqual(transitionErrors(done, {
    ...done, status: 'archived', resolution: 'completed'
  }), [])
})

test('a path declaration is archived with a resolution, never deleted', () => {
  const file = 'atomik-project/coding-paths/CP-DELETED.md'
  const found = run([file], 'master', [], { stateChanged: [file] })
  assert.ok(found.some((finding) =>
    finding.rule === 'transition' && finding.message.includes('instead of deleting')))
})

test('active is out of the status vocabulary (F11)', () => {
  // It was accepted by schema and rejected by branch-path, so a path
  // declaring it failed with a message about a different problem.
  const errors = pathFrontmatterErrors({ id: 'CP-X', status: 'active' })
  assert.equal(errors.length, 1)
  assert.match(errors[0], /outside the vocabulary/)
  assert.doesNotMatch(errors[0], /active \|/)
  // branch-bearing dormant work retains the identity needed to resume it
  assert.deepEqual(pathFrontmatterErrors({
    id: 'CP-X', status: 'blocked', branch: 'path/cp-x', base_commit: '7aa3b1d'
  }), [])
  for (const status of ['draft', 'archived'])
    assert.deepEqual(pathFrontmatterErrors({ id: 'CP-X', status }), [])
})

test('a running path whose branch has gone quiet is reported', () => {
  const paths = [running('CP-A', 'path/cp-a'), running('CP-B', 'path/cp-b')]
  const stale = staleRunningPaths(paths, { 'path/cp-a': 30, 'path/cp-b': 2 })
  assert.deepEqual(stale, [{ id: 'CP-A', branch: 'path/cp-a', days: 30 }])
  // the budget is a boundary, not a trap: exactly at the window is not stale
  assert.deepEqual(staleRunningPaths(paths, { 'path/cp-a': PATH_STALE_DAYS }), [])
  assert.equal(staleRunningPaths(paths, { 'path/cp-a': PATH_STALE_DAYS + 1 }).length, 1)
})

test('an unresolvable branch reports nothing, never staleness', () => {
  // A shallow CI clone and a path whose branch lives on another machine both
  // look like this. Unknown must not read as stale, for the same reason it
  // must not read as fresh.
  const paths = [running('CP-A', 'path/cp-a')]
  assert.deepEqual(staleRunningPaths(paths, {}), [])
  assert.deepEqual(staleRunningPaths(paths, { 'path/cp-a': null }), [])
  assert.deepEqual(staleRunningPaths(paths, { 'path/cp-a': undefined }), [])
  assert.deepEqual(staleRunningPaths(paths, { 'path/cp-a': NaN }), [])
})

test('only running paths can be stale, and the oldest is reported first', () => {
  // A done or archived path has already left the portfolio; an archived one is
  // the RESOLUTION this rule points at, so reporting it would never end.
  const done = { file: 'f', front: { id: 'CP-D', status: 'done', branch: 'path/cp-d' }, writes: [] }
  const archived = { file: 'f', front: { id: 'CP-Z', status: 'archived', branch: 'path/cp-z' }, writes: [] }
  const noBranch = { file: 'f', front: { id: 'CP-N', status: 'running' }, writes: [] }
  const ages = { 'path/cp-d': 400, 'path/cp-z': 400, 'path/cp-a': 20, 'path/cp-b': 90 }
  assert.deepEqual(staleRunningPaths([done, archived, noBranch], ages), [])
  assert.deepEqual(
    staleRunningPaths([running('CP-A', 'path/cp-a'), running('CP-B', 'path/cp-b')], ages)
      .map((s) => s.id),
    ['CP-B', 'CP-A']
  )
})

/* ------------------------------------------------------------------ *
 * v0.2 — the limited frontmatter grammar
 * ------------------------------------------------------------------ */

const V02_RECORD = `---
ceremony: closing
accepted_roles: [reviewer, auditor]
advisory_disposition:
  - rule: scope-drift
    disposition: accepted
    reason: the wider root cause is declared in writes: at this same commit
  - rule: path-staleness
    disposition: deferred
    owner: participant-id
cairn:
  id: CP-EXAMPLE-001
  status: running
  writes:
    - src/**   # a trailing comment
    - docs/modules/example.md
  governs:
    - docs/architecture/example.md@89ab
---
body`

test('the frontmatter reader parses flow lists, block lists, and lists of maps', () => {
  const { data } = readFrontmatter(V02_RECORD)
  assert.deepEqual(data.accepted_roles, ['reviewer', 'auditor'])
  assert.deepEqual(data.cairn.writes, ['src/**', 'docs/modules/example.md'])
  assert.deepEqual(data.cairn.governs, ['docs/architecture/example.md@89ab'])
  assert.equal(data.advisory_disposition.length, 2)
  assert.deepEqual(data.advisory_disposition[0], {
    rule: 'scope-drift',
    disposition: 'accepted',
    reason: 'the wider root cause is declared in writes: at this same commit'
  })
  assert.equal(data.advisory_disposition[1].owner, 'participant-id')
})

test('lists do not leak into the scalars that follow them', () => {
  const { data } = readFrontmatter(V02_RECORD)
  assert.equal(data.cairn.id, 'CP-EXAMPLE-001')
  assert.equal(data.cairn.status, 'running')
  assert.equal(data.ceremony, 'closing')
})

test('the extended reader leaves parseWrites and quoted scalars alone', () => {
  assert.deepEqual(parseWrites(V02_RECORD), ['src/**', 'docs/modules/example.md'])
  const quoted = readFrontmatter("---\ntitle: 'ADR-018: a title with a colon'\n---\nx")
  assert.equal(quoted.data.title, "'ADR-018: a title with a colon'")
})

/* ------------------------------------------------------------------ *
 * v0.2 — typed work units
 * ------------------------------------------------------------------ */

const LEDGER = `### S01 — first

\`\`\`cairn-unit
step: S01
unit: 01
type: implementation
verified: cairn-check, test
\`\`\`

### S02 — second

\`\`\`cairn-unit
step: S02
unit: 02
type: documentation
verified: cairn-check
\`\`\`
`

const UNIT_PATH = {
  ...A_PATH,
  front: { ...A_PATH.front, id: 'CP-MVP-010' }
}

test('a cairn-unit block is read from the ledger, and a bad type is rejected', () => {
  const units = parseWorkUnits(LEDGER)
  assert.equal(units.length, 2)
  assert.deepEqual(units.map((u) => u.type), ['implementation', 'documentation'])
  assert.deepEqual(workUnitErrors(units[0]), [])
  assert.ok(workUnitErrors({ step: 'S03', unit: '03', type: 'refactor' }).length > 0)
  assert.ok(WORK_UNIT_TYPES.includes('repair'))
})

test('a changed path record with no cairn-unit block is blocked', () => {
  const found = run([UNIT_PATH.file], 'path/cp-mvp-010', [UNIT_PATH], { workUnits: [] })
  assert.ok(rules(found, 'blocking').includes('work-unit'))
})

test('the block must be for the step the record says it is on', () => {
  const onS03 = { ...UNIT_PATH, front: { ...UNIT_PATH.front, current_step: 'S03' } }
  const stale = run([onS03.file], 'path/cp-mvp-010', [onS03], { workUnits: UNITS })
  assert.ok(rules(stale, 'blocking').includes('work-unit'),
    'a block for S01/S02 must not satisfy a record declaring S03')

  const current = run([onS03.file], 'path/cp-mvp-010', [onS03], {
    workUnits: [...UNITS, { step: 'S03', unit: '03', type: 'repair', verified: 'cairn-check' }]
  })
  assert.ok(!rules(current, 'blocking').includes('work-unit'))
})

test('a path record that did not change is not asked for a work unit', () => {
  const found = run(['README.md'], 'path/cp-mvp-010', [UNIT_PATH], { workUnits: [] })
  assert.ok(!rules(found, 'blocking').includes('work-unit'))
})

test('an invalid declared type blocks even when a block is present', () => {
  const found = run([UNIT_PATH.file], 'path/cp-mvp-010', [UNIT_PATH], {
    workUnits: [{ step: 'S01', unit: '01', type: 'refactor', verified: 'all' }]
  })
  assert.ok(rules(found, 'blocking').includes('work-unit'))
})

/* ------------------------------------------------------------------ *
 * v0.2 — checkpoint retention
 * ------------------------------------------------------------------ */

const ref = (n) => `${CHECKPOINT_REF_PREFIX}/cp-mvp-010/${n}`
const UNITS = parseWorkUnits(LEDGER)

test('retention exempts only the newest unit, because its ref is written after the commit', () => {
  assert.deepEqual(retentionDue(UNITS).map((u) => u.unit), ['01'])
  assert.deepEqual(retentionDue([UNITS[0]]).map((u) => u.unit), [])
})

test('a completed unit with no retention ref is blocked', () => {
  const found = run([UNIT_PATH.file], 'path/cp-mvp-010', [UNIT_PATH], {
    workUnits: UNITS,
    retainedRefs: new Map()
  })
  assert.ok(rules(found, 'blocking').includes('checkpoint-retention'))
})

test('a retained completed unit passes, and the newest one is only advised', () => {
  const found = run([UNIT_PATH.file], 'path/cp-mvp-010', [UNIT_PATH], {
    workUnits: UNITS,
    retainedRefs: new Map([[ref('01'), CANDIDATE]])
  })
  assert.ok(!rules(found, 'blocking').includes('checkpoint-retention'))
  assert.ok(rules(found, 'advisory').includes('checkpoint-retention'))
})

test('unreadable retention refs are inconclusive and non-zero, never a pass', () => {
  const found = run([UNIT_PATH.file], 'path/cp-mvp-010', [UNIT_PATH], {
    workUnits: UNITS,
    retainedRefs: null
  })
  const retention = found.filter((f) => f.rule === 'checkpoint-retention')
  assert.equal(retention.length, 1)
  assert.equal(retention[0].level, 'blocking')
  assert.equal(retention[0].outcome, 'inconclusive')
})

/* ------------------------------------------------------------------ *
 * v0.2 — provisional commits
 * ------------------------------------------------------------------ */

const READY_PATH = {
  ...A_PATH,
  front: { ...A_PATH.front, status: 'ready', subject_commit: CANDIDATE }
}

test('a candidate still containing a provisional commit is blocked', () => {
  const found = run([READY_PATH.file], 'path/cp-mvp-010', [READY_PATH], {
    previousPaths: new Map([[READY_PATH.file, A_PATH.front]]),
    provisionalInCandidate: ['1a2b3c4']
  })
  assert.ok(rules(found, 'blocking').includes('provisional'))
})

test('a folded candidate carries no provisional finding', () => {
  const found = run([READY_PATH.file], 'path/cp-mvp-010', [READY_PATH], {
    previousPaths: new Map([[READY_PATH.file, A_PATH.front]]),
    provisionalInCandidate: []
  })
  assert.ok(!rules(found, 'blocking').includes('provisional'))
})

test('an unreadable candidate range is inconclusive, not silent', () => {
  const found = run([READY_PATH.file], 'path/cp-mvp-010', [READY_PATH], {
    previousPaths: new Map([[READY_PATH.file, A_PATH.front]]),
    provisionalInCandidate: null
  })
  const provisional = found.filter((f) => f.rule === 'provisional')
  assert.equal(provisional[0].outcome, 'inconclusive')
})

test('a provisional HEAD is durable work, advised rather than forbidden', () => {
  const found = run(['src/x.ts'], 'path/cp-mvp-010', [UNIT_PATH], { headProvisional: true })
  assert.ok(rules(found, 'advisory').includes('provisional'))
  assert.ok(!rules(found, 'blocking').includes('provisional'))
  assert.equal(PROVISIONAL_TRAILER, 'Cairn-Provisional')
})

/* ------------------------------------------------------------------ *
 * v0.2 — scope is bound by digest, not by a pointer
 * ------------------------------------------------------------------ */

const SCOPED = `# CP-MVP-010

## Goal

Something.

## Definition of done

- [ ] the observable result
- [ ] and its tests

## Execution

Not part of the scope.
`

test('a scope_ref resolves to its heading and body, stopping at the next peer heading', () => {
  const section = resolveScopeSection(SCOPED, '#definition-of-done')
  assert.match(section, /^## Definition of done/)
  assert.match(section, /and its tests/)
  assert.doesNotMatch(section, /Not part of the scope/)
  assert.equal(resolveScopeSection(SCOPED, '#no-such-heading'), null)
})

test('the digest changes when the accepted text changes, and only then', () => {
  const before = scopeDigest(resolveScopeSection(SCOPED, '#definition-of-done'))
  const reflowed = SCOPED.replace('## Execution', '## Execution')
  assert.equal(scopeDigest(resolveScopeSection(reflowed, '#definition-of-done')), before)
  const moved = SCOPED.replace('- [ ] and its tests', '- [ ] and maybe its tests')
  assert.notEqual(scopeDigest(resolveScopeSection(moved, '#definition-of-done')), before)
  assert.match(before, /^sha256:[0-9a-f]{64}$/)
})

const readyPath = (extra = {}) => ({
  ...A_PATH,
  front: { ...A_PATH.front, status: 'ready', subject_commit: CANDIDATE, ...extra }
})

const digested = (record = {}) => ({ ...acceptedRecord(), scope_digest: 'sha256:abc', ...record })

test('a closing record whose digest no longer matches the path record is blocked', () => {
  const ready = readyPath()
  const found = run([ready.file], 'path/cp-mvp-010', [ready], {
    previousPaths: new Map([[ready.file, A_PATH.front]]),
    closureFor: () => digested(),
    scopeDigestFor: () => 'sha256:def',
    migrationExempt: new Set()
  })
  assert.ok(rules(found, 'blocking').includes('scope-digest'))
})

test('a matching digest passes, and an unreadable scope_ref is inconclusive', () => {
  const ready = readyPath()
  const ok = run([ready.file], 'path/cp-mvp-010', [ready], {
    previousPaths: new Map([[ready.file, A_PATH.front]]),
    closureFor: () => digested(),
    scopeDigestFor: () => 'sha256:abc',
    openingRecordFor: () => ({ scope_digest: 'sha256:abc' }),
    migrationExempt: new Set()
  })
  assert.ok(!rules(ok, 'blocking').includes('scope-digest'))

  const unreadable = run([ready.file], 'path/cp-mvp-010', [ready], {
    previousPaths: new Map([[ready.file, A_PATH.front]]),
    closureFor: () => digested(),
    scopeDigestFor: () => undefined,
    migrationExempt: new Set()
  })
  assert.equal(
    unreadable.find((f) => f.rule === 'scope-digest').outcome,
    'inconclusive'
  )
})

test('a listed migration path is advised about a missing digest, never blocked', () => {
  const ready = readyPath()
  const found = run([ready.file], 'path/cp-mvp-010', [ready], {
    previousPaths: new Map([[ready.file, A_PATH.front]]),
    closureFor: () => acceptedRecord(),
    scopeDigestFor: () => 'sha256:abc',
    migrationExempt: new Set(['CP-MVP-010'])
  })
  assert.ok(!rules(found, 'blocking').includes('scope-digest'))
  assert.ok(rules(found, 'advisory').includes('scope-digest'))
})

test('a spent migration exception is itself a blocking finding', () => {
  assert.deepEqual(migrationDebt([], new Set()), [])
  assert.equal(migrationDebt([], new Set(['CP-GONE'])).length, 1)
  assert.equal(
    migrationDebt([{ front: { id: 'CP-OLD', status: 'archived' } }], new Set(['CP-OLD'])).length,
    1
  )
  assert.equal(
    migrationDebt([{ front: { id: 'CP-OLD', status: 'running' } }], new Set(['CP-OLD'])).length,
    0
  )
  const found = run(['README.md'], 'path/cp-mvp-010', [A_PATH], {
    migrationStale: ['CP-GONE no longer exists']
  })
  assert.ok(rules(found, 'blocking').includes('migration-debt'))
})

/* ------------------------------------------------------------------ *
 * v0.2 — closure moves fields, not files
 * ------------------------------------------------------------------ */

test('closure may move status and subject_commit and nothing else', () => {
  const before = { id: 'CP-MVP-010', status: 'running', writes: ['a'], scope_ref: 'x' }
  assert.deepEqual(
    closureFieldErrors(before, { ...before, status: 'ready', subject_commit: CANDIDATE }),
    []
  )
  assert.equal(closureFieldErrors(before, { ...before, writes: ['a', 'b'] }).length, 1)
  assert.equal(closureFieldErrors(before, { ...before, scope_ref: 'y' }).length, 1)
  assert.ok(CLOSURE_MUTABLE_FIELDS.includes('status'))
  assert.ok(!CLOSURE_MUTABLE_FIELDS.includes('writes'))
})

test('the closure surface is scoped by the fact it records, not shared across both', () => {
  // `resolution` at closure is incoherent: a ready path has resolved nothing.
  // Allowing it on both statuses made the predicate more permissive than the
  // prose it enforces — the bad direction. Caught in review.
  const before = { id: 'CP-MVP-010', status: 'running', current_step: 'S01' }
  assert.deepEqual(closureMutableFields('ready'), ['status', 'subject_commit'])
  assert.deepEqual(closureMutableFields('done'), ['status', 'subject_commit', 'resolution'])
  assert.equal(
    closureFieldErrors(before, { ...before, status: 'ready', resolution: 'completed' }).length,
    1
  )
  assert.equal(
    closureFieldErrors(before, { ...before, status: 'ready', current_step: 'S02' }).length,
    1
  )
  assert.deepEqual(
    closureFieldErrors(before, { ...before, status: 'done', resolution: 'completed' }),
    []
  )
})

test('an object id may be SHA-1 or SHA-256, and never a prefix', () => {
  // A checker that admits only forty characters refuses a repository the
  // specification accepts, so the tool and the spec disagree about what a valid
  // repository is.
  assert.ok(isObjectId('a'.repeat(40)))
  assert.ok(isObjectId('a'.repeat(64)))
  assert.ok(!isObjectId('a'.repeat(7)))
  assert.ok(!isObjectId('a'.repeat(41)))
  assert.ok(!isObjectId('zz' + 'a'.repeat(38)))
})

test('a closure commit that rewrites the accepted scope is blocked', () => {
  const ready = readyPath()
  const found = run([ready.file], 'path/cp-mvp-010', [ready], {
    previousPaths: new Map([[ready.file, A_PATH.front]]),
    previousFronts: new Map([[ready.file, { ...A_PATH.front, scope_ref: 'was' }]]),
    closureFor: () => digested(),
    scopeDigestFor: () => 'sha256:abc',
    migrationExempt: new Set()
  })
  assert.ok(rules(found, 'blocking').includes('closure-surface'))
})

/* ------------------------------------------------------------------ *
 * v0.2 — acceptance drift
 * ------------------------------------------------------------------ */

test('drift is decided over declared surfaces, not over trunk equality', () => {
  const writes = ['apps/example/**']
  const governs = ['docs/bedrock/22_22-agent-handoff.md@89ab89ab']
  assert.deepEqual(acceptanceDrift(['README.md'], writes, governs), [])
  assert.deepEqual(acceptanceDrift(['apps/example/x.ts'], writes, governs), ['apps/example/x.ts'])
  assert.deepEqual(
    acceptanceDrift(['docs/bedrock/22_22-agent-handoff.md'], writes, governs),
    ['docs/bedrock/22_22-agent-handoff.md']
  )
})

test('a trunk that moved inside the declared surfaces invalidates the acceptance', () => {
  const ready = { ...readyPath(), writes: ['apps/example/**'], governs: [] }
  const drifted = run([ready.file], 'path/cp-mvp-010', [ready], {
    previousPaths: new Map([[ready.file, A_PATH.front]]),
    closureFor: () => ({ ...digested(), base: '70f7e27' }),
    scopeDigestFor: () => 'sha256:abc',
    trunkDelta: ['apps/example/x.ts'],
    migrationExempt: new Set(['CP-MVP-010'])
  })
  assert.ok(rules(drifted, 'blocking').includes('acceptance-drift'))

  const untouched = run([ready.file], 'path/cp-mvp-010', [ready], {
    previousPaths: new Map([[ready.file, A_PATH.front]]),
    closureFor: () => ({ ...digested(), base: '70f7e27' }),
    scopeDigestFor: () => 'sha256:abc',
    trunkDelta: ['unrelated/other.ts'],
    migrationExempt: new Set(['CP-MVP-010'])
  })
  assert.ok(!rules(untouched, 'blocking').includes('acceptance-drift'))
})

test('a busy trunk alone never invalidates an acceptance', () => {
  const ready = { ...readyPath(), writes: ['apps/example/**'], governs: [] }
  const busy = run([ready.file], 'path/cp-mvp-010', [ready], {
    previousPaths: new Map([[ready.file, A_PATH.front]]),
    closureFor: () => ({ ...digested(), base: '70f7e27' }),
    scopeDigestFor: () => 'sha256:abc',
    trunkDelta: Array.from({ length: 200 }, (_, i) => `other/area/file-${i}.ts`),
    migrationExempt: new Set(['CP-MVP-010'])
  })
  assert.ok(!rules(busy, 'blocking').includes('acceptance-drift'))
})

/* ------------------------------------------------------------------ *
 * v0.2 — advisory dispositions and collapsed roles
 * ------------------------------------------------------------------ */

test('a disposition list must match the advisories attested at the candidate', () => {
  const entry = { rule: 'scope-drift', disposition: 'accepted', reason: 'declared here' }
  assert.deepEqual(dispositionErrors([entry], ['scope-drift'], []), [])
  assert.equal(dispositionErrors([], ['scope-drift'], []).length, 1)
  assert.equal(dispositionErrors([entry], [], []).length, 1)
  assert.equal(dispositionErrors('all fixed', ['scope-drift'], []).length, 1)
  assert.ok(DISPOSITIONS.includes('deferred'))
})

test('comparing against the CLOSURE commit alone would be unsound', () => {
  // `A` is field-restricted, so its advisory set is a strict subset of `C`'s.
  // A rule comparing dispositions against what fires at `A` passes while an
  // advisory raised at `C` goes undisposed — the exact failure the requirement
  // exists to prevent.
  const entry = { rule: 'scope-drift', disposition: 'accepted', reason: 'r' }
  const raisedAtA = ['scope-drift']
  assert.equal(
    dispositionErrors([entry], ['scope-drift', 'path-staleness'], raisedAtA).length,
    1,
    'path-staleness was attested at the candidate and left undisposed'
  )
})

test('an advisory firing at closure and missing from the attestation proves it incomplete', () => {
  const entry = { rule: 'scope-drift', disposition: 'accepted', reason: 'r' }
  const errors = dispositionErrors([entry], ['scope-drift'], ['scope-drift', 'ledger-size'])
  assert.ok(errors.some((e) => /proves the attested set incomplete/.test(e)))
})

test('a closing record with no attested candidate set cannot be checked soundly', () => {
  const entry = { rule: 'scope-drift', disposition: 'accepted', reason: 'r' }
  assert.ok(
    dispositionErrors([entry], undefined, []).some((e) => /advisories_at_candidate/.test(e))
  )
})

test('a deferral without an owner and a follow-up is rejected', () => {
  const deferred = { rule: 'path-staleness', disposition: 'deferred', reason: 'frozen' }
  assert.ok(dispositionErrors([deferred], ['path-staleness']).length > 0)
  assert.deepEqual(
    dispositionErrors(
      [{ ...deferred, owner: 'a', follow_up: 'CP-X' }],
      ['path-staleness']
    ),
    []
  )
})

test('prose disposition is advised for a grandfathered path and blocked otherwise', () => {
  const ready = readyPath()
  const common = {
    previousPaths: new Map([[ready.file, A_PATH.front]]),
    closureFor: () => digested(),
    scopeDigestFor: () => 'sha256:abc'
  }
  const exempt = run([ready.file], 'path/cp-mvp-010', [ready], {
    ...common,
    migrationExempt: new Set(['CP-MVP-010'])
  })
  assert.ok(rules(exempt, 'advisory').includes('advisory-disposition'))
  assert.ok(!rules(exempt, 'blocking').includes('advisory-disposition'))

  const strict = run([ready.file], 'path/cp-mvp-010', [ready], {
    ...common,
    migrationExempt: new Set()
  })
  assert.ok(rules(strict, 'blocking').includes('advisory-disposition'))
})

test('one actor on both acceptances is recorded as an advisory, not forbidden', () => {
  const ready = readyPath()
  const found = run([ready.file], 'path/cp-mvp-010', [ready], {
    previousPaths: new Map([[ready.file, A_PATH.front]]),
    closureFor: () => ({ ...digested(), accepted_by: 'solo@example.test' }),
    openingRecordFor: () => ({ accepted_by: 'solo@example.test', scope_digest: 'sha256:abc' }),
    scopeDigestFor: () => 'sha256:abc',
    migrationExempt: new Set(['CP-MVP-010'])
  })
  assert.ok(rules(found, 'advisory').includes('role-collapse'))
  assert.ok(!rules(found, 'blocking').includes('role-collapse'))
})

test('two different actors raise no collapse finding', () => {
  const ready = readyPath()
  const found = run([ready.file], 'path/cp-mvp-010', [ready], {
    previousPaths: new Map([[ready.file, A_PATH.front]]),
    closureFor: () => ({ ...digested(), accepted_by: 'reviewer@example.test' }),
    openingRecordFor: () => ({ accepted_by: 'initiator@example.test' }),
    scopeDigestFor: () => 'sha256:abc',
    migrationExempt: new Set(['CP-MVP-010'])
  })
  assert.ok(!rules(found, 'advisory').includes('role-collapse'))
})

test('the opening record itself is retrievable, not merely its existence', () => {
  const sessions = [
    { path: 'CP-MVP-010', ceremony: 'opening', accepted_by: 'a', scope_digest: 'sha256:1' },
    { path: 'CP-OTHER', ceremony: 'opening', accepted_by: 'b' }
  ]
  assert.equal(openingRecordFromSessions(sessions, 'CP-MVP-010').accepted_by, 'a')
  assert.equal(openingRecordFromSessions(sessions, 'CP-NONE'), null)
})

/* ------------------------------------------------------------------ *
 * v0.2 — scope drift blocks unless the declaration moves with it
 * ------------------------------------------------------------------ */

test('drift with a stale declaration blocks; drift that widens it stays advisory', () => {
  const outside = ['unrelated/file.ts']
  const stale = run(outside, 'path/cp-mvp-010', [A_PATH], {
    previousFronts: new Map([[`${A_PATH.file}::writes`, A_PATH.writes]])
  })
  assert.ok(rules(stale, 'blocking').includes('scope-drift'))

  const widened = run(outside, 'path/cp-mvp-010', [A_PATH], {
    previousFronts: new Map([[`${A_PATH.file}::writes`, ['apps/desktop/electron-main/graph-index.ts']]])
  })
  assert.ok(!rules(widened, 'blocking').includes('scope-drift'))
  assert.ok(rules(widened, 'advisory').includes('scope-drift'))
})

/* ------------------------------------------------------------------ *
 * v0.2 — the route a change earns
 * ------------------------------------------------------------------ */

test('the structural full-route triggers fire on the control and decision planes', () => {
  assert.deepEqual(fullRouteTriggers(['apps/desktop/renderer/src/editor/x.ts']), [])
  assert.match(fullRouteTriggers(['tools/cairn-check.mjs'])[0], /control plane/)
  assert.match(fullRouteTriggers(['docs/adr/**'])[0], /decision record/)
  assert.match(
    fullRouteTriggers([
      'apps/desktop/renderer/src/editor/x.ts',
      'apps/desktop/electron-main/vault/y.ts'
    ])[0],
    /implemented areas/
  )
  assert.ok(ROUTES.includes('foundation'))
})

test('a lightweight path that meets a trigger is blocked until it escalates', () => {
  const heavy = { ...A_PATH, writes: ['tools/cairn-check.mjs'] }
  const found = run([heavy.file], 'path/cp-mvp-010', [heavy], {
    workUnits: [{ step: 'S01', unit: '01', type: 'implementation', verified: 'x' }]
  })
  assert.ok(rules(found, 'blocking').includes('route'))

  const escalated = {
    ...heavy,
    front: { ...heavy.front, route: 'full' }
  }
  const ok = run([escalated.file], 'path/cp-mvp-010', [escalated], {
    workUnits: [{ step: 'S01', unit: '01', type: 'implementation', verified: 'x' }]
  })
  assert.ok(!rules(ok, 'blocking').includes('route'))
})

test('escalation is one-way and an unknown route is rejected', () => {
  assert.equal(routeDescent('full', 'full'), null)
  assert.equal(routeDescent('lightweight', 'full'), null)
  assert.match(routeDescent('full', 'lightweight'), /one-way/)

  const bogus = { ...A_PATH, front: { ...A_PATH.front, route: 'express' } }
  assert.ok(rules(run(['README.md'], 'path/cp-mvp-010', [bogus]), 'blocking').includes('route'))

  const descended = { ...A_PATH, front: { ...A_PATH.front, route: 'lightweight' } }
  const found = run(['README.md'], 'path/cp-mvp-010', [descended], {
    previousFronts: new Map([[descended.file, { ...descended.front, route: 'full' }]])
  })
  assert.ok(rules(found, 'blocking').includes('route'))
})

test("a foundation path's write surface is documents and the paths it produces", () => {
  assert.deepEqual(foundationSurfaceViolations(['docs/**', 'project/coding-paths/CP-A.md']), [])
  assert.deepEqual(foundationSurfaceViolations(['apps/desktop/x.ts']), ['apps/desktop/x.ts'])

  const foundation = {
    ...A_PATH,
    front: { ...A_PATH.front, route: 'foundation' },
    writes: ['docs/architecture/x.md', 'apps/desktop/x.ts']
  }
  assert.ok(rules(run(['README.md'], 'path/cp-mvp-010', [foundation]), 'blocking').includes('route'))
})

/* ------------------------------------------------------------------ *
 * v0.2 — the handoff brief is a contract
 * ------------------------------------------------------------------ */

const briefFront = {
  written_by: 'participant-id',
  checkpoint: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  checkpoint_unit: '07',
  checkpoint_pushed: 'true',
  base_commit: '70f7e27',
  trunk_seen: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  writes: ['src/**'],
  governs: ['docs/a.md@cccc'],
  verify: ['npm run cairn-check'],
  budget_tokens: '1200'
}
const briefBody = BRIEF_SECTIONS.map((section) => `## ${section}\n\nshort.\n`).join('\n')

test('a complete brief passes and each missing field is named', () => {
  assert.deepEqual(briefErrors(briefFront, briefBody), [])
  const { trunk_seen: _dropped, ...missing } = briefFront
  assert.ok(briefErrors(missing, briefBody).some((e) => e.includes('trunk_seen')))
  assert.deepEqual(BRIEF_FIELDS.length, 10)
  // written_by exists so a cold-resume pilot can separate a practice problem
  // from a schema problem. The first pilot could not: one Git author across the
  // whole corpus collapsed the writer axis before it could be read.
  assert.ok(BRIEF_FIELDS.includes('written_by'))
})

test('an unpushed checkpoint is a defect to repair, not a handoff', () => {
  const errors = briefErrors({ ...briefFront, checkpoint_pushed: 'false' }, briefBody)
  assert.ok(errors.some((e) => /not on the remote/.test(e)))
})

test('an unpinned governs entry is rejected, because it means "whatever this says now"', () => {
  const errors = briefErrors({ ...briefFront, governs: ['docs/a.md'] }, briefBody)
  assert.ok(errors.some((e) => /not pinned/.test(e)))
})

test('the seven sections are exact — none missing, none extra', () => {
  const short = briefBody.replace('## Tried and rejected\n\nshort.\n', '')
  assert.ok(briefErrors(briefFront, short).some((e) => /missing: Tried and rejected/.test(e)))
  const extra = `${briefBody}\n## Appendix\n\nmore.\n`
  assert.ok(briefErrors(briefFront, extra).some((e) => /outside the seven: Appendix/.test(e)))
})

test('a brief over its declared budget is reported with both numbers', () => {
  const bloated = briefBody.replace('## State\n\nshort.', `## State\n\n${'word '.repeat(4000)}`)
  const errors = briefErrors({ ...briefFront, budget_tokens: '1200' }, bloated)
  assert.ok(errors.some((e) => /against its declared budget of 1200/.test(e)))
})

test('a missing brief blocks, and is only advised for a listed migration path', () => {
  const strict = run(['README.md'], 'path/cp-mvp-010', [A_PATH], {
    briefFor: () => null,
    migrationExempt: new Set()
  })
  assert.ok(rules(strict, 'blocking').includes('brief-schema'))

  const exempt = run(['README.md'], 'path/cp-mvp-010', [A_PATH], {
    briefFor: () => null,
    migrationExempt: new Set(['CP-MVP-010'])
  })
  assert.ok(!rules(exempt, 'blocking').includes('brief-schema'))
  assert.ok(rules(exempt, 'advisory').includes('brief-schema'))
})

/* ------------------------------------------------------------------ *
 * v0.2 — redaction names the record that authorised it
 * ------------------------------------------------------------------ */

test('a redaction marker inside code is documentation, not a finding', () => {
  assert.deepEqual(redactionMarkers('text [redacted: 2026-01-01-x] more'), ['2026-01-01-x'])
  assert.deepEqual(redactionMarkers('use `[redacted: <id>]` in the record'), [])
  assert.deepEqual(redactionMarkers('```\n[redacted: <id>]\n```'), [])
})

test('a marker with no redaction record behind it is blocked', () => {
  const index = {
    has: (marker) => marker === '2026-01-01-cp-mvp-010-redaction',
    markersIn: (file) => (file === 'atomik-project/sessions/note.md' ? ['2026-01-01-cp-mvp-010-redaction'] : ['ghost'])
  }
  const good = run(['atomik-project/sessions/note.md'], 'path/cp-mvp-010', [A_PATH], {
    redactionRecordExists: index
  })
  assert.ok(!rules(good, 'blocking').includes('redaction'))

  const bad = run(['docs/other.md'], 'path/cp-mvp-010', [A_PATH], {
    redactionRecordExists: index
  })
  assert.ok(rules(bad, 'blocking').includes('redaction'))
})

/* ------------------------------------------------------------------ *
 * v0.2 — the lifecycle table, reconciled in both directions
 * ------------------------------------------------------------------ */

test('ready → blocked exists, because acceptance stalls', () => {
  assert.deepEqual(
    transitionErrors({ status: 'ready' }, { status: 'blocked' }),
    [],
    'a candidate waiting on an unavailable reviewer is blocked, not still ready'
  )
})

test('blocked → ready does not exist, because reaching ready is execution', () => {
  assert.ok(
    transitionErrors({ status: 'blocked' }, { status: 'ready' })
      .some((error) => /not allowed/.test(error))
  )
})

test('an unchanged archived state is no event, but its resolution is terminal', () => {
  const archived = { status: 'archived', resolution: 'completed' }
  assert.deepEqual(transitionErrors(archived, archived), [])
  assert.ok(
    transitionErrors(archived, { status: 'archived', resolution: 'superseded' })
      .some((error) => /resolution is terminal/.test(error))
  )
})

/* ------------------------------------------------------------------ *
 * v0.2 — a retention ref that MOVED leaves an orphan behind
 * ------------------------------------------------------------------ */

const CHAIN = ['c1', 'c2', 'c3', 'c4']

test('retention is judged from the oldest retained commit, never before it', () => {
  // Commits older than the convention cannot be judged by it.
  assert.deepEqual(
    unretainedCheckpoints(CHAIN, ['c2', 'c3'], new Set(), 'c4'),
    []
  )
  assert.deepEqual(unretainedCheckpoints(CHAIN, [], new Set(), 'c4'), [])
})

test('a ref moved forward orphans the commit it used to name', () => {
  // Every DECLARED unit still resolves a ref, which is why the per-unit check
  // cannot see this. The commit that lost its ref can.
  assert.deepEqual(
    unretainedCheckpoints(CHAIN, ['c1', 'c4'], new Set(), 'c4'),
    ['c2', 'c3']
  )
})

test('provisional commits and HEAD are not orphans', () => {
  assert.deepEqual(
    unretainedCheckpoints(CHAIN, ['c1'], new Set(['c2', 'c3']), 'c4'),
    []
  )
})

test('an orphaned checkpoint blocks the gate', () => {
  const found = run([UNIT_PATH.file], 'path/cp-mvp-010', [UNIT_PATH], {
    workUnits: UNITS,
    retainedRefs: new Map([[ref('01'), 'c1'], [ref('02'), 'c4']]),
    pathCommits: CHAIN,
    head: 'c4'
  })
  assert.ok(rules(found, 'blocking').includes('checkpoint-retention'))
})

test('a lightweight path that has already spanned two units must escalate', () => {
  // "Expected to span more than one work unit" is unobservable. HAVING spanned
  // one is a fact in the ledger, and without this backstop everything can
  // declare itself lightweight and no rule ever fires.
  const twoUnits = [
    { step: 'S01', unit: '01', type: 'implementation', verified: 'x' },
    { step: 'S02', unit: '02', type: 'implementation', verified: 'x' }
  ]
  const found = run([A_PATH.file], 'path/cp-mvp-010', [A_PATH], { workUnits: twoUnits })
  assert.ok(rules(found, 'blocking').includes('route'))

  const escalated = { ...A_PATH, front: { ...A_PATH.front, route: 'full' } }
  const ok = run([escalated.file], 'path/cp-mvp-010', [escalated], { workUnits: twoUnits })
  assert.ok(!rules(ok, 'blocking').includes('route'))
})

/**
 * ADVERSARIAL FIXTURES — the directive's first requirement.
 *
 * These do not assert that a valid repository passes. They assert that a
 * CRAFTED VIOLATION is REJECTED, and that the finding names the rule under
 * test. A rule that never fires passes every valid-input test identically, so
 * a green suite is not evidence a gate works; a rejection is.
 */
test('cairn-check: a legacy record is exempted, a current one is not', () => {
  const legacy = { front: { id: 'CP-MVP-008', status: 'done' } }
  const current = { front: { id: 'CP-FUTURE-001', status: 'done' } }

  // The exception is finite and named — membership is the whole mechanism.
  assert.equal(V02_MIGRATION_PATHS.has('CP-MVP-008'), true)
  assert.equal(V02_MIGRATION_PATHS.has('CP-FUTURE-001'), false)

  // ...and it deletes itself. A listed path that is archived, or gone, is a
  // bypass, and the gate says so rather than waiting to be noticed.
  assert.deepEqual(migrationDebt([legacy, current], new Set(['CP-MVP-008'])), [])
  assert.match(
    migrationDebt([{ front: { id: 'CP-MVP-008', status: 'archived' } }], new Set(['CP-MVP-008']))[0],
    /exception is spent — delete the entry/
  )
  assert.match(
    migrationDebt([current], new Set(['CP-MVP-008']))[0],
    /no longer exists — delete the entry/
  )
})
