/**
 * Executable contract for the canonical Cairn specification project and its
 * self-contained HTML edition.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractRules } from './cairn-rules.mjs'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SPEC = join(REPO, 'docs/cairn/specification/index.md')
const HTML = join(REPO, 'docs/cairn/specification.html')
const CHECK = join(REPO, 'tools/cairn-check.mjs')

const markdown = readFileSync(SPEC, 'utf8')
const html = readFileSync(HTML, 'utf8')

function captures(source, expression) {
  return [...source.matchAll(expression)].map((match) => match[1])
}

test('cairn-spec: the canonical document reads top down from big picture to implementation', () => {
  const headings = captures(markdown, /^## (\d+\. .+)$/gm)
  assert.deepEqual(headings.slice(0, 5), [
    '1. The big picture',
    '2. The project model',
    '3. The coding path',
    '4. Lifecycle',
    '5. Opening a path'
  ])
  assert.ok(headings.includes('10. Enforcement model'))
  assert.ok(headings.includes('13. Rule catalogue'))
})

test('cairn-spec: canonical prose uses portable protocol names, not this checkout binding', () => {
  assert.doesNotMatch(markdown, /atomik-project\//)
  assert.doesNotMatch(markdown, /CP-(?:OPS|MVP)-/)
  assert.doesNotMatch(markdown, /this repository(?:'s)? (?:failure|incident|issue)/i)
  assert.doesNotMatch(html, /earlier Cairn page|CP-(?:OPS|MVP)-/i)
  assert.match(markdown, /project\/coding-paths\/CP-<ID>\.md/)
  assert.match(markdown, /cairn:\n\s+id: CP-EXAMPLE-001/)
})

test('cairn-spec: every contextual HTML link resolves to one embedded note', () => {
  const requested = new Set(captures(html, /data-note="([a-z0-9-]+)"/g))
  const supplied = new Set(captures(html, /class="foundation-card" id="([a-z0-9-]+)"/g))
  assert.deepEqual([...requested].sort(), [...supplied].sort())
})

test('cairn-spec: every tree chapter target exists and is observable', () => {
  const requested = new Set(captures(html, /data-section-link="([a-z0-9-]+)"/g))
  const supplied = new Set(captures(html, /id="([a-z0-9-]+)" data-section/g))
  assert.deepEqual([...requested].sort(), [...supplied].sort())
})

test('cairn-spec: the HTML rule catalogue names every implemented rule exactly once', () => {
  const implemented = new Set(extractRules(readFileSync(CHECK, 'utf8')).map((rule) => rule.name))
  const rendered = captures(html, /<tr data-rule="([a-z-]+)">/g)
  assert.equal(rendered.length, new Set(rendered).size, 'HTML has duplicate rule rows')
  assert.deepEqual([...new Set(rendered)].sort(), [...implemented].sort())
})

test('cairn-spec: the universal edition is self-contained and exposes all three panes', () => {
  assert.match(html, /<nav class="tree-scroll" aria-label="Specification tree">/)
  assert.match(html, /<main class="reading-pane" id="specification"/)
  assert.match(html, /<aside class="context-pane" id="context-pane"/)
  assert.match(html, /class="foundation-library"/)
  assert.match(html, /href="\.\/specification\/index\.md"/)
  assert.doesNotMatch(html, /<script\s+[^>]*src=/i)
  assert.doesNotMatch(html, /<link\s+[^>]*rel=["']stylesheet/i)
})

test('cairn-spec: every inline script parses as JavaScript', () => {
  const scripts = captures(html, /<script>([\s\S]*?)<\/script>/g)
  assert.ok(scripts.length >= 2)
  for (const script of scripts) assert.doesNotThrow(() => new Function(script))
})
