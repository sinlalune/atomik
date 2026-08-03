import type { VaultFolder } from '../../../shared/ipc-contract'
import {
  BUILTIN_BLOCK_DEFAULTS,
  BUILTIN_BLOCK_IDS,
  type BuiltinBlockId,
  type BuiltinOverrides
} from '../../../shared/prompt-composition'

/**
 * Scoped prompt folders (CP-MVP-008 S03; owner amendment 2026-07-21):
 * a `prompts/` folder may live at the vault root, inside ANY folder,
 * and inside a project bundle — a project is a folder, so the walk
 * from the note outward covers all three scopes with ONE rule:
 * NEAREST WINS. A same-named prompt closer to the note SHADOWS the
 * distant one (a project overrides a root prompt, not just adds).
 *
 * Prompts are ordinary vault files (04) reached through the EXISTING
 * verbs — this module receives `listVaultFiles`/`readNote`/`createNote`
 * as plain functions (zero new IPC) and stays pure enough to test
 * without a vault.
 */

export type PromptKind = 'system' | 'message'

export type PromptFile = {
  /** Vault-relative path of the prompt note. */
  relPath: string
  /** Basename without .md — the shadowing key. */
  name: string
  kind: PromptKind
  /** Frontmatter title, else the name. */
  title: string
  description?: string
  /** Prompt text: content below the frontmatter fence, trimmed. */
  body: string
  /** Folder OWNING the prompts/ folder ('' = vault root). */
  scopeFolder: string
}

/** prompts/ folders from the note outward, nearest first:
 *  'a/b/c.md' → ['a/b/prompts', 'a/prompts', 'prompts']. */
export function promptFolderChainFor(noteRelPath: string): string[] {
  const dirs = noteRelPath.split('/').slice(0, -1)
  const chain: string[] = []
  for (let depth = dirs.length; depth >= 0; depth -= 1) {
    const scope = dirs.slice(0, depth).join('/')
    chain.push(scope.length > 0 ? `${scope}/prompts` : 'prompts')
  }
  return chain
}

function findFolder(tree: VaultFolder, relPath: string): VaultFolder | null {
  if (relPath.length === 0) return tree
  let current: VaultFolder = tree
  for (const segment of relPath.split('/')) {
    const next = current.folders.find((folder) => folder.name === segment)
    if (!next) return null
    current = next
  }
  return current
}

export type PromptRef = { relPath: string; name: string; scopeFolder: string }

/**
 * Prompt-note references along the note's scope chain, nearest first,
 * SHADOWING APPLIED: the first occurrence of a basename wins, deeper
 * duplicates are dropped. Only direct children of a prompts/ folder
 * count (its index/log convention files excluded).
 */
export function collectPromptRefs(
  tree: VaultFolder,
  noteRelPath: string
): PromptRef[] {
  const seen = new Set<string>()
  const refs: PromptRef[] = []
  for (const promptsPath of promptFolderChainFor(noteRelPath)) {
    const folder = findFolder(tree, promptsPath)
    if (!folder) continue
    const scopeFolder = promptsPath.split('/').slice(0, -1).join('/')
    for (const note of folder.notes) {
      const name = note.name.replace(/\.md$/i, '')
      if (name === 'index' || name === 'log') continue
      if (seen.has(name)) continue
      seen.add(name)
      refs.push({ relPath: note.relPath, name, scopeFolder })
    }
  }
  return refs
}

/** Parses one prompt file; null when it is not a valid prompt
 *  (missing fence or kind — an ordinary note in prompts/ is skipped,
 *  never an error). */
export function parsePromptFile(
  rawContent: string
): { kind: PromptKind; title?: string; description?: string; body: string } | null {
  // CRLF tolerance: an owner-edited file from a Windows-side editor
  // must not silently vanish from the menus.
  const content = rawContent.replace(/\r\n/g, '\n')
  const fence = /^---\n([\s\S]*?)\n---\n?/.exec(content)
  if (!fence) return null
  const frontmatter = fence[1]!
  const kindMatch = /^kind:\s*(\S+)\s*$/m.exec(frontmatter)
  const kind = kindMatch?.[1]
  if (kind !== 'system' && kind !== 'message') return null
  const title = /^title:\s*(.+?)\s*$/m.exec(frontmatter)?.[1]
  const description = /^description:\s*(.+?)\s*$/m.exec(frontmatter)?.[1]
  const body = content.slice(fence[0].length).trim()
  if (body.length === 0) return null
  return {
    kind,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    body
  }
}

