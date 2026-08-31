/**
 * Executable contract for the canonical Cairn Markdown wiki and its
 * deterministic self-contained HTML projection.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, posix, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseHTML } from 'linkedom'
import { buildHtml, loadArticles, specVersion } from './cairn-spec-build.mjs'
import { extractRules, generateMarkdownTable, tableIn } from './cairn-rules.mjs'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = join(REPO, 'docs/cairn/specification')
const SPEC = join(ROOT, 'index.md')
const CONCEPTS = join(ROOT, 'concepts')
const REFERENCES = join(ROOT, 'reference')
const HTML = join(REPO, 'docs/cairn/specification.html')
const CHECK = join(REPO, 'tools/cairn-check.mjs')
const LAYOUT = join(REFERENCES, 'repository-layout.md')
const OPERATIONS = join(REFERENCES, 'operations.md')

const markdown = readFileSync(SPEC, 'utf8')
const html = readFileSync(HTML, 'utf8')
const checkSource = readFileSync(CHECK, 'utf8')

function captures(source, expression) {
  return [...source.matchAll(expression)].map((match) => match[1])
}

function bootReader(hash = '') {
  const { window } = parseHTML(html)
  const location = { hash }
  const history = {
    replaceState(_state, _title, next) {
      location.hash = next
    }
  }
  const CSS = {
    escape(value) {
      return String(value).replace(/["\\]/g, '\\$&')
    }
  }
  window.HTMLElement.prototype.scrollIntoView = () => {}
  const scripts = captures(html, /<script>([\s\S]*?)<\/script>/g)
  const run = new Function('document', 'history', 'location', 'CSS', 'Event', scripts.at(-1))
  run(window.document, history, location, CSS, window.Event)
  return { window, location }
}

function markdownSources() {
  return [
    ['index.md', SPEC],
    ...readdirSync(CONCEPTS)
      .filter((name) => name.endsWith('.md'))
      .map((name) => [posix.join('concepts', name), join(CONCEPTS, name)]),
    ...readdirSync(REFERENCES)
      .filter((name) => name.endsWith('.md'))
      .map((name) => [posix.join('reference', name), join(REFERENCES, name)])
  ]
}

test('cairn-spec: the canonical route moves from simple durable work to protocol detail', () => {
  const headings = captures(markdown, /^## (.+)$/gm)
  assert.deepEqual(headings, [
    'Begin with work that survives',
    'Put one bounded change on a coding path',
    'Choose the route the change earns',
    'Make progress resumable',
    'Let paths work beside one another',
    'Separate evidence from judgement',
    'Open and register work',
    'Close one exact implementation candidate',
    'Integrate without claiming the future',
    'Keep lifecycle statements truthful',
    'Preserve records without overstating Git',
    'Repair a path that broke protocol',
    'State the trust and enforcement boundary',
    'Deliberate non-goals',
    'Current conformance',
    'Implemented rule catalogue',
    'Continue through the wiki'
  ])
  assert.doesNotMatch(markdown, /^## \d+\./m)
  assert.match(markdown, /This document is the canonical Cairn v0\.2 specification/)
  assert.match(markdown, /^  version: 0\.2$/m)
})

test('cairn-spec: the first complete view introduces formal terms through their articles', () => {
  const overview = markdown.slice(
    markdown.indexOf('### The complete protocol in one view'),
    markdown.indexOf('## Put one bounded change on a coding path')
  )
  for (const target of [
    'opening-acceptance',
    'trunk-registration',
    'branch',
    'worktree',
    'work-unit',
    'remote-checkpoint',
    'rebase',
    'implementation-candidate',
    'coherence-audit',
    'closing-acceptance',
    'administrative-closure',
    'ready-state',
    'integration-transport',
    'done-state'
  ]) {
    assert.match(overview, new RegExp('\\(\\./concepts/' + target + '\\.md\\)'))
  }
  assert.doesNotMatch(overview, /```/)
  assert.match(overview, /In ordinary language/)
})

test('cairn-spec: Cairn remains a team protocol with checkpoint handoff', () => {
  assert.match(markdown, /team of developers and coding\s+agents/)
  assert.match(markdown, /multiple developers and multiple agents per developer/)
  assert.match(markdown, /assigned writer may change at a\s+pushed checkpoint/)
  assert.match(markdown, /authorised participant can then fetch the branch/)
  assert.match(markdown, /Each path remains responsible for carrying its\s+accepted candidate through its declared\s+\[integration transport\]/)
  assert.match(markdown, /does not\s+create a\s+permanent central integrator role/)
  assert.doesNotMatch(markdown, /\bone owner\b/i)
  assert.doesNotMatch(markdown, /contribution branch/i)
})

test('cairn-spec: closure binds audit and acceptance to the final candidate in order', () => {
  const closure = markdown.slice(
    markdown.indexOf('## Close one exact implementation candidate'),
    markdown.indexOf('## Integrate without claiming the future')
  )
  const terms = [
    '[Rebase](./concepts/rebase.md) the path',
    'Commit and push the resulting implementation candidate `C`',
    'Perform a [coherence audit]',
    '### Accept candidate C',
    '### Add only administrative closure'
  ]
  let previous = -1
  for (const term of terms) {
    const at = closure.indexOf(term)
    assert.ok(at > previous, '"' + term + '" must follow the preceding closure stage')
    previous = at
  }
  assert.ok(markdown.indexOf('## Integrate without claiming the future') > previous)
  assert.match(markdown, /subject_commit: [0-9a-f]{40}/)
  assert.match(markdown, /`status`, set to `ready`/)
  assert.match(markdown, /A path branch MUST NOT set itself to `done`/)
  assert.match(markdown, /the dispositions cover exactly the attested set/)
  assert.match(markdown, /advisories_at_candidate/)
  assert.match(markdown, /whatever the checker raises when it evaluates the closure commit `A` — is\s+\*\*unsound\*\*/)
})

