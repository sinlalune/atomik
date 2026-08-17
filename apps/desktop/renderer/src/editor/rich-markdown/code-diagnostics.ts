import { syntaxTree } from '@codemirror/language'
import {
  lintGutter,
  lintKeymap,
  linter,
  type Diagnostic
} from '@codemirror/lint'
import type { EditorState, Extension } from '@codemirror/state'
import { keymap } from '@codemirror/view'
import {
  DEFAULT_RICH_LIMITS,
  type RichDiagnostic
} from './contracts'
import { codeLanguageForFence } from './code-languages'
import { richKindForFence } from './syntax'

const MAX_DIAGNOSTICS_PER_BLOCK = 100
const MAX_DIAGNOSTIC_BLOCKS = 64
const MAX_DOCUMENT_DIAGNOSTICS = 200

/** Executable scope pin. Diagnostics are decoration; every other LSP-shaped
 * capability stays false and no action enters a CodeMirror diagnostic. */
export const CODE_FEEDBACK_CAPABILITIES = Object.freeze({
  diagnostics: true,
  diagnosticActions: false,
  serverDiscovery: false,
  processSpawn: false,
  protocolTransport: false,
  virtualDocuments: false,
  virtualWorkspace: false,
  completion: false,
  signatureHelp: false,
  protocolHover: false,
  definition: false,
  references: false,
  documentSymbols: false,
  rename: false,
  formatting: false,
  codeActions: false,
  semanticTokens: false,
  inlayHints: false,
  callHierarchy: false,
  typeHierarchy: false,
  workspaceEdits: false,
  workspaceSymbols: false,
  workspaceIndexing: false
})

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength
}

function abortError(signal: AbortSignal): Error {
  return signal.reason instanceof Error
    ? signal.reason
    : new Error('Code diagnostics cancelled')
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortError(signal)
}

function lineColumn(source: string, offset: number): {
  line: number
  column: number
} {
  let line = 1
  let column = 1
  for (let at = 0; at < offset; at += 1) {
    if (source.charCodeAt(at) === 10) {
      line += 1
      column = 1
    } else {
      column += 1
    }
  }
  return { line, column }
}

function visibleRange(
  from: number,
  to: number,
  sourceLength: number
): { from: number; to: number } {
  let start = Math.max(0, Math.min(from, sourceLength))
  let end = Math.max(start, Math.min(to, sourceLength))
  if (start === end && sourceLength > 0) {
    if (end < sourceLength) end += 1
    else start -= 1
  }
  return { from: start, to: end }
}

export async function analyzeCodeSource(
  source: string,
  info: string,
  options: {
    signal?: AbortSignal
    maxDiagnostics?: number
  } = {}
): Promise<RichDiagnostic[]> {
  const description = codeLanguageForFence(info)
  if (!description) return []
  throwIfAborted(options.signal)
  const support = await description.load()
  throwIfAborted(options.signal)

  const tree = support.language.parser.parse(source)
  throwIfAborted(options.signal)
  const diagnostics: RichDiagnostic[] = []
  const seen = new Set<string>()
  const maximum = Math.max(
    0,
    Math.min(
      options.maxDiagnostics ?? MAX_DIAGNOSTICS_PER_BLOCK,
      MAX_DIAGNOSTICS_PER_BLOCK
    )
  )
  tree.iterate({
    enter(node) {
      if (!node.type.isError || diagnostics.length >= maximum) return
      const range = visibleRange(node.from, node.to, source.length)
      const key = `${range.from}:${range.to}`
      if (seen.has(key)) return
      seen.add(key)
      const position = lineColumn(source, range.from)
      diagnostics.push({
        from: range.from,
        to: range.to,
        severity: 'error',
        message: `Syntax error at line ${position.line}, column ${position.column}.`,
        source: `${description.name} parser`,
        code: 'syntax-error'
      })
    }
  })
  return diagnostics
}

export function mapFenceDiagnostic(
  diagnostic: RichDiagnostic,
  sourceFrom: number,
  sourceLength: number,
  documentLength: number
): RichDiagnostic {
  const relative = visibleRange(
    diagnostic.from,
    diagnostic.to,
    sourceLength
  )
  const from = Math.max(
    0,
    Math.min(sourceFrom + relative.from, documentLength)
  )
  const to = Math.max(
    from,
    Math.min(sourceFrom + relative.to, documentLength)
  )
  return { ...diagnostic, from, to }
}

