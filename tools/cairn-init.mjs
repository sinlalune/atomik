#!/usr/bin/env node
/**
 * cairn-init — install Cairn into a repository, transactionally.
 *
 * ADR-020 stage 5. What an adopter receives on day one is what they own from
 * day one, so this command installs the shapes the protocol currently states
 * rather than the ones it used to: born-sliced path records, and a no-rewrite
 * path history (ADR-022) whose retention namespace is absent rather than
 * scaffolded and unused.
 *
 * THREE CLASSES OF FILE, and the difference is the whole design (ADR-020):
 *
 *   PORTABLE  copied verbatim from the installation this runs from — the
 *             protocol, its concepts and references, and the reference tools.
 *             Never edited per host; an adopter who edits one is detectable
 *             through the lock manifest.
 *   HOST      generated for this repository — the binding, the config, the
 *             bootloader, the workflow.
 *   BINDING   the one human adapter, `binding.md`, generated from the answers
 *             given here and owned by the adopter thereafter.
 *
 * TRANSACTIONAL, stated precisely rather than sold as atomic: the complete file
 * set is resolved in memory, every conflict is detected before a single byte is
 * written, and a failure during writing removes what this run created. It does
 * not protect against a concurrent writer in the target, and it does not claim
 * POSIX atomicity across a directory tree.
 *
 * IT REFUSES TO OVERWRITE. Silently replacing a file an adopter has edited is
 * how a protocol upgrade destroys the work it was meant to preserve, so an
 * existing target file is a hard stop. `cairn.lock.json` records the release
 * identity and a digest per installed file, which is what a later migrator
 * needs to tell a pristine file from an edited one. The migrator itself is NOT
 * implemented here, and this file claims nothing about updates.
 */

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync
} from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { configErrors } from './cairn-config.mjs'

export const SOURCE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** The protocol release this installation carries. `commit` is the source
 *  repository's HEAD when it can be read; an installation from an archive with
 *  no Git history records `unknown` rather than inventing a provenance. */
export const PROTOCOL_RELEASE = 'cairn-0.2'

/** Reference tools an installed repository runs. Their tests are deliberately
 *  NOT installed: they exercise this repository's fixtures, and shipping them
 *  would hand an adopter a failing suite on their first command. */
export const REFERENCE_TOOLS = [
  'cairn-check.mjs',
  'cairn-config.mjs',
  'cairn-config.schema.json',
  'cairn-active.mjs',
  'cairn-audit.mjs',
  'cairn-rules.mjs',
  'cairn-init.mjs'
]

/** Portable protocol text, copied whole. An adopter running a validator whose
 *  rules they cannot read is being asked to obey an unreadable law. */
export const PORTABLE_DOCS = 'docs/cairn/specification'

