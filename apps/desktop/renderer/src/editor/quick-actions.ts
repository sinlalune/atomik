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
import { resourceOf } from '../source/dossier'

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

/**
 * The markdown to insert for a picked bundle. Image resource → embed;
 * anything else → a plain link to the dossier. Angle brackets always:
 * they keep destinations with spaces valid CommonMark.
 */
export function insertionFor(
  notePath: string,
  bundle: SourceBundle,
  resourceVaultRel: string | null
): string {
  if (resourceVaultRel) {
    return `![${bundle.name}](<${relativePathBetween(notePath, resourceVaultRel)}>)`
  }
  return `[${bundle.name}](<${relativePathBetween(notePath, bundle.dossierPath)}>)`
}

const IMAGE_RESOURCE = /\.(jpe?g|png|webp|heic|heif)$/i

/** The bundle's original as a vault-relative path, when it is an image. */
async function imageResourceOf(bundle: SourceBundle): Promise<string | null> {
  try {
    const dossier = await atomik().readNote(bundle.dossierPath)
    const resource = resourceOf(dossier.content)
    if (!resource || !IMAGE_RESOURCE.test(resource)) return null
    return resolveRelativePath(bundle.dossierPath, resource)
  } catch {
    return null
  }
}

/** Completion source: `@` + optional filter, capture bundles as options. */
export function quickActionsSource(
  notePath: string,
  listBundles: () => Promise<SourceBundle[]>
) {
  return async (context: CompletionContext): Promise<CompletionResult | null> => {
    const match = context.matchBefore(/@[^\s@]*/)
    if (!match && !context.explicit) return null
    const from = match ? match.from : context.pos
    const bundles = await listBundles()
    const options: Completion[] = bundles.map((bundle) => ({
      label: `@${bundle.name}`,
      displayLabel: bundle.name,
      detail: 'capture',
      type: 'variable',
      apply: (view: EditorView, _completion, applyFrom, applyTo) => {
        void imageResourceOf(bundle).then((resourceRel) => {
          view.dispatch({
            changes: {
              from: applyFrom,
              to: applyTo,
              insert: insertionFor(notePath, bundle, resourceRel)
            }
          })
        })
      }
    }))
    return { from, options, validFor: /^@[^\s@]*$/ }
  }
}

export function quickActions(
  notePath: string,
  listBundles: () => Promise<SourceBundle[]>
): Extension {
  return autocompletion({
    override: [quickActionsSource(notePath, listBundles)],
    activateOnTyping: true,
    icons: false
  })
}
