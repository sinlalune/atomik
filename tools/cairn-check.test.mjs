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
  pathFrontmatterErrors,
  PATH_STALE_DAYS,
  porcelainPaths,
  porcelainMutations,
  readFrontmatter,
  registrationMatches,
  resolveBranch,
  staleRunningPaths,
  stripCode,
  transitionErrors
} from './cairn-check.mjs'

const A_PATH = {
  file: 'atomik-project/coding-paths/CP-MVP-010.md',
  front: {
    id: 'CP-MVP-010',
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
    .some((error) => error.includes('40-character')))
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

test('an inline comment on ceremony: is part of the value, so it declares nothing', () => {
  // The scalar reader takes values verbatim to end of line. This is why the
  // template carries no `# opening | closing` hint on the key itself.
  const commented = readFrontmatter(
    ['---', 'path: CP-MVP-010', 'ceremony: closing   # opening | closing', '---', ''].join('\n')
  ).data

  assert.equal(commented.ceremony, 'closing   # opening | closing')
  assert.equal(ceremonyFromSessions([commented], 'CP-MVP-010'), false)
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