export function sourceCommit(root = SOURCE_ROOT) {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

export function digest(content) {
  return createHash('sha256').update(content).digest('hex')
}

function walk(root, base = root, out = []) {
  for (const entry of readdirSync(root)) {
    const absolute = join(root, entry)
    if (statSync(absolute).isDirectory()) walk(absolute, base, out)
    else out.push(relative(base, absolute).split(sep).join('/'))
  }
  return out
}

export function defaultOptions() {
  return {
    trunk: 'main',
    remote: 'origin',
    namespace: 'cairn',
    profile: 'local',
    projectRoot: 'project',
    docsRoot: 'docs',
    sourceRoots: ['src']
  }
}

export function buildConfig(options) {
  return {
    $schema: './tools/cairn-config.schema.json',
    version: 1,
    trunk: options.trunk,
    remote: options.remote,
    metadataNamespace: options.namespace,
    enforcementProfile: options.profile,
    roots: {
      documentation: options.docsRoot,
      project: options.projectRoot,
      architecture: `${options.docsRoot}/architecture`,
      decisions: `${options.docsRoot}/adr`,
      modules: `${options.docsRoot}/modules`,
      concepts: `${options.docsRoot}/cairn/specification/concepts`,
      source: options.sourceRoots
    },
    areas: [
      {
        name: 'application',
        match: options.sourceRoots.map((root) => `${root}/**`),
        note: `${options.docsRoot}/modules/application.md`
      }
    ],
    sharedFiles: [
      `${options.projectRoot}/coding-paths/ACTIVE.md`,
      `${options.projectRoot}/coding-paths/index.md`
    ],
    staleAfterDays: 14,
    defaultRoute: 'lightweight',
    // ADR-022. A new repository has nothing to migrate, so it starts on the
    // policy that needs no retention namespace at all. Scaffolding an empty
    // namespace beside it would hand the adopter an apparatus with no cause.
    checkpointRetentionRef: null,
    pathHistoryPolicy: 'forbidden',
    scopeDigestAlgorithm: 'sha256',
    transport: { registration: 'manual-git', integration: 'manual-git' },
    migration: { unregisteredPaths: [], undeclaredOpenings: [], v02Records: [] }
  }
}

const front = (type, title, description, tags) =>
  `---\ntype: ${type}\ntitle: ${title}\ndescription: ${description}\ntags: [${tags.join(', ')}]\ntimestamp: ${new Date().toISOString().slice(0, 10)}T00:00:00Z\n---\n`

function folderIndex(title, purpose, extra = '') {
  return front('Cairn Folder Index', title, purpose, ['index', 'cairn']) +
    `\n# ${title}\n\n${purpose}\n\nThe companion history is [log.md](./log.md).\n${extra}`
}

function folderLog(title) {
  return front('Cairn Folder Log', `Log — ${title}`, `Recent meaningful changes in ${title}.`, ['log', 'cairn']) +
    `\n# Log — ${title}\n\nAppend newest-first, at the top, in the same work unit as the change.\n` +
    'Git remains the complete record; this is the readable one.\n'
}

export function bootloader(options) {
  return `# AGENTS.md — repository bootloader

This file points; it does not carry project memory.

## Start here, in order

1. \`${options.projectRoot}/coding-paths/paths.md\` — the PORTABLE path
   convention: registration, one writer per worktree, checkpoints, closure.
2. \`${options.projectRoot}/coding-paths/binding.md\` — this repository's
   BINDING: exact roots, commands, branch and remote.
3. \`${options.docsRoot}/cairn/specification/reference/execution-protocol.md\` —
   the portable per-session order.
4. \`${options.projectRoot}/coding-paths/ACTIVE.md\` — what is running now. It is
   generated; never hand-edit it.

## The mechanical contract

The exit code is the verdict. Never pipe a gate through another command — a
pipeline reports the LAST command's status, so \`gate | tail && commit\` commits
after a failure.

\`\`\`bash
npm run cairn-check     # the blocking and advisory rules, in full
npm run cairn-active    # regenerate the running-paths view
npm run cairn-audit     # scaffold the pre-merge coherence audit
\`\`\`

## Absolute rules

- No implementation work outside an accepted coding path.
- A path branch is \`path/<lowercase-id>\`, in its own worktree, with ONE writer.
- Every executed step updates code, tests, docs and the path's own ledger in the
  same work unit, and is pushed immediately.
- **A published path branch is never rewritten** — no rebase, amend,
  \`reset --soft\` fold or force-push. Reach a current base by merging
  \`${options.trunk}\` in. This repository declares
  \`pathHistoryPolicy: forbidden\`.
- Progress persists in files, never in a conversation.
`
}

export function hostBinding(options) {
  return front('Cairn Binding', 'Host binding', `How portable Cairn roles map onto this repository.`, ['cairn', 'binding']) +
    `\n# Host binding

This page is classified **BINDING**. It names this repository and MAY carry local
paths, command names and runtime details. Portable protocol text never does.

| Portable role | This repository |
| :-- | :-- |
| documentation plane | \`${options.docsRoot}/\` |
| execution-state plane | \`${options.projectRoot}/\` |
| path records and live view | \`${options.projectRoot}/coding-paths/\` |
| accepted architecture | \`${options.docsRoot}/architecture/\` |
| decisions | \`${options.docsRoot}/adr/\` |
| implemented-area notes | \`${options.docsRoot}/modules/\` |
| concept wiki | \`${options.docsRoot}/cairn/specification/concepts/\` |
| source roots | ${options.sourceRoots.map((r) => `\`${r}/\``).join(', ')} |
| trunk | \`${options.trunk}\` |
| remote | \`${options.remote}\` |
| metadata namespace | \`${options.namespace}\` |
| enforcement profile | \`${options.profile}\` |
| path-history policy | **forbidden** — a published branch is never rewritten |
| path branch | \`path/<lowercase-path-id>\` |

The machine-readable authority is \`cairn.config.json\`, validated by
\`tools/cairn-config.mjs\` before any repository rule runs. If this table and that
file disagree, that is a binding defect — and neither is permission to write a
name from this repository into portable protocol text.

## Where the concept wiki starts

New vocabulary goes in \`${options.docsRoot}/cairn/specification/concepts/\`, one
article per term, following
[the one-concept template](../../${options.docsRoot}/cairn/specification/concepts/concept-template.md).
The index there separates borrowed vocabulary from Cairn-defined concepts; keep
that separation, because only the second kind is yours to change.

## Reaching a current base

\`\`\`bash
git fetch ${options.remote} ${options.trunk}
git merge ${options.remote}/${options.trunk}
\`\`\`

Do not rebase. Nothing published on a path branch is rewritten here, which is why
this repository has no checkpoint-retention namespace to fetch or maintain.
`
}