test('cairn-spec: critical unknowns fail closed and lifecycle claims are truthful', () => {
  assert.match(markdown, /pass\s+predicate proved\s+fail\s+predicate disproved\s+inconclusive\s+required input unavailable/)
  assert.match(markdown, /both `fail` and `inconclusive` MUST return non-zero/)
  assert.match(markdown, /`blocked` retains its branch and base\s+commit/)
  assert.match(markdown, /`resolution: completed \\?\| abandoned \\?\| superseded`/)
  assert.match(markdown, /Path declarations are retained; they are archived\s+rather than deleted/)
})

test('cairn-spec: trust, protection, and incomplete capabilities are stated narrowly', () => {
  assert.match(markdown, /assumes collaborating writers/)
  assert.match(markdown, /They are not an adversarial\s+security boundary/)
  assert.match(markdown, /MUST NOT claim `protected` unless it has both/)
  for (const gap of [
    'Live-ledger prefix and verbatim-roll proof',
    'Versioned portable configuration and schema migration',
    'Exact protected integration transport',
    'Independently protected control plane',
    'Transactional `init`, `new`, and `close` commands',
    'Checkpoint retention refs before any rewriting push',
    'Marked provisional commits excluded from candidate identity',
    'Handoff-brief field schema and answerable-alone contract',
    'Field-level administrative closure surface',
    'Scope digest recorded at opening and re-verified at closing',
    'Candidate base `T` and the acceptance-drift predicate',
    'Structured `advisory_disposition` matching findings at `C`',
    'Recorded roles and the collapsed-actor advisory',
    '`scope-drift` blocking unless the declaration moves in the same commit',
    'Typed work units keyed to their required parts',
    '`lightweight` default route and one-way escalation',
    '`foundation` and adoption routes',
    'Repair procedures for protocol violations',
    'Redaction ceremony',
    'Emergency path',
    'Cold-resume pilot'
  ]) {
    assert.ok(markdown.includes(gap), 'missing visible conformance gap: ' + gap)
  }
  assert.match(markdown, /not yet a general-purpose merge, governance, or security\s+>\s*system/)
})

test('cairn-spec: v0.2 closes the retention, provisional, and brief promises', () => {
  assert.match(markdown, /refs\/cairn\/checkpoints\/<path-id>\/<n>/)
  assert.match(
    markdown,
    /Before any rewriting push of a path branch, every commit the ledger names MUST\s+already be reachable from a retention ref/
  )
  assert.match(markdown, /forbid rewriting pushes on path branches entirely/)
  assert.match(markdown, /Cairn-Provisional: <reason>/)
  assert.match(markdown, /MUST NOT be left only in a\s+\[working tree\]/)
  assert.match(markdown, /Provisional commits are excluded from candidate identity/)
  for (const field of [
    'checkpoint_pushed',
    'base_commit',
    'trunk_seen',
    'governs',
    'verify',
    'budget_tokens'
  ]) {
    assert.ok(markdown.includes(field), 'brief frontmatter omits ' + field)
  }
  assert.match(markdown, /seven capped sections/)
  assert.match(markdown, /the brief has failed\*\*/)
  assert.match(markdown, /\*\*cold resume\*\*/)
})

