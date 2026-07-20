import {
  autocompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult
} from '@codemirror/autocomplete'
import type { Extension } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import type { AtomikApi, VaultFolder } from '../../../shared/ipc-contract'

/** The preload bridge, reached at call time only (this module is also
 *  imported by headless node tests, which never apply completions). */
const atomik = (): AtomikApi =>
  (globalThis as unknown as { atomik: AtomikApi }).atomik
import { resolveRelativePath } from '../dev-docs/markdown'
import { pageAnchorsOf, resourceOf, type PageAnchor } from '../source/dossier'

/**
 * "@" quick actions (owner request): typing `@` in the editor opens a
 * menu of insertable things; the first provider is CAPTURES — every
 * source bundle in the vault, filtered as you type (`@pas…`), inserted
 * as a ready image embed so nobody has to remember `![](<…>)` syntax.
 * Built on @codemirror/autocomplete with ONLY this source registered:
 * no word-completion noise. More providers (notes, projects) can join
 * the same menu later.
 */

export type SourceBundle = {
  /** Bundle folder name — the human handle in the menu. */
  name: string
  /** Vault-relative path of the bundle's source.md. */
  dossierPath: string
}

/** A plain vault note the "@" menu can link to (S07h, owner request:
 *  "add link note action" — the reserved notes provider joins). */
export type NoteLink = {
  /** Filename without `.md` — the human handle in the menu. */
  name: string
  relPath: string
}

/** Bundle CONTRACT files — they already surface through their bundle's
 *  own entries (dossier link, citations, derived quotes), so the notes
 *  provider skips them; ordinary notes LIVING in a bundle folder stay
 *  linkable (the S07e-e rule: the contract is protected, not the
 *  location). */
const BUNDLE_CONTRACT_FILES = new Set([
  'source.md',
  'index.md',
  'extracted.md',
  'transcript.md',
  'reader.md'
])

/** Shared leading path segments between a note's folder and the
 *  editing note's folder — the proximity key for menu ordering. */
function sharedFolderDepth(relPath: string, editingDir: string[]): number {
  const dir = relPath.split('/').slice(0, -1)
  let shared = 0
  while (
    shared < dir.length &&
    shared < editingDir.length &&
    dir[shared] === editingDir[shared]
  ) {
    shared += 1
  }
  return shared
}

/** Every linkable note: all `.md` files except the note being edited
 *  and except contract files inside a bundle folder. Ordered by the
 *  INVERSE tree hierarchy (owner, 2026-07-20): the current folder
 *  first, then each level up toward the vault root — nearest notes are
 *  the likeliest link targets. Within a level: shallower paths first,
 *  then name. Pure. */
export function linkableNotesOf(
  tree: VaultFolder,
  editingRelPath: string
): NoteLink[] {
  const editingDir = editingRelPath.split('/').slice(0, -1)
  const notes: NoteLink[] = []
  const walk = (folder: VaultFolder): void => {
    const isBundle = folder.notes.some((note) => note.name === 'source.md')
    for (const note of folder.notes) {
      if (note.relPath === editingRelPath) continue
      if (isBundle && BUNDLE_CONTRACT_FILES.has(note.name)) continue
      notes.push({ name: note.name.replace(/\.md$/i, ''), relPath: note.relPath })
    }
    for (const child of folder.folders) walk(child)
  }
  walk(tree)
  return notes.sort((a, b) => {
    const proximity =
      sharedFolderDepth(b.relPath, editingDir) -
      sharedFolderDepth(a.relPath, editingDir)
    if (proximity !== 0) return proximity
    const depth = a.relPath.split('/').length - b.relPath.split('/').length
    if (depth !== 0) return depth
    return a.name.localeCompare(b.name)
  })
}

/** The menu entry for a linkable note: inserts a relative markdown
 *  link, angle-bracketed like every other insertion. */
export function noteLinkEntry(notePath: string, note: NoteLink): BundleEntry {
  return {
    kind: 'note',
    title: note.name,
    label: `@${note.name}`,
    detail: 'link',
    insertion: {
      text: `[${note.name}](<${relativePathBetween(notePath, note.relPath)}>)`
    }
  }
}