export function conceptTemplate() {
  return front('Cairn Concept', 'One concept', 'Template for a single concept article.', ['cairn', 'concept', 'template']) +
    `\n# One concept

State what the term MEANS in one paragraph, before any procedure. A reader
arrives here because normative text used the word and they could not proceed.

## Why it exists

The failure this concept prevents. A concept with no failure behind it is
vocabulary growth, and vocabulary is the one budget a protocol cannot refund —
every article is something a reader must learn before the rules become readable.

## How it is checked

Name the predicate, or say plainly that nothing checks it. "Nothing checks this"
is a legitimate and useful answer; a vague implication that something does is
not.

Settled by <ADR link, if a decision established it>.
`
}

export function workflow(options) {
  return `# Cairn protocol gate. Installed ADAPTER, not portable protocol.
name: cairn
on:
  pull_request:
  push:
    branches: [${options.trunk}]
jobs:
  protocol:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          # The gate must judge the branch that will land, so it needs history
          # rather than a shallow single commit.
          fetch-depth: 0
          ref: \${{ github.event.pull_request.head.sha }}
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      # Bare. A pipe would report the LAST command's exit code, which is how a
      # gate comes to pass over its own failure.
      - name: cairn-check
        run: node tools/cairn-check.mjs --base origin/${options.trunk}
`
}

/** Refuse to install a portable corpus that only resolves where it came from.
 *
 *  Written because the first end-to-end run of this command produced a
 *  repository whose FIRST gate failed with seventeen broken links. The
 *  specification linked the decisions that settled it, those decision records
 *  cite the host's own planes, and one concept article linked host architecture
 *  directly. None of it is visible from inside the source repository, where
 *  every one of those targets exists.
 *
 *  A decision record is a HOST artefact: it names a repository, a date and the
 *  people who accepted it. Portable text may NAME a decision — `ADR-021` — but a
 *  relative link into a decision plane is a link that resolves in exactly one
 *  repository. So the installer does not carry decision records, and it refuses
 *  to carry a corpus that needs them.
 */
export function outwardLinks(files) {
  const link = /\]\(([^)]+)\)/g
  const offenders = []
  for (const [path, content] of files) {
    if (!path.endsWith('.md')) continue
    const dir = path.split('/').slice(0, -1)
    // Strip fenced blocks first. A template's example step index legitimately
    // shows `./steps/S01.md`, which is illustration rather than a link the
    // reader is invited to follow — the same exemption the `links` rule makes.
    const text = content.toString('utf8').replace(/^(`{3,})[\s\S]*?^\1`*$/gm, '')
    for (const match of text.matchAll(link)) {
      const target = match[1].split('#')[0].trim()
      if (!target || !target.startsWith('.')) continue
      const parts = [...dir]
      for (const segment of target.split('/')) {
        if (segment === '.' || segment === '') continue
        if (segment === '..') parts.pop()
        else parts.push(segment)
      }
      const resolved = parts.join('/')
      if (!files.has(resolved)) offenders.push(`${path} -> ${target}`)
    }
  }
  return offenders
}

