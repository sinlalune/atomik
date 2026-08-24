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
  areaOf,
  ceremonyFromSessions,
  evaluate,
  globToRegExp,
  isCommitPin,
  isPathBranch,
  matchesAny,
  parseWrites,
  pathFrontmatterErrors,
  porcelainPaths,
  readFrontmatter,
  registrationMatches,
  resolveBranch,
  stripCode
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

const run = (changed, branch, paths = [A_PATH], extra = {}) =>
  evaluate({
    changed,
    branch,
    paths,
    resolveFile: () => true,
    trunkContained: true,
    registrationState: 'registered',
    ceremonyFor: () => true,
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

test('a done path may finish on its own branch when its ceremony is recorded', () => {
  const done = { ...A_PATH, front: { ...A_PATH.front, status: 'done' } }
  const closing = [done.file, 'atomik-project/sessions/cp-mvp-010-closing.md']

  const recorded = run(closing, 'path/cp-mvp-010', [done], {
    ceremonyFor: () => true
  })
  assert.ok(!rules(recorded, 'blocking').includes('branch-path'))
  assert.ok(!rules(recorded, 'blocking').includes('ceremony'))

  const missing = run(closing, 'path/cp-mvp-010', [done], {
    ceremonyFor: () => false
  })
  assert.ok(rules(missing, 'blocking').includes('ceremony'))
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
 * "cannot tell", never as "stale" — a fresh clone or a detached CI checkout
 * must not fail for a reason the author cannot fix.
 */
test('a path branch behind the trunk is blocked; up to date is not', () => {
  const stale = run(['README.md'], 'path/cp-mvp-010', [A_PATH], { trunkContained: false })
  assert.ok(rules(stale, 'blocking').includes('rebase'))

  const fresh = run(['README.md'], 'path/cp-mvp-010', [A_PATH], { trunkContained: true })
  assert.ok(!rules(fresh, 'blocking').includes('rebase'))

  const unknown = run(['README.md'], 'path/cp-mvp-010', [A_PATH], { trunkContained: null })
  assert.ok(!rules(unknown, 'blocking').includes('rebase'))
})

test('the trunk itself is never asked to rebase onto itself', () => {
  const found = run(['README.md'], 'master', [A_PATH], { trunkContained: false })
  assert.ok(!rules(found, 'blocking').includes('rebase'))
})

/**
 * With no integrator, the closing ceremony is the only human guard left
 * before a path merges itself — so a path claiming done must show its note.
 */
test('a path marked done without a ceremony note is blocked', () => {
  const done = { ...A_PATH, front: { ...A_PATH.front, status: 'done' } }
  const closing = [done.file, 'atomik-project/sessions/x.md']

  const missing = run(closing, 'master', [done], { ceremonyFor: () => false })
  assert.ok(rules(missing, 'blocking').includes('ceremony'))

  const recorded = run(closing, 'master', [done], { ceremonyFor: () => true })
  assert.ok(!rules(recorded, 'blocking').includes('ceremony'))
})

test('paths that closed before the rule existed are left alone', () => {
  // Scoped to the change that marks a path done: an old path sitting at
  // `done` in the corpus must not fail a change that never touched it.
  const legacy = { ...A_PATH, front: { ...A_PATH.front, status: 'done' } }
  const found = run(['README.md'], 'master', [legacy], { ceremonyFor: () => false })
  assert.ok(!rules(found, 'blocking').includes('ceremony'))
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

test('porcelain paths survive an unstaged first line', () => {
  // The bug this covers: trimming the whole stdout before slicing eats the
  // leading space of ` M path`, and with it the path's first character —
  // every rule downstream then reads `tomik-project/…` (CP-MVP-010 S01).
  const raw = ' M atomik-project/coding-paths/CP-MVP-010.md\n?? docs/adr/ADR-013.md\nA  apps/desktop/shared/retrieval-core.ts\n'
  assert.deepEqual(porcelainPaths(raw), [
    'atomik-project/coding-paths/CP-MVP-010.md',
    'docs/adr/ADR-013.md',
    'apps/desktop/shared/retrieval-core.ts'
  ])
})

test('porcelain paths: renames report the new path, noise is dropped', () => {
  assert.deepEqual(porcelainPaths('R  docs/old.md -> docs/new.md\n'), ['docs/new.md'])
  assert.deepEqual(porcelainPaths(''), [])
  assert.deepEqual(porcelainPaths('\n\n'), [])
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

test('done with only an opening check on record is blocked', () => {
  const done = { ...A_PATH, front: { ...A_PATH.front, status: 'done' } }
  const sessions = [{ path: 'CP-MVP-010', ceremony: 'opening' }]
  const found = run([done.file], 'path/cp-mvp-010', [done], {
    ceremonyFor: (id) => ceremonyFromSessions(sessions, id)
  })
  assert.ok(rules(found, 'blocking').includes('ceremony'))
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

test('no writes: block, or no frontmatter, declares nothing', () => {
  assert.deepEqual(parseWrites('---\natomik:\n  id: CP-X\n---\n\n- bullet\n'), [])
  assert.deepEqual(parseWrites('# just a document\n\n- bullet\n'), [])
  assert.deepEqual(parseWrites(''), [])
})