/** Every folder holding a `source.md` is a source bundle (07). Pure. */
export function sourceBundlesOf(tree: VaultFolder): SourceBundle[] {
  const bundles: SourceBundle[] = []
  const walk = (folder: VaultFolder): void => {
    if (folder.notes.some((note) => note.name === 'source.md')) {
      bundles.push({
        name: folder.name,
        dossierPath: folder.relPath === '' ? 'source.md' : `${folder.relPath}/source.md`
      })
    }
    for (const child of folder.folders) walk(child)
  }
  walk(tree)
  return bundles.sort((a, b) => a.name.localeCompare(b.name))
}

/** `../`-style path from the note's folder to a vault-relative target. */
export function relativePathBetween(
  fromNoteRelPath: string,
  targetRelPath: string
): string {
  const fromDir = fromNoteRelPath.split('/').slice(0, -1)
  const target = targetRelPath.split('/')
  let common = 0
  while (
    common < fromDir.length &&
    common < target.length - 1 &&
    fromDir[common] === target[common]
  ) {
    common += 1
  }
  const ups = fromDir.length - common
  return [...Array<string>(ups).fill('..'), ...target.slice(common)].join('/')
}

/** What to insert, plus an optional selection (offsets INTO text) the
 *  editor places the cursor on — e.g. a citation's page number, ready
 *  to be typed over. */
export type Insertion = { text: string; selectFrom?: number; selectTo?: number }

/**
 * The markdown to insert for a picked bundle. Image resource → embed;
 * PDF resource → a page CITATION with the page number pre-selected
 * (S06: nobody hand-types bundle paths); anything else → a plain link
 * to the dossier. Angle brackets always: they keep destinations with
 * spaces valid CommonMark.
 */
export function insertionFor(
  notePath: string,
  bundle: SourceBundle,
  resource: ResourceInfo | null
): Insertion {
  if (resource?.kind === 'image') {
    return {
      text: `![${bundle.name}](<${relativePathBetween(notePath, resource.vaultRel)}>)`
    }
  }
  if (resource?.kind === 'pdf') {
    // the label carries no page number — only the target does, so the
    // selected digit is the single thing to type over (no label drift)
    const text = `[${bundle.name}](<${relativePathBetween(notePath, resource.vaultRel)}#page=1>)`
    const selectTo = text.length - 2 // just before `>)`
    return { text, selectFrom: selectTo - 1, selectTo }
  }
  if (resource?.kind === 'web') {
    // a web citation points at the LIVE page (the dossier link is a
    // separate menu entry); the URL is absolute, no relative path
    return { text: `[${bundle.name}](<${resource.url}>)` }
  }
  return {
    text: `[${bundle.name}](<${relativePathBetween(notePath, bundle.dossierPath)}>)`
  }
}

const IMAGE_RESOURCE = /\.(jpe?g|png|webp|heic|heif)$/i
const PDF_RESOURCE = /\.pdf$/i
const WEB_RESOURCE = /^https?:/i

export type ResourceInfo =
  | { kind: 'image' | 'pdf'; vaultRel: string }
  | { kind: 'web'; url: string }

/** Dossier content accessor — injected so tests run headless and the
 *  live app can cache; null when unreadable. */
export type DossierReader = (dossierPath: string) => Promise<string | null>

/** The bundle's original (image or pdf) as a vault-relative path. */
export function resourceInfoFrom(
  bundle: SourceBundle,
  dossierContent: string
): ResourceInfo | null {
  const resource = resourceOf(dossierContent)
  if (!resource) return null
  // a web source's resource IS the URL — no vault path to resolve
  if (WEB_RESOURCE.test(resource)) return { kind: 'web', url: resource }
  const vaultRel = resolveRelativePath(bundle.dossierPath, resource)
  if (!vaultRel) return null
  if (IMAGE_RESOURCE.test(resource)) return { kind: 'image', vaultRel }
  if (PDF_RESOURCE.test(resource)) return { kind: 'pdf', vaultRel }
  return null
}

/** An exact citation to a RECORDED anchor — target fixed, no selection. */
export function anchorInsertionFor(
  notePath: string,
  bundle: SourceBundle,
  resourceVaultRel: string,
  anchor: PageAnchor
): Insertion {
  return {
    text: `[${bundle.name} — ${anchor.meaning}](<${relativePathBetween(notePath, resourceVaultRel)}#page=${anchor.page}>)`
  }
}