/** Resolve the complete installation in memory.
 *
 *  Returns `{ files, lock }` where every entry already carries its final bytes.
 *  Nothing touches the target here — a plan that cannot be built completely is
 *  never partially applied. */
export function planInstall(options = defaultOptions(), sourceRoot = SOURCE_ROOT) {
  const files = new Map()
  const put = (path, content) => {
    if (files.has(path)) throw new Error(`cairn-init: duplicate planned file ${path}`)
    files.set(path, typeof content === 'string' ? Buffer.from(content, 'utf8') : content)
  }

  const config = buildConfig(options)
  const errors = configErrors(config)
  if (errors.length) {
    // Fail before writing, not after. An installer that emits an invalid binding
    // hands the adopter a repository whose first command cannot run.
    throw new Error(`cairn-init: generated configuration is invalid — ${errors.join('; ')}`)
  }

  put('cairn.config.json', `${JSON.stringify(config, null, 2)}\n`)
  put('AGENTS.md', bootloader(options))
  put('package.json', `${JSON.stringify({
    name: 'cairn-repository',
    private: true,
    type: 'module',
    scripts: {
      'cairn-check': 'node tools/cairn-check.mjs',
      'cairn-active': 'node tools/cairn-active.mjs',
      'cairn-audit': 'node tools/cairn-audit.mjs',
      'cairn-rules': 'node tools/cairn-rules.mjs'
    }
  }, null, 2)}\n`)

  for (const tool of REFERENCE_TOOLS) {
    const absolute = join(sourceRoot, 'tools', tool)
    if (!existsSync(absolute)) throw new Error(`cairn-init: missing reference tool ${tool}`)
    put(`tools/${tool}`, readFileSync(absolute))
  }

  const specRoot = join(sourceRoot, PORTABLE_DOCS)
  if (!existsSync(specRoot)) throw new Error(`cairn-init: missing portable protocol at ${PORTABLE_DOCS}`)
  const portableText = []
  for (const relativePath of walk(specRoot)) {
    // A folder log is THIS repository's history of the folder, not portable
    // protocol. Copying one hands an adopter someone else's changelog, with
    // links into records they do not have; each installed folder gets a fresh
    // log of its own instead.
    if (relativePath.endsWith('log.md')) continue
    const content = readFileSync(join(specRoot, relativePath))
    portableText.push(content.toString('utf8'))
    put(`${PORTABLE_DOCS}/${relativePath}`, content)
  }
  put(`${PORTABLE_DOCS}/log.md`, folderLog('Cairn specification'))

  // The portable path convention travels verbatim; its host adapter is generated.
  const convention = join(sourceRoot, 'atomik-project/coding-paths/paths.md')
  if (!existsSync(convention)) throw new Error('cairn-init: missing portable path convention')
  put(`${options.projectRoot}/coding-paths/paths.md`, readFileSync(convention))
  put(`${options.projectRoot}/coding-paths/binding.md`, hostBinding(options))

  put(`${options.docsRoot}/cairn/specification/concepts/concept-template.md`, conceptTemplate())



  for (const [dir, title, purpose] of [
    [`${options.docsRoot}/architecture`, 'Architecture', 'Accepted architecture and constitutional doctrine.'],
    [`${options.docsRoot}/adr`, 'Decisions', 'One accepted decision per record.'],
    [`${options.docsRoot}/modules`, 'Module notes', 'One note per implemented area: flow, boundaries and tests.'],
    [`${options.projectRoot}/coding-paths`, 'Coding paths', 'One record per bounded change, and the generated live view.'],
    [`${options.projectRoot}/sessions`, 'Sessions', 'Opening, closing and other human decisions. Immutable once written.'],
    [`${options.projectRoot}/audits`, 'Audits', 'One coherence audit bound to one exact candidate commit.'],
    [`${options.projectRoot}/briefs`, 'Briefs', 'The disposable current handoff projection for each running path.'],
    [`${options.projectRoot}/log`, 'Journal', 'One file per integrated outcome, written at merge time.']
  ]) {
    put(`${dir}/index.md`, folderIndex(title, purpose))
    put(`${dir}/log.md`, folderLog(title))
  }

  put(`${options.projectRoot}/index.md`, folderIndex(
    'Project plane',
    'Durable execution state: coding paths, sessions, audits, briefs and the journal.'
  ))
  put(`${options.projectRoot}/log.md`, folderLog('Project plane'))
  // A placeholder, immediately overwritten by the generator below. The
  // generator reads the file it rewrites, and shipping the file it would
  // produce — by hand — is what failed `derived-view` on the first install.
  put(`${options.projectRoot}/coding-paths/ACTIVE.md`,
    front('Cairn Generated View', 'Running paths', 'Generated live view of running coding paths.', ['cairn', 'generated', 'index']) +
    '\n# Running paths\n\nThis file is GENERATED by `npm run cairn-active`. Never hand-edit it.\n\n' +
    '<!-- cairn:paths:begin -->\n<!-- cairn:paths:end -->\n')
  put(`${options.docsRoot}/index.md`, folderIndex(
    'Documentation plane',
    'Durable knowledge: architecture, decisions, module notes and the Cairn protocol.'
  ))
  put(`${options.docsRoot}/log.md`, folderLog('Documentation plane'))

  if (options.profile === 'ci') put('.github/workflows/cairn.yml', workflow(options))

  const dangling = outwardLinks(files)
  if (dangling.length) {
    throw new Error(
      `cairn-init: the planned installation contains ${dangling.length} link(s) that resolve nowhere in it — ` +
      `${dangling.slice(0, 4).join('; ')}${dangling.length > 4 ? '; …' : ''}. ` +
      'A corpus that only resolves in the repository it came from is not portable, and installing it hands the adopter a red gate on their first command'
    )
  }

  return { files, config, sourceCommit: sourceCommit(sourceRoot) }
}

