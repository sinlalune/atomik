import type { HighlighterCore, LanguageInput } from '@shikijs/core'
import {
  createCodeAdapter,
  type CodeHighlighterRuntime,
  type CodeLanguage
} from './code-core'
import { firstFenceInfo } from '../syntax'

type LanguageDefinition = CodeLanguage & {
  aliases: readonly string[]
  load(): Promise<LanguageInput>
}

const LANGUAGE_DEFINITIONS: readonly LanguageDefinition[] = [
  { id: 'javascript', label: 'JavaScript', aliases: ['js', 'mjs', 'cjs', 'node'], load: () => import('@shikijs/langs/javascript').then((module) => module.default) },
  { id: 'typescript', label: 'TypeScript', aliases: ['ts', 'mts', 'cts'], load: () => import('@shikijs/langs/typescript').then((module) => module.default) },
  { id: 'jsx', label: 'JSX', aliases: [], load: () => import('@shikijs/langs/jsx').then((module) => module.default) },
  { id: 'tsx', label: 'TSX', aliases: [], load: () => import('@shikijs/langs/tsx').then((module) => module.default) },
  { id: 'html', label: 'HTML', aliases: ['htm'], load: () => import('@shikijs/langs/html').then((module) => module.default) },
  { id: 'css', label: 'CSS', aliases: [], load: () => import('@shikijs/langs/css').then((module) => module.default) },
  { id: 'scss', label: 'SCSS', aliases: [], load: () => import('@shikijs/langs/scss').then((module) => module.default) },
  { id: 'json', label: 'JSON', aliases: [], load: () => import('@shikijs/langs/json').then((module) => module.default) },
  { id: 'json5', label: 'JSON5', aliases: [], load: () => import('@shikijs/langs/json5').then((module) => module.default) },
  { id: 'jsonc', label: 'JSON with comments', aliases: [], load: () => import('@shikijs/langs/jsonc').then((module) => module.default) },
  { id: 'yaml', label: 'YAML', aliases: ['yml'], load: () => import('@shikijs/langs/yaml').then((module) => module.default) },
  { id: 'toml', label: 'TOML', aliases: [], load: () => import('@shikijs/langs/toml').then((module) => module.default) },
  { id: 'markdown', label: 'Markdown', aliases: ['md'], load: () => import('@shikijs/langs/markdown').then((module) => module.default) },
  { id: 'mdx', label: 'MDX', aliases: [], load: () => import('@shikijs/langs/mdx').then((module) => module.default) },
  { id: 'bash', label: 'Shell', aliases: ['sh', 'shell', 'shellscript', 'zsh'], load: () => import('@shikijs/langs/bash').then((module) => module.default) },
  { id: 'powershell', label: 'PowerShell', aliases: ['ps1', 'pwsh'], load: () => import('@shikijs/langs/powershell').then((module) => module.default) },
  { id: 'python', label: 'Python', aliases: ['py'], load: () => import('@shikijs/langs/python').then((module) => module.default) },
  { id: 'sql', label: 'SQL', aliases: [], load: () => import('@shikijs/langs/sql').then((module) => module.default) },
  { id: 'graphql', label: 'GraphQL', aliases: ['gql'], load: () => import('@shikijs/langs/graphql').then((module) => module.default) },
  { id: 'dockerfile', label: 'Dockerfile', aliases: ['docker'], load: () => import('@shikijs/langs/dockerfile').then((module) => module.default) },
  { id: 'xml', label: 'XML', aliases: ['svg'], load: () => import('@shikijs/langs/xml').then((module) => module.default) },
  { id: 'c', label: 'C', aliases: [], load: () => import('@shikijs/langs/c').then((module) => module.default) },
  { id: 'cpp', label: 'C++', aliases: ['c++', 'cc', 'cxx'], load: () => import('@shikijs/langs/cpp').then((module) => module.default) },
  { id: 'csharp', label: 'C#', aliases: ['cs', 'c#'], load: () => import('@shikijs/langs/csharp').then((module) => module.default) },
  { id: 'java', label: 'Java', aliases: [], load: () => import('@shikijs/langs/java').then((module) => module.default) },
  { id: 'kotlin', label: 'Kotlin', aliases: ['kt', 'kts'], load: () => import('@shikijs/langs/kotlin').then((module) => module.default) },
  { id: 'go', label: 'Go', aliases: ['golang'], load: () => import('@shikijs/langs/go').then((module) => module.default) },
  { id: 'rust', label: 'Rust', aliases: ['rs'], load: () => import('@shikijs/langs/rust').then((module) => module.default) },
  { id: 'ruby', label: 'Ruby', aliases: ['rb'], load: () => import('@shikijs/langs/ruby').then((module) => module.default) },
  { id: 'php', label: 'PHP', aliases: [], load: () => import('@shikijs/langs/php').then((module) => module.default) },
  { id: 'swift', label: 'Swift', aliases: [], load: () => import('@shikijs/langs/swift').then((module) => module.default) },
  { id: 'dart', label: 'Dart', aliases: [], load: () => import('@shikijs/langs/dart').then((module) => module.default) },
  { id: 'lua', label: 'Lua', aliases: [], load: () => import('@shikijs/langs/lua').then((module) => module.default) },
  { id: 'diff', label: 'Diff', aliases: ['patch'], load: () => import('@shikijs/langs/diff').then((module) => module.default) },
  { id: 'ini', label: 'INI', aliases: ['conf'], load: () => import('@shikijs/langs/ini').then((module) => module.default) },
  { id: 'vue', label: 'Vue', aliases: [], load: () => import('@shikijs/langs/vue').then((module) => module.default) },
  { id: 'svelte', label: 'Svelte', aliases: [], load: () => import('@shikijs/langs/svelte').then((module) => module.default) }
]