/** True for the folders the prompt conventions own: `prompts` at any
 *  depth (root, folder, project bundle alike). */
export function isPromptsFolder(relPath: string): boolean {
  return relPath === 'prompts' || relPath.endsWith('/prompts')
}

/**
 * Layer directive (S03b, owner directive): a line of the form
 * `{{prompt: name}}` inside a prompt body inserts the named prompt as
 * a LAYER — system and message prompts both compose (the OUTER
 * prompt's kind governs how the result is used). The name resolves
 * through the SAME nearest-wins scope resolution as the menu, so a
 * project can override a layer the way it overrides a prompt.
 * Full-line only: an inline mention stays inert text.
 */
const LAYER_DIRECTIVE = /^\{\{\s*prompt:\s*([^{}\n]+?)\s*\}\}\s*$/
const MAX_LAYER_DEPTH = 8

/** Expands layer directives against the resolved prompt set. Unknown
 *  names, cycles, and beyond-depth includes stay LITERAL — a broken
 *  reference must be visible, never silently dropped. */
export function expandPromptLayers(
  body: string,
  byName: Map<string, { body: string }>,
  stack: ReadonlySet<string> = new Set()
): string {
  if (stack.size >= MAX_LAYER_DEPTH) return body
  return body
    .split(/\r?\n/)
    .map((line) => {
      const match = LAYER_DIRECTIVE.exec(line)
      if (!match) return line
      const name = match[1]!
      const layer = byName.get(name)
      if (!layer || stack.has(name)) return line
      return expandPromptLayers(layer.body, byName, new Set([...stack, name]))
    })
    .join('\n')
}

export type PromptVerbs = {
  listVaultFiles: () => Promise<VaultFolder>
  readNote: (relPath: string) => Promise<{ content: string }>
}

/** The note's resolved prompts, nearest-first with shadowing; invalid
 *  files skipped, a failed read degrades to that file missing. */
export async function loadPromptsFor(
  noteRelPath: string,
  verbs: PromptVerbs
): Promise<PromptFile[]> {
  const tree = await verbs.listVaultFiles()
  const refs = collectPromptRefs(tree, noteRelPath)
  const prompts: PromptFile[] = []
  for (const ref of refs) {
    let content: string
    try {
      content = (await verbs.readNote(ref.relPath)).content
    } catch {
      continue
    }
    const parsed = parsePromptFile(content)
    if (!parsed) continue
    prompts.push({
      relPath: ref.relPath,
      name: ref.name,
      kind: parsed.kind,
      title: parsed.title ?? ref.name,
      ...(parsed.description ? { description: parsed.description } : {}),
      body: parsed.body,
      scopeFolder: ref.scopeFolder
    })
  }
  // Layers expand LAST, against the shadow-resolved set — an included
  // name lands on whatever this note's scopes resolved it to.
  const byName = new Map(prompts.map((prompt) => [prompt.name, prompt]))
  return prompts.map((prompt) => ({
    ...prompt,
    body: expandPromptLayers(prompt.body, byName, new Set([prompt.name]))
  }))
}

/** Scope tag for menus — shadowing stays VISIBLE, never magic. */
export function scopeLabel(scopeFolder: string, noteRelPath: string): string {
  if (scopeFolder.length === 0) return 'vault'
  const noteDir = noteRelPath.split('/').slice(0, -1).join('/')
  return scopeFolder === noteDir ? 'this folder' : scopeFolder
}

/**
 * The @ quick-action token (S03c, owner directive): typing `@` in an
 * AI input summons the prompt menu — the editor's @ citation menu
 * precedent, hand-rolled for a plain textarea. A token starts at an
 * `@` that opens the text or follows whitespace and runs to the
 * caret with no whitespace inside; anything else (emails, mid-word
 * @) stays inert.
 */