/** A derived text quoted into the note as a block, with its citation
 *  (S06f, owner request): the body travels INTO the note — corrected
 *  text becomes writable material — and the link points home. */
export function quoteBlockFor(
  bundleName: string,
  kind: 'extracted text' | 'transcript' | 'reader text',
  body: string,
  citationRel: string
): string {
  const quoted = body
    .trim()
    .split('\n')
    .map((line) => (line.length > 0 ? `> ${line}` : '>'))
    .join('\n')
  return `> **${bundleName} — ${kind}** ([source](<${citationRel}>))\n>\n${quoted}\n`
}

export type BundleEntry = {
  /** Which pill the row leads with (owner format, 2026-07-20: kind
   *  pill, then doc title, then action label). */
  kind: 'source' | 'note'
  /** The doc title shown as the row's main text. */
  title: string
  /** Filter string (matched as typed; includes the action words). */
  label: string
  /** The action label after the title. */
  detail: string
  insertion?: Insertion
  /** Deferred body (derived files are read at APPLY time, not menu time). */
  loadInsertion?: () => Promise<Insertion>
}

/** All menu entries for one bundle (S06c, owner feedback: the menu must
 *  offer the CHOICES — dossier link, free-page citation, and every
 *  recorded anchor — not force one). */
export function bundleCompletions(
  notePath: string,
  bundle: SourceBundle,
  dossierContent: string | null
): BundleEntry[] {
  const resource = dossierContent ? resourceInfoFrom(bundle, dossierContent) : null
  if (resource?.kind === 'image') {
    return [
      {
        kind: 'source',
        title: bundle.name,
        label: `@${bundle.name}`,
        detail: 'capture — image embed',
        insertion: insertionFor(notePath, bundle, resource)
      },
      {
        kind: 'source',
        title: bundle.name,
        label: `@${bundle.name} dossier`,
        detail: 'link to source.md',
        insertion: insertionFor(notePath, bundle, null)
      }
    ]
  }
  if (resource?.kind === 'pdf') {
    const anchors = dossierContent ? pageAnchorsOf(dossierContent) : []
    return [
      {
        kind: 'source',
        title: bundle.name,
        label: `@${bundle.name} page…`,
        detail: 'PDF citation — type the page',
        insertion: insertionFor(notePath, bundle, resource)
      },
      ...anchors.map(
        (anchor): BundleEntry => ({
          kind: 'source',
          title: bundle.name,
          label: `@${bundle.name} ${anchor.anchor}`,
          detail: `anchor — ${anchor.meaning}`,
          insertion: anchorInsertionFor(notePath, bundle, resource.vaultRel, anchor)
        })
      ),
      {
        kind: 'source',
        title: bundle.name,
        label: `@${bundle.name} dossier`,
        detail: 'link to source.md',
        insertion: insertionFor(notePath, bundle, null)
      }
    ]
  }
  if (resource?.kind === 'web') {
    return [
      {
        kind: 'source',
        title: bundle.name,
        label: `@${bundle.name} url`,
        detail: 'web citation — the live page',
        insertion: insertionFor(notePath, bundle, resource)
      },
      {
        kind: 'source',
        title: bundle.name,
        label: `@${bundle.name} dossier`,
        detail: 'link to source.md',
        insertion: insertionFor(notePath, bundle, null)
      }
    ]
  }
  return [
    {
      kind: 'source',
      title: bundle.name,
      label: `@${bundle.name}`,
      detail: 'link to source.md',
      insertion: insertionFor(notePath, bundle, null)
    }
  ]
}

/** Derived-text entries for a bundle (S06f): whichever of extracted.md
 *  / transcript.md the dossier links becomes an insert-as-quote-block
 *  option; the body is read at APPLY time. */