/** The live view is GENERATED, so it is generated rather than guessed.
 *
 *  Shipping a hand-written `ACTIVE.md` failed `derived-view` on the installed
 *  repository's very first gate — the rule correctly observed that the file did
 *  not match what the generator produces. An installer that writes a derived
 *  file by hand is committing the defect the protocol names. */
function generateView(target) {
  try {
    execFileSync(process.execPath, ['tools/cairn-active.mjs'], { cwd: target, stdio: 'pipe' })
  } catch (error) {
    // Report what the generator actually said. "It failed" with the reason
    // discarded is the diagnostic equivalent of an empty namespace.
    const detail = [error.stdout, error.stderr].map((b) => b?.toString('utf8').trim()).filter(Boolean).join(' | ')
    throw new Error(detail || error.message)
  }
}

export function writeLock(target, plan, extraPaths = []) {
  const manifest = {}
  for (const path of [...plan.files.keys(), ...extraPaths].sort((a, b) => a.localeCompare(b))) {
    manifest[path] = digest(readFileSync(join(target, path)))
  }
  const lock = {
    release: PROTOCOL_RELEASE,
    sourceCommit: plan.sourceCommit,
    installedAt: new Date().toISOString(),
    // The point of the manifest: a later release can tell a file the adopter
    // edited from one it installed, and so can migrate instead of overwriting.
    // Nothing here implements that migration — it records what one would need.
    manifest
  }
  writeFileSync(join(target, 'cairn.lock.json'), `${JSON.stringify(lock, null, 2)}\n`)
  return lock
}

/** Apply a plan to a target directory.
 *
 *  Conflicts are detected across the WHOLE plan before anything is written, so
 *  a target that already holds one planned file is refused intact rather than
 *  half-installed. If a write fails after that, every file this run created is
 *  removed — and only those, so a pre-existing target keeps whatever it had.
 */