const LANGUAGES = new Map<string, LanguageDefinition>()
for (const definition of LANGUAGE_DEFINITIONS) {
  LANGUAGES.set(definition.id, definition)
  for (const alias of definition.aliases) LANGUAGES.set(alias, definition)
}

export const SHIKI_LANGUAGE_IDS = Object.freeze(
  LANGUAGE_DEFINITIONS.map((definition) => definition.id)
)

export function shikiLanguageForFence(info: string): CodeLanguage | null {
  const definition = LANGUAGES.get(firstFenceInfo(info))
  return definition ? { id: definition.id, label: definition.label } : null
}

async function loadShikiRuntime(): Promise<CodeHighlighterRuntime> {
  const [core, engine, light, dark] = await Promise.all([
    import('@shikijs/core'),
    import('@shikijs/engine-javascript'),
    import('@shikijs/themes/github-light-default'),
    import('@shikijs/themes/github-dark-default')
  ])
  const highlighter: HighlighterCore = await core.createHighlighterCore({
    engine: engine.createJavaScriptRegexEngine(),
    themes: [light.default, dark.default],
    langs: [],
    warnings: false
  })
  const loaded = new Set<string>()
  const loading = new Map<string, Promise<void>>()
  let tail: Promise<void> = Promise.resolve()

  const ensureLanguage = (language: string): Promise<void> => {
    if (loaded.has(language)) return Promise.resolve()
    const existing = loading.get(language)
    if (existing) return existing
    const definition = LANGUAGES.get(language)
    if (!definition) {
      return Promise.reject(new Error(`Unknown Shiki language ${language}`))
    }
    const pending = tail.then(async () => {
      const registration = await definition.load()
      await highlighter.loadLanguage(registration)
      loaded.add(language)
    })
    tail = pending.catch(() => undefined)
    loading.set(language, pending)
    void pending.then(
      () => loading.delete(language),
      () => loading.delete(language)
    )
    return pending
  }

  return {
    async highlight(source, language, scheme) {
      await ensureLanguage(language)
      return highlighter.codeToTokens(source, {
        lang: language,
        theme:
          scheme === 'dark'
            ? 'github-dark-default'
            : 'github-light-default',
        tokenizeMaxLineLength: 20_000,
        tokenizeTimeLimit: 200
      })
    },
    dispose() {
      highlighter.dispose()
      loaded.clear()
      loading.clear()
    }
  }
}

export const codeAdapter = createCodeAdapter({
  languageFor: shikiLanguageForFence,
  loadRuntime: loadShikiRuntime
})
