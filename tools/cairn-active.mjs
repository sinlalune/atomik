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

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ACTIVE_FILE,
  PATH_DIR,
  PATHS_BEGIN,
  PATHS_END,
  readFrontmatter,
  unmetDependencies
} from './cairn-check.mjs'
import { REPO, metadataOf } from './cairn-config.mjs'

const LIVE_STATUSES = new Set(['running', 'blocked', 'ready'])

/** The roadmap register, and the one row the kit writes into it. */
export const REGISTER_FILE = `${PATH_DIR}/index.md`
export const INSTALLER_ROW = 'M1 — the first milestone'

/**
 * ADR-008 decision 5: the live view reports a register that still carries the
 * installer's row while any path is REGISTERED — which counts every path
 * record, not the live ones. The adopter's register was untouched after
 * sixteen paths, and by the time anyone looked most of them were `done`; a
 * reading that only counted live paths would have said nothing there, on the
 * repository it was written for.
 *
 * A line, never an exit code: what milestone a project has is the owner's to
 * write. Nothing is said before the first path is registered, where the
 * placeholder is what the kit wrote a minute ago; and a register this checkout
 * could not read is `null`, which is a different fact and is not reported as
 * this one.
 */
export function registerAdvisory({ register, paths }) {
  if (register == null || !(paths >= 1)) return null
  if (!register.includes(INSTALLER_ROW)) return null
  return `cairn-active — the roadmap register still carries the installer's row, \`${INSTALLER_ROW}\`, while ${paths} path${paths === 1 ? ' is' : 's are'} registered: ${REGISTER_FILE}`
}

/** Deterministic by construction: sorted by id, so two people regenerating
 *  from the same path files produce byte-identical output. The last field is
 *  the one edge Cairn keeps between paths, projected: a path is UNBLOCKED when
 *  every path it depends on has reached the trunk, and otherwise the view
 *  names what it waits on — so the next piece of work is a fact the repository
 *  computes, not a judgement repeated in every planning conversation. */
export function renderPaths(paths) {
  if (paths.length === 0) {
    return '- *(no live path)*'
  }
  return paths
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((path) => {
      const waits = path.waitsOn ?? []
      const edge = waits.length === 0 ? 'unblocked' : `waits on ${waits.join(', ')}`
      return `- **${path.id}** — ${path.title} · status \`${path.status}\` · branch \`${path.branch}\` · base \`${path.base}\` · ${edge}`
    })
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

/** The live paths, and how many records are REGISTERED — which is every path
 *  record, whatever its status, deduped by the id it declares. Both come from
 *  one parse: the statuses map below already holds exactly that set, and a
 *  second loop over the same files would be the same reading written twice. */
export function collectPaths(files) {
  const records = files.map(({ name, text }) => {
    const parsed = readFrontmatter(text)
    return { name, parsed, front: metadataOf(parsed?.data) }
  })
  // Every record's state, live or not: a dependency on a `done` path is met,
  // and only the whole corpus can say so.
  const statuses = new Map(records
    .filter(({ front }) => front?.id)
    .map(({ front }) => [String(front.id), { status: front.status, resolution: front.resolution }]))
  const live = []
  for (const { name, parsed, front } of records) {
    if (!front || !LIVE_STATUSES.has(front.status) || !front.branch) continue
    live.push({
      id: front.id ?? name,
      title: (parsed.data.title ?? '').replace(/^['"]|['"]$/g, '').split(' — ')[0],
      status: front.status,
      branch: front.branch,
      base: front.base_commit ?? 'unpinned',
      waitsOn: unmetDependencies(front, statuses)
    })
  }
  return { live, registered: statuses.size }
}

function main() {
  const check = process.argv.includes('--check')
  // Two record shapes: the flat `CP-<id>.md` every path used, and the folder
  // `CP-<id>/index.md` a path is born in under ADR-020 decision 4. The view is a
  // projection of declarations, so it has to see both or it silently omits a
  // running path — which is the exact failure trunk registration was added for.
  const files = readdirSync(join(REPO, PATH_DIR), { withFileTypes: true })
    .filter((entry) => entry.name.startsWith('CP-'))
    .map((entry) => (entry.isDirectory()
      ? { name: entry.name, file: join(entry.name, 'index.md') }
      : { name: entry.name.replace(/\.md$/, ''), file: entry.name }))
    .filter((entry) => entry.file.endsWith('.md') && existsSync(join(REPO, PATH_DIR, entry.file)))
    .map(({ name, file }) => ({ name, text: readFileSync(join(REPO, PATH_DIR, file), 'utf8') }))

  const active = join(REPO, ACTIVE_FILE)
  const current = readFileSync(active, 'utf8')
  const { live, registered } = collectPaths(files)
  const next = spliceBlock(current, renderPaths(live))

  // Said on every invocation, before the view's own line: it reads the
  // register, not whether the view was rewritten, so `--check` reports it too.
  const register = join(REPO, REGISTER_FILE)
  const advisory = registerAdvisory({
    register: existsSync(register) ? readFileSync(register, 'utf8') : null,
    paths: registered
  })
  if (advisory) console.log(advisory)

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