test('cairn-spec: records bind scope, base, roles, and every advisory', () => {
  assert.match(markdown, /scope_digest: sha256:/)
  assert.match(markdown, /MUST equal the digest\s+recorded at opening/)
  assert.match(markdown, /accepted_roles:/)
  assert.match(markdown, /advisory_disposition:\n\s+- rule:/)
  assert.match(markdown, /disposition: (?:accepted|fixed|deferred)/)
  assert.match(markdown, /`A` is restricted \*\*field by field\*\*, not file by file/)
  assert.match(markdown, /Drift predicate/)
  assert.match(markdown, /It MUST NOT be `T' == T`/)
  assert.match(markdown, /union of the path's `writes:` and\s+> `governs:` declarations/)
})

test('cairn-spec: routes, repair, and non-goals are specified rather than implied', () => {
  const routes = markdown.slice(
    markdown.indexOf('## Choose the route the change earns'),
    markdown.indexOf('## Make progress resumable')
  )
  assert.match(routes, /### `lightweight` — the default/)
  assert.match(routes, /### `full` — required, not merely available/)
  assert.match(routes, /### `foundation` — the repository's own first hour/)
  assert.match(routes, /adoption path/)
  assert.match(routes, /Escalation is one-way/)
  assert.match(routes, /MUST NOT\s+declare itself down a route/)

  const repair = markdown.slice(
    markdown.indexOf('## Repair a path that broke protocol'),
    markdown.indexOf('## State the trust and enforcement boundary')
  )
  assert.match(repair, /`type: repair`/)
  assert.match(repair, /MUST NOT be the same work unit as the work that caused it/)

  const nonGoals = markdown.slice(
    markdown.indexOf('## Deliberate non-goals'),
    markdown.indexOf('## Current conformance')
  )
  for (const nonGoal of [
    'Requiring `T\' == T` at integration',
    'Defending against an authorised writer',
    'Resolving semantic conflicts',
    'Undoing disclosure',
    'Specifying the emergency route'
  ]) {
    assert.ok(nonGoals.includes(nonGoal), 'missing stated non-goal: ' + nonGoal)
  }
})

test('cairn-spec: identity is object-format agnostic and the lifecycle table is reconciled', () => {
  assert.match(markdown, /full object id in the\s+repository's configured object format/)
  assert.match(markdown, /SHA-256 produces\s+sixty-four/)
  assert.doesNotMatch(markdown, /MUST be all 40 hexadecimal characters/)
  const table = markdown.slice(
    markdown.indexOf('Allowed transitions are:'),
    markdown.indexOf('Three edges deserve their reasons stated')
  )
  assert.match(table, /ready\s+→ running \| blocked \| done/)
  assert.doesNotMatch(table, /archived → archived/)
  assert.match(markdown, /\*\*`ready → blocked` exists\.\*\*/)
  assert.match(markdown, /\*\*`blocked → ready` does not exist\.\*\*/)
  assert.match(markdown, /\*\*`archived → archived` is not a transition\.\*\*/)
})

test('cairn-spec: the answerable-alone contract constrains context, not file count', () => {
  const brief = readFileSync(join(REFERENCES, 'handoff-brief.md'), 'utf8')
  const concept = readFileSync(join(CONCEPTS, 'handoff.md'), 'utf8')

  // The old wording said "AGENTS.md and the brief — no ledger". That is not what
  // the entry route does: AGENTS.md leads to the convention, the live view, the
  // path record and its ledger. "Alone" is about undurable context.
  for (const [name, source] of [['spec', markdown], ['reference', brief], ['concept', concept]]) {
    assert.doesNotMatch(source, /no ledger, no conversation/, name + ' still forbids the ledger')
    assert.match(source, /no\s+conversation,\s+no\s+prior\s+session/, name + ' must still exclude undurable context')
    assert.match(
      source, /in (?:the|this) brief(?: itself)?, or in a record\s+(?:the|this) brief\s+names at an exact\s+object id/,
      name + ' must permit records the brief names at an exact id'
    )
  }

  // Both failure modes, not one. The old text named only the thick one.
  assert.match(markdown, /##### Two failure modes, not one/)
  assert.match(markdown, /\*\*too thin\*\*/)
  assert.match(markdown, /\*\*too thick\*\*/)
  assert.match(brief, /It can fail in either direction/)

  // The objective is deliberately absent from the frontmatter; say so where a
  // reader would otherwise read the omission as an oversight.
  assert.match(markdown, /##### Why the objective is not in the frontmatter/)
  assert.match(brief, /no objective field in the frontmatter/)
  assert.doesNotMatch(brief, /^\| `objective` \|/m)

  // A cold-resume trial withholds context, not records.
  assert.match(markdown, /MAY open any record the brief names/)
  assert.match(brief, /MUST allow the participant to open any record the brief names/)
})

test('cairn-spec: the blob object id is explained where it is first demanded', () => {
  const index = markdown.indexOf('git rev-parse HEAD:docs/architecture/example.md')
  assert.ok(index > -1, 'the pin command must appear in the canonical prose')
  assert.match(markdown, /Git stores a\s+file's bytes as an object of their own, called a \*blob\*/)
  assert.match(markdown, /the `<commit>:<path>` form, which\nmeans "the object at this path, as of this commit"/)
  // A command with no shown output teaches nothing about what it produces.
  assert.match(markdown, /\$ git rev-parse HEAD:docs\/architecture\/example\.md\n[0-9a-f]{40}\n/)
  assert.match(markdown, /\$ git show [0-9a-f]{40}/)
})

test('cairn-spec: route is its own concept, not an alias for the default route', () => {
  const route = readFileSync(join(CONCEPTS, 'route.md'), 'utf8')
  assert.match(route, /^# Route$/m)
  for (const named of ['lightweight', '`full`', 'foundation', '`emergency`']) {
    assert.ok(route.includes(named), 'route.md omits ' + named)
  }
  assert.match(route, /Escalation is one-way/)
  // Every [route] link points at the field, not at one of the routes it names.
  for (const [name, source] of [
    ['spec', markdown],
    ['path-record', readFileSync(join(CONCEPTS, 'path-record.md'), 'utf8')]
  ]) {
    assert.doesNotMatch(source, /\[route\]\(\.[^)]*lightweight-path\.md\)/, name)
    assert.match(source, /\[route\]\(\.[^)]*route\.md\)/, name)
  }
})

test('cairn-spec: the concept wiki separates borrowed vocabulary from Cairn concepts', () => {
  const index = readFileSync(join(CONCEPTS, 'index.md'), 'utf8')
  assert.match(index, /^## Borrowed vocabulary$/m)
  assert.match(index, /^## Cairn's own concepts$/m)
  assert.ok(
    index.indexOf('## Borrowed vocabulary') < index.indexOf("## Cairn's own concepts")
  )
  const concepts = readdirSync(CONCEPTS)
    .filter((name) => name.endsWith('.md') && name !== 'index.md')
  assert.ok(concepts.length <= 71, 'the concept budget is 71 articles, found ' + concepts.length)
  for (const borrowed of ['git.md', 'rebase.md', 'merge.md', 'test.md', 'schema.md']) {
    assert.ok(concepts.includes(borrowed))
  }
  for (const gone of ['file.md', 'markdown.md', 'fetch.md', 'push.md', 'working-tree.md']) {
    assert.equal(existsSync(join(CONCEPTS, gone)), false, gone + ' was merged, not kept')
  }
  for (const added of [
    'checkpoint-retention.md',
    'provisional-commit.md',
    'scope-digest.md',
    'acceptance-drift.md',
    'foundation-path.md',
    'route.md',
    'proxy-predicate.md',
    'unsound-gate.md',
    'adversarial-fixture.md',
    'gate-parity.md'
  ]) {
    assert.ok(concepts.includes(added), 'v0.2 concept missing: ' + added)
  }
})

test('cairn-spec: canonical prose is history-free and distinguishes roles from bindings', () => {
  assert.doesNotMatch(markdown, /CP-(?:OPS|MVP)-/)
  assert.doesNotMatch(markdown, /external (?:review|reviewer)|past (?:issue|project)|earlier version/i)
  assert.match(markdown, /project\/coding-paths\/CP-<ID>\.md/)
  assert.match(markdown, /cairn:\n\s+id: CP-EXAMPLE-001/)
  assert.match(markdown, /project\/audits\/cp-example-001-[0-9a-f]{40}\.md/)
  // The canonical prose uses role names only. Every host-repository binding
  // lives in exactly one table, in the layout reference — a specification that
  // repeats one adoption's folder names through its examples is teaching that
  // adoption rather than the protocol.
  assert.match(markdown, /are\s+\*\*role names\*\*, not required folder names/)
  assert.match(markdown, /installed binding table\]\(\.\/reference\/repository-layout\.md#portable-roles-and-installed-names\)/)
  assert.doesNotMatch(markdown, /atomik/i)
  for (const article of readdirSync(CONCEPTS).filter((name) => name.endsWith('.md'))) {
    assert.doesNotMatch(
      readFileSync(join(CONCEPTS, article), 'utf8'), /atomik/i,
      article + ' repeats a host repository binding; only the layout table may'
    )
  }
})

test('cairn-spec: repository reference exhaustively maps the installed Cairn structure', () => {
  const layout = readFileSync(LAYOUT, 'utf8')
  for (const installed of [
    'AGENTS.md',
    'package.json',
    '.github/workflows/cairn.yml',
    'tools/cairn-check.mjs',
    'tools/cairn-active.mjs',
    'tools/cairn-audit.mjs',
    'tools/cairn-rules.mjs',
    'tools/cairn-spec-build.mjs',
    'docs/bedrock/index.md',
    'docs/adr/index.md',
    'docs/modules/index.md',
    'docs/cairn/specification/index.md',
    'docs/cairn/specification.html',
    'atomik-project/index.md',
    'atomik-project/coding-paths/paths.md',
    'atomik-project/coding-paths/ACTIVE.md',
    'atomik-project/coding-paths/history/index.md',
    'atomik-project/sessions/index.md',
    'atomik-project/audits/index.md',
    'atomik-project/briefs/index.md',
    'atomik-project/log/index.md',
    'atomik-project/brainstorm/index.md'
  ]) {
    assert.ok(existsSync(join(REPO, installed)), 'reference binding is missing ' + installed)
  }
  for (const required of [
    '.github/workflows/cairn.yml',
    'tools/cairn-check.mjs',
    'tools/cairn-active.mjs',
    'tools/cairn-audit.mjs',
    'tools/cairn-rules.mjs',
    'tools/cairn-spec-build.mjs',
    'docs/bedrock/',
    'docs/adr/',
    'docs/modules/',
    'docs/cairn/specification/index.md',
    'docs/cairn/specification.html',
    'project/coding-paths/paths.md',
    'project/coding-paths/ACTIVE.md',
    'project/coding-paths/history/',
    'project/sessions/',
    'project/audits/',
    'project/briefs/',
    'project/log/',
    'project/brainstorm/'
  ]) {
    assert.ok(layout.includes(required), 'installed layout omits ' + required)
  }
  // Two Cairn objects are refs, not files, so no directory listing shows them.
  // The tree names them or a reader concludes they do not exist.
  assert.match(layout, /refs\/\n│\s+├── heads\//)
  assert.match(layout, /└── cairn\/\n│\s+└── checkpoints\//)
  assert.match(layout, /refs\/cairn\/checkpoints\/<path-id>\/<n>/)
  assert.match(layout, /git for-each-ref refs\/cairn\/checkpoints/)

  // Host-repository residue is not protocol structure and must stay out.
  assert.doesNotMatch(layout, /sources\/|projects\/|frozen compatibility archive/)

  assert.match(layout, /This tree is exhaustive for active Cairn-defined files, folder roles, and refs/)
  assert.match(layout, /`cairn\.config\.json` is not shown because it is a specified portability\s+target, not an installed reference file/)
  // The one sanctioned mention of the host binding, and the only one.
  assert.match(layout, /\| execution-state plane \| `project\/` \| \*\*`atomik-project\/`\*\* \| `roots\.project` \|/)
  assert.equal(layout.match(/atomik/gi).length, 2)

  const operations = readFileSync(OPERATIONS, 'utf8')
  assert.match(operations, /git add project\/coding-paths\/CP-EXAMPLE-001\.md/)
  assert.doesNotMatch(operations, /atomik/i)
})

test('cairn-spec: each concept is one indexed Markdown article', () => {
  const files = readdirSync(CONCEPTS).filter((name) => name.endsWith('.md')).sort()
  const concepts = files.filter((name) => name !== 'index.md')
  assert.ok(concepts.length >= 50, 'the wiki must cover the complete specialist vocabulary')
  const index = readFileSync(join(CONCEPTS, 'index.md'), 'utf8')

  for (const name of concepts) {
    const source = readFileSync(join(CONCEPTS, name), 'utf8')
    assert.match(source, /^type: Cairn Concept$/m, name + ' must identify one concept article')
    assert.equal(captures(source, /^# (.+)$/gm).length, 1, name + ' must have one article title')
    const escaped = name.replace('.', '\\.')
    assert.match(index, new RegExp('\\(\\./' + escaped + '\\)'), name + ' is absent from the index')
  }
  assert.equal(existsSync(join(ROOT, 'foundations')), false)
  assert.equal(existsSync(join(REFERENCES, 'glossary.md')), false)
})

test('cairn-spec: every relative Markdown link resolves to a real file', () => {
  for (const [relativeFile, absoluteFile] of markdownSources()) {
    const source = readFileSync(absoluteFile, 'utf8').replace(/```[\s\S]*?```/g, '')
    for (const href of captures(source, /\[[^\]]+\]\(([^)]+)\)/g)) {
      if (/^(?:https?:|mailto:|#)/.test(href)) continue
      const target = href.split('#')[0]
      const resolved = resolve(dirname(absoluteFile), target)
      assert.ok(existsSync(resolved), relativeFile + ' links to missing ' + href)
    }
  }
})

test('cairn-spec: the generated catalogue equals the checker source', () => {
  assert.equal(tableIn(markdown), generateMarkdownTable(checkSource).trim())
})

test('cairn-spec: HTML embeds every Markdown article exactly once as a template', () => {
  const expected = loadArticles().map((article) => article.id).sort()
  const embedded = captures(html, /data-article-template="([a-z0-9-]+)"/g)
  assert.equal(embedded.length, new Set(embedded).size)
  assert.deepEqual([...embedded].sort(), expected)
})

test('cairn-spec: every wiki and tree target resolves to an embedded article', () => {
  const supplied = new Set(captures(html, /data-article-template="([a-z0-9-]+)"/g))
  const wikiTargets = new Set(captures(html, /data-article="([a-z0-9-]+)"/g))
  const treeTargets = new Set(captures(html, /data-tree-article="([a-z0-9-]+)"/g))
  assert.deepEqual([...wikiTargets].sort(), [...supplied].sort())
  assert.deepEqual([...treeTargets].sort(), [...supplied].sort())
  assert.doesNotMatch(html, /href="#current-conformance"/)
  assert.match(html, /data-local-anchor="current-conformance"/)
})

test('cairn-spec: the specification pane is fixed and the reading pane carries history', () => {
  assert.equal(captures(html, /<section class="article-pane" data-pane="(left|right)"/g).length, 2)
  assert.match(html, /grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\)/)
  assert.match(html, /\.reading-columns\s*{[\s\S]*?gap: 0;/)
  assert.match(html, /\.reader\s*{[\s\S]*?padding: 0;[\s\S]*?overflow: hidden;/)
  assert.match(html, /\.article-pane\s*{[\s\S]*?min-height: 0;[\s\S]*?overflow: hidden;/)
  assert.match(html, /\.article-scroll\s*{[\s\S]*?height: 100%;[\s\S]*?overflow-y: auto;/)

  // The left pane never navigates, so it carries no history controls; the right
  // pane is the only destination, so links no longer alternate between panes.
  assert.match(html, /The left pane holds the full specification and stays there/)
  assert.equal(captures(html, /<button type="button" data-history="(back)"/g).length, 1)
  assert.match(html, /<header class="pane-toolbar is-static">\s*\n\s*<h2 class="pane-title">/)
  assert.doesNotMatch(html, /sourcePane === panes\[0\]/)

  // Pane A / Pane B were scaffolding for an active-pane model that is gone.
  assert.doesNotMatch(html, /Pane [AB]|pane-mark|data-active/)

  // Current state reads as a subtle fill, never as an extra rule line stacked
  // on top of the one separator the layout already has.
  const current = html.match(/\.tree-group a\[aria-current="page"\] {[^}]*}/)[0]
  assert.match(current, /background: var\(--tint\)/)
  assert.doesNotMatch(current, /border/)
  assert.doesNotMatch(html, /border-left-color: var\(--link\)/)
  assert.doesNotMatch(html, /border-top-color: var\(--link\)/)

  // Modern, but still flat: radii and a contemporary stack, no shadows, no
  // gradients, and glass kept to the two chrome surfaces it already had.
  assert.match(html, /--r-sm: \.375rem;/)
  for (const rounded of ['.tree-search', '.article-body pre', '.article-body table']) {
    const rule = html.match(new RegExp(rounded.replace(/[.]/g, '\\$&') + ' {[^}]*}'))[0]
    assert.match(rule, /border-radius: var\(--r-/, rounded + ' must be rounded')
  }
  assert.match(html, /--sans: "Inter var", Inter, ui-sans-serif, system-ui/)
  assert.match(html, /--mono: ui-monospace/)
  // One face for prose and display: the serif stack fell back to a dated face
  // on any machine without it, which is the opposite of the intent.
  assert.doesNotMatch(html, /--serif|font-family: var\(--serif\)/)
  const heading = html.match(/\.article-body h1 {[^}]*}/)[0]
  assert.doesNotMatch(heading, /font-family/)
  // The glyph sat on its baseline inside a fixed-size box.
  const control = html.match(/\.pane-toolbar button {[^}]*}/)[0]
  assert.match(control, /display: inline-flex;[\s\S]*align-items: center;/)
  assert.match(html, /backdrop-filter: blur\(/)
  assert.doesNotMatch(html, /<aside\b/i)
  assert.doesNotMatch(html, /gradient\s*\(/i)
  assert.doesNotMatch(html, /box-shadow\s*:/i)
})

test('cairn-spec: the edition label is read from the specification, not hard-coded', () => {
  const version = specVersion()
  assert.match(markdown, new RegExp('^\\s+version: ' + version + '$', 'm'))
  assert.ok(html.includes('<span class="edition">v' + version + ' · universal edition</span>'))
  assert.ok(html.includes('content="Cairn v' + version + ' —'))
})

test('cairn-spec: the reading pane receives every link and the left pane keeps the spec', () => {
  const { window, location } = bootReader()
  const left = window.document.querySelector('[data-pane="left"]')
  const right = window.document.querySelector('[data-pane="right"]')
  assert.equal(left.dataset.article, 'specification')
  assert.equal(right.dataset.article, 'concepts')

  // A wiki link inside the specification opens on the right, as before.
  const fromSpec = left.querySelector('[data-article]')
  fromSpec.dispatchEvent(new window.Event('click', { bubbles: true, cancelable: true }))
  assert.equal(right.dataset.article, fromSpec.dataset.article)
  assert.equal(location.hash, '#article-' + fromSpec.dataset.article)

  // A wiki link inside the right pane stays on the right; under the old
  // alternating model it would have evicted the specification.
  const fromReader = [...right.querySelectorAll('[data-article]')]
    .find((node) => node.dataset.article !== 'specification')
  const onward = fromReader.dataset.article
  fromReader.dispatchEvent(new window.Event('click', { bubbles: true, cancelable: true }))
  assert.equal(right.dataset.article, onward)
  assert.equal(left.dataset.article, 'specification')

  // And the tree opens on the right too, with no pane to select first.
  const treeLink = window.document.querySelector('[data-tree-article="concept-git"]')
  treeLink.dispatchEvent(new window.Event('click', { bubbles: true, cancelable: true }))
  assert.equal(right.dataset.article, 'concept-git')
  assert.equal(left.dataset.article, 'specification')

  // The specification's own tree entry scrolls the left pane rather than
  // opening a second copy of it on the right.
  const specEntry = window.document.querySelector('[data-tree-article="specification"]')
  specEntry.dispatchEvent(new window.Event('click', { bubbles: true, cancelable: true }))
  assert.equal(right.dataset.article, 'concept-git')
  assert.equal(left.dataset.article, 'specification')
})

test('cairn-spec: the history buttons walk the reading pane back and forward', () => {
  const { window } = bootReader()
  const right = window.document.querySelector('[data-pane="right"]')
  const back = right.querySelector('[data-history="back"]')
  const forward = right.querySelector('[data-history="forward"]')
  const click = (node) =>
    node.dispatchEvent(new window.Event('click', { bubbles: true, cancelable: true }))

  assert.equal(right.dataset.article, 'concepts')
  assert.equal(back.disabled, true)
  assert.equal(forward.disabled, true)

  const first = window.document.querySelector('[data-tree-article="concept-git"]')
  click(first)
  const second = window.document.querySelector('[data-tree-article="concept-merge"]')
  click(second)
  assert.equal(right.dataset.article, 'concept-merge')
  assert.equal(back.disabled, false)

  // Each pane carries data-article to say what it is showing. A bare
  // [data-article] lookup walks up to the pane and swallows every click inside
  // it, so the button used to re-render the current article instead of moving.
  click(back)
  assert.equal(right.dataset.article, 'concept-git')
  assert.equal(forward.disabled, false)
  click(back)
  assert.equal(right.dataset.article, 'concepts')
  assert.equal(back.disabled, true)
  click(forward)
  assert.equal(right.dataset.article, 'concept-git')
  click(forward)
  assert.equal(right.dataset.article, 'concept-merge')
  assert.equal(forward.disabled, true)
})

test('cairn-spec: a direct wiki article URL opens that object in the right pane', () => {
  const { window } = bootReader('#article-concept-commit')
  assert.equal(
    window.document.querySelector('[data-pane="right"]').dataset.article,
    'concept-commit'
  )
})

test('cairn-spec: the HTML rule catalogue names every implemented rule', () => {
  const implemented = extractRules(checkSource)
    .map((rule) => rule.level + ':' + rule.name)
    .sort()
  const template = html.match(
    /<template id="template-specification"[\s\S]*?>([\s\S]*?)<\/template>/
  )?.[1]
  assert.ok(template)
  const rendered = [...template.matchAll(
    /<tr data-rule="([a-z-]+)" data-level="(blocking|advisory)">/g
  )].map((match) => match[2] + ':' + match[1]).sort()
  assert.equal(rendered.length, new Set(rendered).size)
  assert.deepEqual(rendered, implemented)
})

test('cairn-spec: the universal edition is self-contained and deterministic', () => {
  assert.equal(buildHtml(), html)
  assert.match(html, /<nav class="tree-panel" aria-label="Article tree">/)
  assert.match(html, /<noscript>/)
  assert.doesNotMatch(html, /<script\s+[^>]*src=/i)
  assert.doesNotMatch(html, /<link\s+[^>]*rel=["']stylesheet/i)
  assert.doesNotMatch(html, /<img\s+[^>]*src=["']https?:/i)
})

test('cairn-spec: every inline script parses as JavaScript', () => {
  const scripts = captures(html, /<script>([\s\S]*?)<\/script>/g)
  assert.ok(scripts.length >= 2)
  for (const script of scripts) assert.doesNotThrow(() => new Function(script))
})
test('cairn-spec: v0.2 names the predicate failure mode it kept hitting', () => {
  assert.match(markdown, /#### The declaration and the fact/)
  assert.match(markdown, /A ref moved forward keeps every declared unit\s+resolving/)
  assert.match(markdown, /write the one that can\s+disagree with the record/)
})

test('cairn-spec: the rule-soundness directive states all four requirements', () => {
  assert.match(markdown, /### Prove that the gate can fail/)
  // The observation the directive rests on: the errors all lean one way.
  assert.match(markdown, /Not one rule was too\s+strict\./)
  for (const requirement of [
    /\*\*1\. Every blocking rule MUST have a fixture it rejects\.\*\*/,
    /\*\*2\. A predicate MUST NOT branch on a value that varies with where it runs\.\*\*/,
    /\*\*3\. When a predicate can be written to ask about a declaration or about a[\s>]+fact, it MUST ask about the fact\.\*\*/,
    /\*\*4\. A stated requirement with no predicate MUST be listed as unenforced\.\*\*/
  ]) {
    assert.match(markdown, requirement)
  }
  // Each requirement is taught by one concept article, linked from the directive.
  for (const concept of [
    'proxy-predicate', 'unsound-gate', 'adversarial-fixture', 'gate-parity'
  ]) {
    assert.match(markdown, new RegExp('\\./concepts/' + concept + '\\.md'), concept)
  }
})

test('cairn-spec: every new requirement carries its own conformance row', () => {
  // The specification's own promise: "Every requirement below appears as one row
  // of the conformance matrix." A directive with no row is the failure mode the
  // directive's fourth requirement is about.
  //
  // The row must EXIST and must state a status in the vocabulary. It must not
  // pin one particular status: these requirements are being implemented, and a
  // test that hard-codes "not implemented" turns every honest status update into
  // a test edit — which teaches the editor to change the test rather than to
  // check the claim. What the matrix owes is a visible status per requirement,
  // not a permanently pessimistic one.
  const matrix = markdown.slice(markdown.indexOf('## Current conformance'))
  const STATUS = String.raw`(?:implemented|\*\*(?:not implemented|partially implemented)[^|]*\*\*)`
  for (const capability of [
    'An adversarial fixture per blocking rule',
    'No predicate branches on a value that varies by execution context',
    'Local and CI invocations of one gate reach the same verdict',
    'Every stated requirement is enforced or listed as unenforced',
    'Merge-time journal entry, one file per integrated outcome'
  ]) {
    const escaped = capability.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    assert.match(matrix, new RegExp(`\\| ${escaped} \\| required \\| ${STATUS}`), capability)
  }
})

test('cairn-spec: the route has a structural backstop, not only declarations', () => {
  assert.match(markdown, /MUST declare\s+> `route: full`/)
  assert.match(markdown, /\*\*having\*\* spanned more than one work unit is a fact in the\s+ledger/)
})
