#!/usr/bin/env node
/**
 * cairn-active — regenerate the live-paths view in ACTIVE.md.
 *
 * The owner's challenge (2026-08-14): "if an agent is merging it can
 * reconstruct those files on the go". Correct — and reconstructing beats
 * locking. Every path already declares its status, branch and base, so the
 * running list is a PROJECTION of those files rather than a source. Since
 * CP-OPS-001 S08, an accepted path declaration lands on the trunk BEFORE its
 * worktree branches. That registration is the missing precondition: without
 * it, this generator can be perfectly current for one checkout while being
 * globally false about sibling branches it cannot see.
 *
 * This matters more since the integrator was removed. With every path merging
 * itself, registration + derivation are what keep the global view complete
 * without giving one person ownership of it.
 *
 * Same doctrine the app already applies to its own views: files hold the
 * state, the view arranges references to it, and closing the view loses
 * nothing.
 *
 *   node tools/cairn-active.mjs           # rewrite the block
 *   node tools/cairn-active.mjs --check   # exit 1 if stale, write nothing
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ACTIVE_FILE, PATHS_BEGIN, PATHS_END, readFrontmatter } from './cairn-check.mjs'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PATH_DIR = 'atomik-project/coding-paths'
const LIVE_STATUSES = new Set(['running', 'blocked', 'ready'])

/** Deterministic by construction: sorted by id, so two people regenerating
 *  from the same path files produce byte-identical output. */
export function renderPaths(paths) {
  if (paths.length === 0) {
    return '- *(no live path)*'
  }
  return paths
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(
      (path) =>
        `- **${path.id}** — ${path.title} · status \`${path.status}\` · branch \`${path.branch}\` · base \`${path.base}\``
    )
    .join('\n')
}

export function spliceBlock(text, body) {
  const start = text.indexOf(PATHS_BEGIN)
  const end = text.indexOf(PATHS_END)
  if (start === -1 || end === -1 || end < start) {
    throw new Error(
      `${ACTIVE_FILE}: missing ${PATHS_BEGIN} / ${PATHS_END} markers — the derived block has nowhere to go`
    )
  }
  const head = text.slice(0, start + PATHS_BEGIN.length)
  const tail = text.slice(end)
  return `${head}\n${body}\n${tail}`
}

export function collectPaths(files) {
  const live = []
  for (const { name, text } of files) {
    const parsed = readFrontmatter(text)
    const front = parsed?.data?.atomik
    if (!front || !LIVE_STATUSES.has(front.status) || !front.branch) continue
    live.push({
      id: front.id ?? name.replace(/\.md$/, ''),
      title: (parsed.data.title ?? '').replace(/^['"]|['"]$/g, '').split(' — ')[0],
      status: front.status,
      branch: front.branch,
      base: front.base_commit ?? 'unpinned'
    })
  }
  return live
}

function main() {
  const check = process.argv.includes('--check')
  const files = readdirSync(join(REPO, PATH_DIR))
    .filter((file) => file.startsWith('CP-') && file.endsWith('.md'))
    .map((name) => ({ name, text: readFileSync(join(REPO, PATH_DIR, name), 'utf8') }))

  const active = join(REPO, ACTIVE_FILE)
  const current = readFileSync(active, 'utf8')
  const next = spliceBlock(current, renderPaths(collectPaths(files)))

  if (next === current) {
    console.log('cairn-active — running-paths view already current')
    process.exit(0)
  }
  if (check) {
    console.error('cairn-active — running-paths view is STALE. Run: npm run cairn-active')
    process.exit(1)
  }
  writeFileSync(active, next, 'utf8')
  console.log(`cairn-active — rewrote the running-paths view in ${ACTIVE_FILE}`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
