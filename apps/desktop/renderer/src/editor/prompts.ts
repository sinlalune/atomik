import type { VaultFolder } from '../../../shared/ipc-contract'

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

export type MaterializeVerbs = {
  listVaultFiles: () => Promise<VaultFolder>
  createNote: (relPath: string, content?: string) => Promise<unknown>
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