export function atPromptToken(
  text: string,
  caret: number
): { start: number; query: string } | null {
  const upToCaret = text.slice(0, caret)
  const at = upToCaret.lastIndexOf('@')
  if (at === -1) return null
  if (at > 0 && !/\s/.test(upToCaret[at - 1]!)) return null
  const query = upToCaret.slice(at + 1)
  if (/\s/.test(query)) return null
  return { start: at, query }
}

/** Replaces the @token with `replacement`; returns the new text and
 *  caret (right after what was inserted). */
export function applyAtInsertion(
  text: string,
  tokenStart: number,
  caret: number,
  replacement: string
): { text: string; caret: number } {
  return {
    text: text.slice(0, tokenStart) + replacement + text.slice(caret),
    caret: tokenStart + replacement.length
  }
}

/** The directive text for a prompt — what the @ menu inserts (S03d):
 *  the LAYER REFERENCE, never the flattened body, so an instruction
 *  stays a buildable custom prompt until run time. */
export const layerDirectiveFor = (name: string): string => `{{prompt: ${name}}}`

/**
 * Inserts a layer directive over the @token, padded onto its OWN LINE
 * when the token sits mid-line — the full-line rule is what keeps
 * prose mentions inert, so the inserter must respect it.
 */
export function insertDirectiveAt(
  text: string,
  tokenStart: number,
  caret: number,
  name: string
): { text: string; caret: number } {
  const before = text.slice(0, tokenStart)
  const after = text.slice(caret)
  const prefix = before.length > 0 && !before.endsWith('\n') ? '\n' : ''
  const suffix = after.length > 0 && !after.startsWith('\n') ? '\n' : ''
  return applyAtInsertion(
    text,
    tokenStart,
    caret,
    prefix + layerDirectiveFor(name) + suffix
  )
}

/** Run-time composition of the INSTRUCTION (S03d): the instruction is
 *  itself a buildable prompt — its layer directives expand against
 *  the note's resolved prompts the moment it is sent, so what
 *  travels is composed while what you edit stays layered. */
export function expandInstruction(
  instruction: string,
  prompts: PromptFile[]
): string {
  const byName = new Map(prompts.map((prompt) => [prompt.name, prompt]))
  return expandPromptLayers(instruction, byName)
}

/**
 * The system STACK (S03f, owner brainstorm): multiple system prompts
 * chosen and ORDERED — `personality > tone > objectives` — composing
 * top-down into one system prompt. A saved stack IS a prompt file
 * whose body is directive lines, so agents can author sub-agent
 * behaviors by writing the same files the UI builds.
 */

/** Moves one element; out-of-range indices return the list unchanged. */
export function reorderStack<T>(list: T[], from: number, to: number): T[] {
  if (from === to) return list
  if (from < 0 || from >= list.length || to < 0 || to >= list.length) return list
  const next = [...list]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved!)
  return next
}

/** The stack's composed system prompt: bodies (already layer-expanded
 *  at load) joined in stack order; missing entries drop silently —
 *  a deleted block must not wedge the run. */
export function composeSystemStack(
  stackRelPaths: string[],
  prompts: PromptFile[]
): string {
  const byPath = new Map(prompts.map((prompt) => [prompt.relPath, prompt]))
  return stackRelPaths
    .map((relPath) => byPath.get(relPath)?.body ?? '')
    .filter((body) => body.length > 0)
    .join('\n\n')
}

/** A saved stack as a prompt FILE: kind system, body = one directive
 *  line per block in order — reusable, shareable, agent-authorable. */
export function stackFileContent(name: string, blockNames: string[]): string {
  return [
    '---',
    'kind: system',
    `title: ${promptTitleFor(name)}`,
    'description: A composed system stack — each line is one block.',
    '---',
    '',
    ...blockNames.map((blockName) => layerDirectiveFor(blockName))
  ].join('\n')
}

/** Prompts grouped by scope label, preserving nearest-first order —
 *  the selection menu shows WHERE each quick action comes from (S04). */
export function groupPromptsByScope(
  prompts: PromptFile[],
  notePath: string
): Array<{ scope: string; prompts: PromptFile[] }> {
  const groups: Array<{ scope: string; prompts: PromptFile[] }> = []
  for (const prompt of prompts) {
    const scope = scopeLabel(prompt.scopeFolder, notePath)
    const existing = groups.find((group) => group.scope === scope)
    if (existing) existing.prompts.push(prompt)
    else groups.push({ scope, prompts: [prompt] })
  }
  return groups
}