export function applyPlan(plan, target, { dryRun = false } = {}) {
  const conflicts = [...plan.files.keys()].filter((path) => existsSync(join(target, path)))
  if (conflicts.length) {
    throw new Error(
      `cairn-init: refusing to overwrite ${conflicts.length} existing file(s) — ` +
      `${conflicts.slice(0, 5).join(', ')}${conflicts.length > 5 ? ', …' : ''}. ` +
      'Silently replacing a file an adopter edited is how an upgrade destroys the work it was meant to preserve. ' +
      'Install into an empty target, or move the existing files aside deliberately'
    )
  }
  if (existsSync(join(target, 'cairn.lock.json'))) {
    throw new Error('cairn-init: this repository already carries a cairn.lock.json — it is already installed, and updating an installation is not implemented')
  }
  if (dryRun) return { written: [], planned: [...plan.files.keys()] }

  const written = []
  try {
    for (const [path, content] of plan.files) {
      const absolute = join(target, path)
      mkdirSync(dirname(absolute), { recursive: true })
      writeFileSync(absolute, content)
      written.push(path)
    }
  } catch (error) {
    for (const path of written.reverse()) {
      try { rmSync(join(target, path), { force: true }) } catch { /* best effort */ }
    }
    throw new Error(`cairn-init: installation failed and was rolled back — ${error.message}`)
  }
  try {
    generateView(target)
  } catch (error) {
    for (const path of written.reverse()) {
      try { rmSync(join(target, path), { force: true }) } catch { /* best effort */ }
    }
    throw new Error(`cairn-init: could not generate the live view, so nothing was installed — ${error.message}`)
  }
  const view = `${plan.config.roots.project}/coding-paths/ACTIVE.md`
  writeLock(target, plan, existsSync(join(target, view)) ? [view] : [])
  return { written: [...written, view, 'cairn.lock.json'], planned: [...plan.files.keys()] }
}

function parseArgs(argv) {
  const options = { ...defaultOptions() }
  let target = null
  let dryRun = false
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    const next = () => {
      const value = argv[i + 1]
      if (value == null) throw new Error(`cairn-init: ${arg} needs a value`)
      i += 1
      return value
    }
    if (arg === '--target') target = next()
    else if (arg === '--trunk') options.trunk = next()
    else if (arg === '--remote') options.remote = next()
    else if (arg === '--namespace') options.namespace = next()
    else if (arg === '--profile') options.profile = next()
    else if (arg === '--project-root') options.projectRoot = next()
    else if (arg === '--docs-root') options.docsRoot = next()
    else if (arg === '--source') options.sourceRoots = next().split(',').map((s) => s.trim()).filter(Boolean)
    else if (arg === '--dry-run') dryRun = true
    else throw new Error(`cairn-init: unknown argument ${arg}`)
  }
  if (!target) throw new Error('cairn-init: --target <directory> is required')
  if (options.profile === 'protected') {
    // Tier 0 and 1 only, by owner ruling 9. A `protected` profile asserts host
    // branch protection that this command cannot configure and must not claim.
    throw new Error('cairn-init: --profile protected is not installable — it asserts host protection this command cannot configure. Install local or ci and declare protected once the host is actually configured')
  }
  return { options, target: resolve(target), dryRun }
}

function main(argv) {
  const { options, target, dryRun } = parseArgs(argv)
  const plan = planInstall(options, SOURCE_ROOT)
  mkdirSync(target, { recursive: true })
  // An existing package.json belongs to the adopter. Refusing the whole install
  // over it would be obstructive; merging it silently would be the overwrite
  // this command exists to refuse. So it is skipped and reported.
  let scriptsNotice = null
  if (existsSync(join(target, 'package.json'))) {
    plan.files.delete('package.json')
    scriptsNotice = 'package.json already exists and was left alone — add: ' +
      '"cairn-check": "node tools/cairn-check.mjs", "cairn-active": "node tools/cairn-active.mjs", "cairn-audit": "node tools/cairn-audit.mjs"'
  }
  const result = applyPlan(plan, target, { dryRun })

  console.log(
    `cairn-init — ${dryRun ? 'would install' : 'installed'} ${plan.files.size} file(s) into ${target}`
  )
  console.log(
    `release ${PROTOCOL_RELEASE} from ${plan.sourceCommit.slice(0, 7)}; ` +
    `trunk ${options.trunk} via ${options.remote}; profile ${options.profile}; ` +
    'path history forbidden (no rewriting; no retention namespace)'
  )
  if (scriptsNotice) console.log(scriptsNotice)
  if (!dryRun) {
    console.log('next — commit this installation, then read AGENTS.md and open your first path')
  }
  return result
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main(process.argv.slice(2))
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}
