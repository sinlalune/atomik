import {
  LanguageDescription,
  type Language
} from '@codemirror/language'
import { languages } from '@codemirror/language-data'
import { firstFenceInfo } from './syntax'

/** CodeMirror's catalog contains lazy LanguageDescription loaders. Keep its
 * metadata eager, but never use the library's fuzzy match: `script` must not
 * silently become JavaScript and a typo must remain plain text. */
export const codeLanguageDescriptions: readonly LanguageDescription[] =
  languages

export function codeLanguageForFence(
  info: string
): LanguageDescription | null {
  const name = firstFenceInfo(info)
  if (!name) return null
  const named = LanguageDescription.matchLanguageName(
    codeLanguageDescriptions,
    name,
    false
  )
  if (named) return named
  return (
    codeLanguageDescriptions.find((description) =>
      description.extensions.some(
        (extension) => extension.toLowerCase() === name
      )
    ) ?? null
  )
}

/** Synchronous resolver handed to @codemirror/lang-markdown. The returned
 * description owns its async grammar load and CodeMirror reparses when ready. */
export function codeMirrorFenceLanguage(
  info: string
): Language | LanguageDescription | null {
  return codeLanguageForFence(info)
}