export function derivedTextEntries(
  notePath: string,
  bundle: SourceBundle,
  dossierContent: string | null,
  readDossier: DossierReader
): BundleEntry[] {
  if (!dossierContent) return []
  const bundleDir = bundle.dossierPath.replace(/source\.md$/, '')
  const entries: BundleEntry[] = []
  const derived: Array<{
    file: string
    kind: 'extracted text' | 'transcript' | 'reader text'
    label: string
  }> = [
    { file: 'extracted.md', kind: 'extracted text', label: 'extracted' },
    { file: 'transcript.md', kind: 'transcript', label: 'transcript' },
    { file: 'reader.md', kind: 'reader text', label: 'reader' }
  ]
  for (const { file, kind, label } of derived) {
    if (!dossierContent.includes(`./${file}`)) continue
    const derivedPath = `${bundleDir}${file}`
    entries.push({
      kind: 'source',
      title: bundle.name,
      label: `@${bundle.name} ${label}`,
      detail: `insert ${kind} as a quote block`,
      loadInsertion: async () => {
        const content = (await readDossier(derivedPath)) ?? ''
        const body = content.replace(/^---\n[\s\S]*?\n---\n*/, '')
        return {
          text: quoteBlockFor(
            bundle.name,
            kind,
            body,
            relativePathBetween(notePath, derivedPath)
          )
        }
      }
    })
  }
  return entries
}

/** Completion source: `@` + filter over EVERY entry each bundle offers
 *  (dossier link, page citation, recorded anchors) PLUS a link entry
 *  per plain vault note (S07h). Dossiers are read at menu time through
 *  the injected reader; the tree is listed once per menu opening. */
export function quickActionsSource(
  notePath: string,
  listTree: () => Promise<VaultFolder>,
  readDossier: DossierReader
) {
  return async (context: CompletionContext): Promise<CompletionResult | null> => {
    const match = context.matchBefore(/@[^@]*/)
    if (!match && !context.explicit) return null
    const from = match ? match.from : context.pos
    const tree = await listTree()
    const bundles = sourceBundlesOf(tree)
    const noteEntries = linkableNotesOf(tree, notePath).map((note) =>
      noteLinkEntry(notePath, note)
    )
    const contents = await Promise.all(
      bundles.map((bundle) => readDossier(bundle.dossierPath))
    )
    const options: Completion[] = [
      ...bundles.flatMap((bundle, index) => {
        const content = contents[index] ?? null
        return [
          ...bundleCompletions(notePath, bundle, content),
          ...derivedTextEntries(notePath, bundle, content, readDossier)
        ]
      }),
      ...noteEntries
    ].map((entry) => ({
        label: entry.label,
        // The row reads: [kind pill] title — action label (owner format;
        // the pill renders from `type` via the completion icon slot).
        displayLabel: entry.title,
        detail: entry.detail,
        type: entry.kind,
        apply: (view: EditorView, _completion, applyFrom, applyTo) => {
          const dispatch = (insertion: Insertion): void =>
            view.dispatch({
              changes: { from: applyFrom, to: applyTo, insert: insertion.text },
              // free-page citations land with the digit selected
              ...(insertion.selectFrom !== undefined && insertion.selectTo !== undefined
                ? {
                    selection: {
                      anchor: applyFrom + insertion.selectFrom,
                      head: applyFrom + insertion.selectTo
                    }
                  }
                : {})
            })
          if (entry.insertion) dispatch(entry.insertion)
          else if (entry.loadInsertion) void entry.loadInsertion().then(dispatch)
        }
      }))
    return { from, options, validFor: /^@[^@]*$/ }
  }
}

/** Live reader with a short cache — the menu may fire per keystroke. */
const dossierCache = new Map<string, { content: string | null; at: number }>()
const readDossierCached: DossierReader = async (dossierPath) => {
  const hit = dossierCache.get(dossierPath)
  if (hit && Date.now() - hit.at < 5_000) return hit.content
  try {
    const note = await atomik().readNote(dossierPath)
    dossierCache.set(dossierPath, { content: note.content, at: Date.now() })
    return note.content
  } catch {
    dossierCache.set(dossierPath, { content: null, at: Date.now() })
    return null
  }
}

export function quickActions(
  notePath: string,
  listTree: () => Promise<VaultFolder>
): Extension {
  return autocompletion({
    override: [quickActionsSource(notePath, listTree, readDossierCached)],
    activateOnTyping: true,
    // The icon slot renders the kind PILL (note/source) — styled in
    // styles.css from the cm-completionIcon-<type> class.
    icons: true
  })
}