/** Pill toggle for the custom-input stack (S04): click order IS the
 *  stack order; a second click removes the block. */
export function toggleStackBlock(stack: string[], relPath: string): string[] {
  return stack.includes(relPath)
    ? stack.filter((candidate) => candidate !== relPath)
    : [...stack, relPath]
}

/**
 * The one-screen menu composer (S04c, owner directive): message picks
 * and built-ins share ONE ordered sequence — entries are prompt
 * relPaths or `builtin:<id>` — composing into the instruction: layer
 * directives for prompt files, raw instruction lines for built-ins,
 * the optional typed input last. Empty result = nothing runnable.
 */
export function composeMenuInstruction(
  order: string[],
  prompts: PromptFile[],
  builtins: ReadonlyArray<{ id: string; instruction: string }>,
  input: string
): string {
  const byPath = new Map(prompts.map((prompt) => [prompt.relPath, prompt]))
  const lines = order
    .map((entry) => {
      if (entry.startsWith('builtin:')) {
        return builtins.find((builtin) => builtin.id === entry.slice(8))?.instruction ?? ''
      }
      const prompt = byPath.get(entry)
      return prompt ? layerDirectiveFor(prompt.name) : ''
    })
    .filter((line) => line.length > 0)
  const typed = input.trim()
  if (typed.length > 0) lines.push(typed)
  return lines.join('\n')
}

/** When the vault holds more prompts than the menu can label, a search
 *  bar appears; the display stays capped but PICKED prompts are never
 *  dropped — their numbers must stay visible. */
export function visibleMenuPrompts(
  prompts: PromptFile[],
  picked: ReadonlySet<string>,
  query: string,
  max: number
): PromptFile[] {
  const shown = filterPrompts(prompts, query).slice(0, max)
  for (const prompt of prompts) {
    if (picked.has(prompt.relPath) && !shown.includes(prompt)) shown.push(prompt)
  }
  return shown
}

/**
 * Note links inside a composed instruction (S04o, owner directive:
 * "use note link in prompts as an insertion of it") — markdown links
 * targeting `.md` files, e.g. `[Ethymology](<../philosophy/
 * Ethymology.md>)`, become LINKED-NOTE insertions: the linked note's
 * content rides the request as reference material the model can
 * quote (and the checker can verify). Deduped by target, capped.
 */
export const MAX_LINKED_NOTES = 4

