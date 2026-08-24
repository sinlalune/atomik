/**
 * Tests for cairn-rules — `node --test 'tools/**\/*.test.mjs'`.
 *
 * Pins the live rule table generator against drift, missed rules, and
 * malformed Markdown tables.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { extractRules, generateMarkdownTable, RULE_METADATA } from './cairn-rules.mjs'

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
