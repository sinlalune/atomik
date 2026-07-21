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
  content: string
): { kind: PromptKind; title?: string; description?: string; body: string } | null {
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
  return prompts
}

/** Scope tag for menus — shadowing stays VISIBLE, never magic. */
export function scopeLabel(scopeFolder: string, noteRelPath: string): string {
  if (scopeFolder.length === 0) return 'vault'
  const noteDir = noteRelPath.split('/').slice(0, -1).join('/')
  return scopeFolder === noteDir ? 'this folder' : scopeFolder
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