function skippedDiagnostic(
  source: string,
  message: string
): RichDiagnostic {
  return {
    from: 0,
    to: Math.min(1, source.length),
    severity: 'info',
    message,
    source: 'Atomik code diagnostics',
    code: 'diagnostic-limit'
  }
}

export async function codeDiagnosticsForMarkdownState(
  state: EditorState
): Promise<RichDiagnostic[]> {
  const fences: Array<{
    source: string
    sourceFrom: number
    info: string
  }> = []
  const omitted: Array<{ source: string; sourceFrom: number }> = []
  syntaxTree(state).iterate({
    enter(node) {
      if (node.name !== 'FencedCode') return
      const infoNode = node.node.getChild('CodeInfo')
      const info = infoNode
        ? state.doc.sliceString(infoNode.from, infoNode.to)
        : ''
      if (richKindForFence(info)) return false
      if (!codeLanguageForFence(info)) return false
      const code = node.node.getChild('CodeText')
      if (!code) return false
      if (fences.length >= MAX_DIAGNOSTIC_BLOCKS) {
        if (omitted.length === 0) {
          omitted.push({
            source: state.doc.sliceString(code.from, code.to),
            sourceFrom: code.from
          })
        }
        return false
      }
      fences.push({
        source: state.doc.sliceString(code.from, code.to),
        sourceFrom: code.from,
        info
      })
      return false
    }
  })

  const groups = await Promise.all(
    fences.map(async ({ source, sourceFrom, info }) => {
      let relative: RichDiagnostic[]
      if (byteLength(source) > DEFAULT_RICH_LIMITS.code.maxSourceBytes) {
        relative = [
          skippedDiagnostic(
            source,
            `Diagnostics skipped above ${DEFAULT_RICH_LIMITS.code.maxSourceBytes} bytes.`
          )
        ]
      } else if (source.split(/\r?\n/).length > DEFAULT_RICH_LIMITS.code.maxLines) {
        relative = [
          skippedDiagnostic(
            source,
            `Diagnostics skipped above ${DEFAULT_RICH_LIMITS.code.maxLines} lines.`
          )
        ]
      } else {
        try {
          relative = await analyzeCodeSource(source, info)
        } catch {
          // No result is more honest than inventing a parser diagnostic when
          // a lazy provider is unavailable.
          relative = []
        }
      }
      return relative.map((diagnostic) =>
        mapFenceDiagnostic(
          diagnostic,
          sourceFrom,
          source.length,
          state.doc.length
        )
      )
    })
  )
  const diagnostics = groups.flat()
  const firstOmitted = omitted[0]
  if (!firstOmitted) return diagnostics.slice(0, MAX_DOCUMENT_DIAGNOSTICS)
  const summary = mapFenceDiagnostic(
    skippedDiagnostic(
      firstOmitted.source,
      `Diagnostics limited to the first ${MAX_DIAGNOSTIC_BLOCKS} code blocks.`
    ),
    firstOmitted.sourceFrom,
    firstOmitted.source.length,
    state.doc.length
  )
  return [
    ...diagnostics.slice(0, MAX_DOCUMENT_DIAGNOSTICS - 1),
    summary
  ]
}

function toCodeMirrorDiagnostic(diagnostic: RichDiagnostic): Diagnostic {
  return {
    from: diagnostic.from,
    to: diagnostic.to,
    severity: diagnostic.severity,
    source: diagnostic.source,
    message: diagnostic.code
      ? `${diagnostic.message} [${diagnostic.code}]`
      : diagnostic.message
  }
}

/** Source mode only: squiggles, gutter markers, tooltip/panel messages and
 * keyboard navigation. The returned diagnostics never carry actions. */
export function sourceCodeDiagnostics(): Extension {
  return [
    linter(
      async (view) =>
        (await codeDiagnosticsForMarkdownState(view.state)).map(
          toCodeMirrorDiagnostic
        ),
      { delay: 300, autoPanel: false }
    ),
    lintGutter(),
    keymap.of(lintKeymap)
  ]
}
