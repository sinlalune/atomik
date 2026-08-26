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
import { buildHtml, loadArticles } from './cairn-spec-build.mjs'
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

test('cairn-spec: the concept wiki separates borrowed vocabulary from Cairn concepts', () => {
  const index = readFileSync(join(CONCEPTS, 'index.md'), 'utf8')
  assert.match(index, /^## Borrowed vocabulary$/m)
  assert.match(index, /^## Cairn's own concepts$/m)
  assert.ok(
    index.indexOf('## Borrowed vocabulary') < index.indexOf("## Cairn's own concepts")
  )
  const concepts = readdirSync(CONCEPTS)
    .filter((name) => name.endsWith('.md') && name !== 'index.md')
  assert.ok(concepts.length <= 66, 'the concept budget is 66 articles, found ' + concepts.length)
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
    'foundation-path.md'
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
  assert.match(markdown, /protocol role name for the execution plane is `project\/`/)
  assert.match(markdown, /reference tools bind that role to `atomik-project\/`/)
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
    'atomik-project/brainstorm/index.md',
    'atomik-project/sources/index.md',
    'atomik-project/projects/index.md'
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
    'atomik-project/coding-paths/paths.md',
    'atomik-project/coding-paths/ACTIVE.md',
    'atomik-project/coding-paths/history/',
    'atomik-project/sessions/',
    'atomik-project/audits/',
    'atomik-project/briefs/',
    'atomik-project/log/',
    'atomik-project/brainstorm/',
    'atomik-project/sources/',
    'atomik-project/projects/'
  ]) {
    assert.ok(layout.includes(required), 'installed layout omits ' + required)
  }
  assert.match(layout, /This tree is exhaustive for active Cairn-defined files and folder roles/)
  assert.match(layout, /`cairn\.config\.json` is not shown because it is a specified portability\s+target, not an installed reference file/)
  assert.match(layout, /\| execution-state plane \| `atomik-project\/` \| `roots\.project` \|/)
  assert.match(layout, /refs\/cairn\/checkpoints\/<path-id>\/<n>/)

  const operations = readFileSync(OPERATIONS, 'utf8')
  assert.match(operations, /git add atomik-project\/coding-paths\/CP-EXAMPLE-001\.md/)
  assert.doesNotMatch(operations, /git add project\//)
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

test('cairn-spec: the two reading panes are equal, flat peers with restrained glass', () => {
  assert.equal(captures(html, /<section class="article-pane" data-pane="(left|right)"/g).length, 2)
  assert.equal(captures(html, /<div class="article-scroll" tabindex="0" aria-live="(polite)">/g).length, 2)
  assert.match(html, /grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\)/)
  assert.match(html, /\.reading-columns\s*{[\s\S]*?gap: 0;/)
  assert.match(html, /\.reader\s*{[\s\S]*?padding: 0;[\s\S]*?overflow: hidden;/)
  assert.match(html, /\.article-pane\s*{[\s\S]*?min-height: 0;[\s\S]*?overflow: hidden;/)
  assert.match(html, /\.article-scroll\s*{[\s\S]*?height: 100%;[\s\S]*?overflow-y: auto;/)
  assert.match(html, /A link inside either pane opens\s+the linked object in the other pane/)
  assert.match(html, /sourcePane === panes\[0\] \? panes\[1\] : panes\[0\]/)
  assert.match(html, /backdrop-filter: blur\(/)
  assert.doesNotMatch(html, /<aside\b/i)
  assert.doesNotMatch(html, /gradient\s*\(/i)
  assert.doesNotMatch(html, /box-shadow\s*:/i)
})

test('cairn-spec: reader boots both pane states before rendering and routes wiki links', () => {
  const { window, location } = bootReader()
  const left = window.document.querySelector('[data-pane="left"]')
  const right = window.document.querySelector('[data-pane="right"]')
  assert.equal(left.dataset.article, 'specification')
  assert.equal(right.dataset.article, 'concepts')

  const link = left.querySelector('[data-article]')
  const target = link.dataset.article
  link.dispatchEvent(new window.Event('click', { bubbles: true, cancelable: true }))
  assert.equal(right.dataset.article, target)
  assert.equal(right.dataset.active, 'true')
  assert.equal(location.hash, '#read=specification|' + target)
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
test('cairn-spec: v0.2 names the predicate failure mode it hit twice', () => {
  assert.match(markdown, /### Distrust a predicate that asks about a declaration/)
  assert.match(markdown, /A ref moved forward keeps every declared unit\s+resolving/)
  assert.match(markdown, /write the one that can\s+disagree with the record/)
})

test('cairn-spec: the route has a structural backstop, not only declarations', () => {
  assert.match(markdown, /MUST declare\s+> `route: full`/)
  assert.match(markdown, /\*\*having\*\* spanned more than one work unit is a fact in the\s+ledger/)
})
