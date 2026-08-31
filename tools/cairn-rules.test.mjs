/**
 * Tests for cairn-rules — `node --test 'tools/**\/*.test.mjs'`.
 *
 * Pins the live rule table generator against drift, missed rules, and
 * malformed Markdown tables.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  extractRules,
  generateMarkdownTable,
  RULE_METADATA,
  SPEC_FILE,
  spliceTable,
  TABLE_BEGIN,
  TABLE_END,
  tableIn
} from './cairn-rules.mjs'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const MOCK_SOURCE = `
function evaluate() {
  add('blocking', 'branch-path', 'error message')
  add('advisory', 'scope-drift', 'warning message')
  add('blocking', 'invented-rule', 'new rule')
}
function corpusFindings() {
  findings.push({ level: 'blocking', rule: 'schema', message: 'schema error' })
}
`

test('cairn-rules: extracts rules from evaluate and corpusFindings', () => {
  const rules = extractRules(MOCK_SOURCE)
  assert.deepEqual(rules, [
    { name: 'branch-path', level: 'blocking', scope: 'diff' },
    { name: 'scope-drift', level: 'advisory', scope: 'diff' },
    { name: 'invented-rule', level: 'blocking', scope: 'diff' },
    { name: 'schema', level: 'blocking', scope: 'corpus' }
  ])
})

test('cairn-rules: a rule present in source but absent in metadata emits TBD, not dropped', () => {
  const table = generateMarkdownTable(MOCK_SOURCE)
  assert.match(table, /`invented-rule`/)
  assert.match(table, /\|\s*\*\*Blocking\*\*\s*\|\s*`invented-rule`\s*\|\s*diff\s*\|\s*TBD\s*\|\s*`TBD`\s*\|/)
})

test('cairn-rules: a rule removed from source disappears from the table', () => {
  const table = generateMarkdownTable(`function evaluate() { add('blocking', 'branch-path', 'msg') }`)
  assert.match(table, /`branch-path`/)
  assert.doesNotMatch(table, /`scope-drift`/)
  assert.doesNotMatch(table, /`schema`/)
})

test('cairn-rules: emitted table rows have exact 5 columns and no unescaped inner pipes', () => {
  const mockWithPipes = `
  function evaluate() {
    add('advisory', 'pipe-rule', 'msg')
  }
  `
  RULE_METADATA['pipe-rule'] = {
    condition: 'A | B option',
    enforcing: "x === 'a' || 'b'"
  }
  const table = generateMarkdownTable(mockWithPipes)
  const rows = table.trim().split('\n').slice(2) // skip header and separator
  for (const row of rows) {
    // Escaped pipes \| must not count as column separators
    const unescapedPipeCount = (row.replace(/\\\|/g, '').match(/\|/g) || []).length
    assert.equal(unescapedPipeCount, 6, `Row must have 5 columns (6 delimiter pipes): ${row}`)
  }
  delete RULE_METADATA['pipe-rule']
})


/* ------------------------------------------------------------------ *
 * The shipped canonical specification must carry the GENERATED catalogue
 *
 * A rule table written by hand is how a document comes to list checks that
 * do not exist — round 3's register recorded exactly that (`ledger-size`
 * listed as live while no code implemented it). Generating it removes the
 * possibility; testing the SHIPPED file removes the possibility of forgetting
 * to regenerate. This is the same defence that makes the ceremony template in
 * bedrock 24 executable: documentation a test can read cannot quietly drift.
 * ------------------------------------------------------------------ */

test('cairn-rules: the canonical specification ships the current catalogue', () => {
  const doc = readFileSync(join(REPO, SPEC_FILE), 'utf8')
  const shipped = tableIn(doc)
  assert.ok(shipped, `${SPEC_FILE} has no ${TABLE_BEGIN} / ${TABLE_END} splice point`)
  const current = generateMarkdownTable(readFileSync(join(REPO, 'tools/cairn-check.mjs'), 'utf8'))
  assert.equal(
    shipped,
    current.trim(),
    `${SPEC_FILE} is out of date — run \`node tools/cairn-rules.mjs --write\``
  )
})

test('cairn-rules: splicing replaces only what is between the markers', () => {
  const doc = `before\n${TABLE_BEGIN}\nold table\n${TABLE_END}\nafter\n`
  const out = spliceTable(doc, 'new table')
  assert.equal(out, `before\n${TABLE_BEGIN}\nnew table\n${TABLE_END}\nafter\n`)
  assert.equal(tableIn(out), 'new table')
  // a document with no splice point is an ERROR, never a silent append: a
  // catalogue written somewhere the reader is not looking is worse than none
  assert.throws(() => spliceTable('no markers here', 'x'), /splice point/)
  assert.equal(tableIn('no markers here'), null)
})

/**
 * ADVERSARIAL FIXTURE — the catalogue must see a level it has to compute.
 *
 * The extractor matched only a literal level, so five rules that emit advisory
 * findings for grandfathered paths were published as blocking-only. The test
 * that guards the catalogue passed throughout, because it compared the
 * catalogue against this same extraction rather than against behaviour. This
 * fixture asserts the shape that was invisible.
 */
test('cairn-rules: a conditional level yields BOTH levels, not the literal one', () => {
  const source = `
    add(exempt ? 'advisory' : 'blocking', 'scope-digest', 'x')
    add(legacyRecord ? 'advisory' : 'blocking', 'acceptance', 'y')
    add('blocking', 'rebase', 'z')
  `
  const rules = extractRules(source)
  const levels = (name) => rules.filter((r) => r.name === name).map((r) => r.level).sort()

  assert.deepEqual(levels('scope-digest'), ['advisory', 'blocking'])
  assert.deepEqual(levels('acceptance'), ['advisory', 'blocking'])
  // A genuinely single-level rule must not gain a phantom second level.
  assert.deepEqual(levels('rebase'), ['blocking'])
})