const NOTE_LINK = /\[([^\]]+)\]\(<?([^)>#]+?\.md)(?:#[^)>]*)?>?\)/gi

export function extractNoteLinks(
  text: string
): Array<{ label: string; target: string }> {
  const seen = new Set<string>()
  const links: Array<{ label: string; target: string }> = []
  for (const match of text.matchAll(NOTE_LINK)) {
    const target = match[2]!.trim()
    if (seen.has(target)) continue
    seen.add(target)
    links.push({ label: match[1]!.trim(), target })
    if (links.length >= MAX_LINKED_NOTES) break
  }
  return links
}

/**
 * Candidate vault-relative paths for a link target, tried in order —
 * a link may have been written relative to the CURRENT note or inside
 * a prompt file (its own folder), so: (1) resolved against the note's
 * folder, (2) the target with leading ./ and ../ stripped, read as
 * vault-root-relative, (3) the raw target. First readable wins.
 */
export function linkedNoteCandidates(
  target: string,
  noteRelPath: string
): string[] {
  const candidates: string[] = []
  const noteDir = noteRelPath.split('/').slice(0, -1)
  const parts = target.split('/')
  const stack = [...noteDir]
  let resolvable = true
  for (const part of parts) {
    if (part === '.' || part === '') continue
    if (part === '..') {
      if (stack.length === 0) {
        resolvable = false
        break
      }
      stack.pop()
    } else {
      stack.push(part)
    }
  }
  if (resolvable) candidates.push(stack.join('/'))
  const rootRelative = target.replace(/^(\.\.?\/)+/, '')
  if (!candidates.includes(rootRelative)) candidates.push(rootRelative)
  if (!candidates.includes(target)) candidates.push(target)
  return candidates
}

/** Case-insensitive filter over name/title for the @ menu. */
export function filterPrompts(
  prompts: PromptFile[],
  query: string
): PromptFile[] {
  const needle = query.trim().toLowerCase()
  if (needle.length === 0) return prompts
  return prompts.filter(
    (prompt) =>
      prompt.name.toLowerCase().includes(needle) ||
      prompt.title.toLowerCase().includes(needle)
  )
}

/** Title autofill for a new prompt file: dashes to spaces, first
 *  letter up — the frontmatter stays an ordinary edit afterwards. */
export function promptTitleFor(name: string): string {
  const spaced = name.replace(/[-_]+/g, ' ').trim()
  return spaced.length > 0 ? spaced[0]!.toUpperCase() + spaced.slice(1) : name
}

/** The autofilled content behind "New prompt…" (S03b): frontmatter
 *  from the UI choices (kind + name→title), a layer hint in the
 *  DESCRIPTION (tooltips, never sent to a model), a minimal body. */
export function buildPromptFileContent(
  kind: PromptKind,
  name: string
): string {
  return [
    '---',
    `kind: ${kind}`,
    `title: ${promptTitleFor(name)}`,
    'description: A line {{prompt: name}} inserts another prompt as a layer.',
    '---',
    '',
    kind === 'system'
      ? 'Describe who the assistant is and how it should answer.'
      : 'Write the instruction the AI runs on the selection.'
  ].join('\n')
}

/** Starter prompts (root scope) — materialized ONLY by the explicit
 *  action below, never on open. */
export const STARTER_PROMPTS: ReadonlyArray<{ name: string; content: string }> = [
  {
    name: 'grounded-notes',
    content: [
      '---',
      'kind: system',
      'title: Grounded note-taking',
      'description: Answers stay close to the selected sources.',
      '---',
      '',
      'You are a careful note-taking assistant. Work only from the',
      'provided selections. Quote supporting passages exactly. Prefer',
      'short, structured markdown over prose walls.'
    ].join('\n')
  },
  {
    name: 'key-points',
    content: [
      '---',
      'kind: message',
      'title: Key points',
      'description: Selection to a compact bullet list.',
      '---',
      '',
      'Extract the key points of the selection as a compact bullet',
      'list, one point per line, exact quotes where they matter.'
    ].join('\n')
  },
  {
    name: 'open-questions',
    content: [
      '---',
      'kind: message',
      'title: Open questions',
      'description: What the selection leaves unanswered.',
      '---',
      '',
      'List the open questions the selection raises but does not',
      'answer. One question per line.'
    ].join('\n')
  }
]

/**
 * Built-in block overrides (S07b3, owner: "create a tree hierarchy in
 * prompts/built-in with all of that — I need to manage every bit of
 * token sent"): a `built-in/` subfolder of any prompts/ scope holds
 * one file per template block (`<block-id>.md`). The file's body
 * (below an optional frontmatter fence) replaces that block VERBATIM
 * in the composed system message. Resolution walks the SAME chain as
 * prompts — nearest scope wins per block. Being a subfolder, these
 * files never join the prompt menus (collectPromptRefs reads direct
 * children only).
 */
export const BUILTIN_SUBFOLDER = 'built-in'

/** Body below an optional frontmatter fence; null when empty. */
export function parseBuiltinBlockFile(rawContent: string): string | null {
  const content = rawContent.replace(/\r\n/g, '\n')
  const fence = /^---\n[\s\S]*?\n---\n?/.exec(content)
  const body = (fence ? content.slice(fence[0].length) : content).trim()
  return body.length > 0 ? body : null
}

/** Nearest-wins refs for every overridden block along the chain. */
export function collectBuiltinRefs(
  tree: VaultFolder,
  noteRelPath: string
): Partial<Record<BuiltinBlockId, string>> {
  const refs: Partial<Record<BuiltinBlockId, string>> = {}
  for (const promptsPath of promptFolderChainFor(noteRelPath)) {
    const folder = findFolder(tree, `${promptsPath}/${BUILTIN_SUBFOLDER}`)
    if (!folder) continue
    for (const note of folder.notes) {
      const name = note.name.replace(/\.md$/i, '') as BuiltinBlockId
      if (!(BUILTIN_BLOCK_IDS as readonly string[]).includes(name)) continue
      if (refs[name]) continue
      refs[name] = note.relPath
    }
  }
  return refs
}

/** The note's resolved built-in overrides; a failed read or an empty
 *  body degrades to that block's default (absent from the map). */
export async function loadBuiltinOverridesFor(
  noteRelPath: string,
  verbs: PromptVerbs
): Promise<BuiltinOverrides> {
  const tree = await verbs.listVaultFiles()
  const refs = collectBuiltinRefs(tree, noteRelPath)
  const overrides: BuiltinOverrides = {}
  for (const [id, relPath] of Object.entries(refs) as Array<
    [BuiltinBlockId, string]
  >) {
    try {
      const body = parseBuiltinBlockFile((await verbs.readNote(relPath)).content)
      if (body) overrides[id] = body
    } catch {
      /* unreadable override = default block */
    }
  }
  return overrides
}

const BUILTIN_BLOCK_DESCRIPTIONS: Record<BuiltinBlockId, string> = {
  identity: 'The Role section when no system stack is picked.',
  'grounding-rules': 'The Rules > Grounding section — the mechanical contract.',
  'grounding-rules-chat':
    'The Rules > Grounding section of CHAT sends — conversation-first, same quote contract.',
  'output-replace-selection': 'The Rules > Output brief for replace-selection runs.',
  'output-append': 'The Rules > Output brief for append runs.',
  'output-new-note': 'The Rules > Output brief for new-note runs.',
  'output-chat': 'The Rules > Output brief for CHAT sends.',
  'closing-rule': 'The closing line of Rules > Output.'
}

/** One materialized block file: frontmatter documents the contract,
 *  the body IS the block — byte-identical to its default, so a fresh
 *  materialization never changes a request. */
export function builtinBlockFileContent(id: BuiltinBlockId): string {
  return [
    '---',
    'kind: builtin',
    `title: ${promptTitleFor(id)}`,
    `description: ${BUILTIN_BLOCK_DESCRIPTIONS[id]} Edit the body — it replaces this block verbatim in every request.`,
    '---',
    '',
    BUILTIN_BLOCK_DEFAULTS[id]
  ].join('\n')
}

export type MaterializeVerbs = {
  listVaultFiles: () => Promise<VaultFolder>
  createNote: (relPath: string, content?: string) => Promise<unknown>
}

/**
 * The explicit built-in materialize action (root scope, mirroring the
 * starter action): creates the MISSING `prompts/built-in/<id>.md`
 * files. Idempotent — an edited block is never touched, a deleted one
 * can be re-materialized. Returns the created ids.
 */
export async function materializeBuiltinBlocks(
  verbs: MaterializeVerbs
): Promise<string[]> {
  const tree = await verbs.listVaultFiles()
  const existing = new Set(
    (findFolder(tree, `prompts/${BUILTIN_SUBFOLDER}`)?.notes ?? []).map((note) =>
      note.name.replace(/\.md$/i, '')
    )
  )
  const created: string[] = []
  for (const id of BUILTIN_BLOCK_IDS) {
    if (existing.has(id)) continue
    await verbs.createNote(
      `prompts/${BUILTIN_SUBFOLDER}/${id}.md`,
      builtinBlockFileContent(id)
    )
    created.push(id)
  }
  return created
}

/**
 * The explicit starter action: creates the MISSING starter prompts at
 * the vault root (createNote materializes the folder + its index/log
 * conventions, S07k). Idempotent — existing files are never touched,
 * so a deleted starter can be re-materialized and an edited one is
 * safe. Returns the created names.
 */
export async function materializeStarterPrompts(
  verbs: MaterializeVerbs
): Promise<string[]> {
  const tree = await verbs.listVaultFiles()
  const existing = new Set(
    (findFolder(tree, 'prompts')?.notes ?? []).map((note) =>
      note.name.replace(/\.md$/i, '')
    )
  )
  const created: string[] = []
  for (const starter of STARTER_PROMPTS) {
    if (existing.has(starter.name)) continue
    await verbs.createNote(`prompts/${starter.name}.md`, starter.content)
    created.push(starter.name)
  }
  return created
}
