import type {
  RichDiagnostic,
  RichRenderHandle,
  RichRenderRequest,
  RichRendererAdapter
} from '../contracts'
import { analyzeCodeSource } from '../code-diagnostics'
import { firstFenceInfo } from '../syntax'

export type CodeLanguage = {
  id: string
  label: string
}

export type CodeToken = {
  content: string
  offset: number
  color?: string
  fontStyle?: number
}

export type CodeHighlight = {
  tokens: CodeToken[][]
}

export type CodeHighlighterRuntime = {
  highlight(
    source: string,
    language: string,
    scheme: 'light' | 'dark'
  ): Promise<CodeHighlight>
  dispose(): void
}

export type CodeAdapterSeat = {
  languageFor(info: string): CodeLanguage | null
  loadRuntime(): Promise<CodeHighlighterRuntime>
  writeText?(document: Document, text: string): Promise<void>
}

const HARD_LIMITS = {
  sourceBytes: 256 * 1024,
  lines: 20_000
} as const

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength
}

function limit(value: number, hardLimit: number): number {
  return Number.isFinite(value)
    ? Math.max(0, Math.min(value, hardLimit))
    : 0
}

function lineCount(value: string): number {
  let lines = 1
  for (let at = 0; at < value.length; at += 1) {
    if (value.charCodeAt(at) === 10) lines += 1
  }
  return lines
}

function abortError(request: RichRenderRequest): Error {
  return request.signal.reason instanceof Error
    ? request.signal.reason
    : new Error('Code render cancelled')
}

function throwIfAborted(request: RichRenderRequest): void {
  if (request.signal.aborted) throw abortError(request)
}

function actionButton(
  document: Document,
  label: string,
  title: string
): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'rich-code-action'
  button.dataset['richInteractive'] = ''
  button.textContent = label
  button.setAttribute('aria-label', title)
  button.title = title
  return button
}

function plainCode(document: Document, source: string): HTMLPreElement {
  const pre = document.createElement('pre')
  pre.className = 'rich-code-pre rich-code-pre--source'
  const code = document.createElement('code')
  code.textContent = source
  pre.appendChild(code)
  return pre
}

function safeColor(value: string | undefined): string | null {
  return value && /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(value)
    ? value
    : null
}

function highlightedCode(
  document: Document,
  source: string,
  highlight: CodeHighlight
): HTMLPreElement {
  const pre = document.createElement('pre')
  pre.className = 'rich-code-pre rich-code-pre--highlighted'
  const code = document.createElement('code')
  code.className = 'rich-code-tokens'
  let cursor = 0
  for (const line of highlight.tokens) {
    for (const token of line) {
      const start = Math.max(cursor, Math.min(token.offset, source.length))
      const end = Math.max(
        start,
        Math.min(token.offset + token.content.length, source.length)
      )
      if (start > cursor) code.append(source.slice(cursor, start))
      if (end <= start) continue
      const span = document.createElement('span')
      span.className = 'rich-code-token'
      span.textContent = source.slice(start, end)
      const color = safeColor(token.color)
      if (color) span.style.color = color
      // vscode-textmate FontStyle: italic=1, bold=2, underline=4,
      // strikethrough=8. No arbitrary Shiki htmlStyle/htmlAttrs are admitted.
      const style = token.fontStyle ?? 0
      if (style & 1) span.style.fontStyle = 'italic'
      if (style & 2) span.style.fontWeight = '700'
      const decorations = [
        ...(style & 4 ? ['underline'] : []),
        ...(style & 8 ? ['line-through'] : [])
      ]
      if (decorations.length > 0) {
        span.style.textDecoration = decorations.join(' ')
      }
      code.appendChild(span)
      cursor = end
    }
  }
  if (cursor < source.length) code.append(source.slice(cursor))
  pre.appendChild(code)
  return pre
}

function diagnosticList(
  document: Document,
  diagnostics: readonly RichDiagnostic[]
): HTMLElement | null {
  if (diagnostics.length === 0) return null
  const details = document.createElement('details')
  details.className = 'rich-code-diagnostics'
  details.dataset['richInteractive'] = ''
  const summary = document.createElement('summary')
  summary.textContent = `${diagnostics.length} diagnostic${diagnostics.length === 1 ? '' : 's'}`
  details.appendChild(summary)
  const list = document.createElement('ol')
  for (const diagnostic of diagnostics) {
    const item = document.createElement('li')
    item.dataset['severity'] = diagnostic.severity
    const label = document.createElement('strong')
    label.textContent = diagnostic.severity
    const message = document.createElement('span')
    message.textContent = ` ${diagnostic.message}`
    const origin = document.createElement('code')
    origin.textContent = [diagnostic.source, diagnostic.code]
      .filter(Boolean)
      .join(' · ')
    item.append(label, message, origin)
    list.appendChild(item)
  }
  details.appendChild(list)
  return details
}

async function defaultWriteText(
  document: Document,
  text: string
): Promise<void> {
  const clipboard = document.defaultView?.navigator.clipboard
  if (clipboard?.writeText) {
    await clipboard.writeText(text)
    return
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.cssText =
    'position:fixed;left:-10000px;top:0;opacity:0;pointer-events:none;'
  const parent = document.body ?? document.documentElement
  parent.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand?.('copy') ?? false
  textarea.remove()
  if (!copied) throw new Error('Clipboard is unavailable')
}

function renderCodeFrame(
  host: HTMLElement,
  request: RichRenderRequest,
  language: CodeLanguage | null,
  highlight: CodeHighlight | null,
  diagnostics: readonly RichDiagnostic[],
  writeText: (document: Document, text: string) => Promise<void>
): { node: HTMLElement; dispose(): void } {
  const document = host.ownerDocument
  const frame = document.createElement('section')
  frame.className = 'rich-code-frame'
  frame.dataset['codeWrap'] = 'off'
  frame.dataset['codeExpanded'] = 'false'
  frame.setAttribute('role', 'group')
  const authoredInfo = firstFenceInfo(request.info)
  const languageLabel = language?.label ?? (authoredInfo || 'Plain text')
  frame.setAttribute('aria-label', `${languageLabel} code block`)

  const toolbar = document.createElement('div')
  toolbar.className = 'rich-code-toolbar'
  toolbar.dataset['richInteractive'] = ''
  toolbar.setAttribute('role', 'toolbar')
  toolbar.setAttribute('aria-label', `${languageLabel} code actions`)
  const label = document.createElement('span')
  label.className = 'rich-code-language'
  label.textContent = languageLabel
  const count = document.createElement('span')
  count.className = 'rich-code-count'
  count.textContent = `${diagnostics.length} problem${diagnostics.length === 1 ? '' : 's'}`
  const copyStatus = document.createElement('span')
  copyStatus.className = 'rich-code-copy-status'
  copyStatus.setAttribute('role', 'status')
  copyStatus.setAttribute('aria-live', 'polite')
  const actions = document.createElement('span')
  actions.className = 'rich-code-actions'

  const copy = actionButton(document, 'Copy', 'Copy authored code')
  const wrap = actionButton(document, 'Wrap', 'Wrap long code lines')
  wrap.setAttribute('aria-pressed', 'false')
  const expand = actionButton(document, 'Expand', 'Expand full code block')
  expand.setAttribute('aria-pressed', 'false')
  const source = highlight
    ? actionButton(document, 'Source', 'Show plain authored code')
    : null
  source?.setAttribute('aria-pressed', 'false')
  actions.append(copy)
  if (source) actions.append(source)
  actions.append(wrap, expand)
  toolbar.append(label, count, copyStatus, actions)

  const highlighted = highlight
    ? highlightedCode(document, request.source, highlight)
    : null
  const plain = plainCode(document, request.source)
  if (highlighted) plain.hidden = true
  const diagnosticOutput = diagnosticList(document, diagnostics)
  frame.append(toolbar)
  if (highlighted) frame.append(highlighted)
  frame.append(plain)
  if (diagnosticOutput) frame.append(diagnosticOutput)

  let statusTimer: ReturnType<typeof setTimeout> | null = null
  let disposed = false
  const onCopy = (): void => {
    if (statusTimer) clearTimeout(statusTimer)
    copyStatus.textContent = 'Copying…'
    void writeText(document, request.source).then(
      () => {
        if (disposed) return
        copyStatus.textContent = 'Copied'
        statusTimer = setTimeout(() => {
          copyStatus.textContent = ''
          statusTimer = null
        }, 1_500)
      },
      () => {
        if (disposed) return
        copyStatus.textContent = 'Copy failed'
      }
    )
  }
  const onWrap = (): void => {
    const enabled = frame.dataset['codeWrap'] !== 'on'
    frame.dataset['codeWrap'] = enabled ? 'on' : 'off'
    wrap.setAttribute('aria-pressed', String(enabled))
    wrap.textContent = enabled ? 'Unwrap' : 'Wrap'
    const title = enabled ? 'Keep code on one line' : 'Wrap long code lines'
    wrap.setAttribute('aria-label', title)
    wrap.title = title
  }
  const onExpand = (): void => {
    const enabled = frame.dataset['codeExpanded'] !== 'true'
    frame.dataset['codeExpanded'] = String(enabled)
    expand.setAttribute('aria-pressed', String(enabled))
    expand.textContent = enabled ? 'Collapse' : 'Expand'
    const title = enabled ? 'Collapse code block' : 'Expand full code block'
    expand.setAttribute('aria-label', title)
    expand.title = title
  }
  const onSource = (): void => {
    if (!source || !highlighted) return
    const enabled = !highlighted.hidden
    highlighted.hidden = enabled
    plain.hidden = !enabled
    source.setAttribute('aria-pressed', String(enabled))
    source.textContent = enabled ? 'Highlight' : 'Source'
    const title = enabled
      ? 'Show syntax highlighting'
      : 'Show plain authored code'
    source.setAttribute('aria-label', title)
    source.title = title
  }
  copy.addEventListener('click', onCopy)
  wrap.addEventListener('click', onWrap)
  expand.addEventListener('click', onExpand)
  source?.addEventListener('click', onSource)

  return {
    node: frame,
    dispose() {
      if (disposed) return
      disposed = true
      if (statusTimer) clearTimeout(statusTimer)
      copy.removeEventListener('click', onCopy)
      wrap.removeEventListener('click', onWrap)
      expand.removeEventListener('click', onExpand)
      source?.removeEventListener('click', onSource)
      frame.remove()
    }
  }
}

function infoDiagnostic(
  request: RichRenderRequest,
  message: string,
  code: string,
  severity: RichDiagnostic['severity'] = 'info'
): RichDiagnostic {
  return {
    from: 0,
    to: Math.min(1, request.source.length),
    severity,
    message,
    source: 'Atomik code renderer',
    code
  }
}

export function createCodeAdapter(seat: CodeAdapterSeat): RichRendererAdapter {
  let runtimePromise: Promise<CodeHighlighterRuntime> | null = null
  let loadedRuntime: CodeHighlighterRuntime | null = null
  const runtime = (): Promise<CodeHighlighterRuntime> => {
    runtimePromise ??= seat.loadRuntime().then(
      (loaded) => {
        loadedRuntime = loaded
        return loaded
      },
      (reason: unknown) => {
        runtimePromise = null
        throw reason
      }
    )
    return runtimePromise
  }

  return {
    kind: 'code',
    async render(host, request): Promise<RichRenderHandle> {
      if (request.kind !== 'code') {
        throw new Error(`Code adapter cannot render ${request.kind}`)
      }
      throwIfAborted(request)
      const maxSourceBytes = limit(
        request.limits.code.maxSourceBytes,
        HARD_LIMITS.sourceBytes
      )
      const maxLines = limit(request.limits.code.maxLines, HARD_LIMITS.lines)
      const bytes = byteLength(request.source)
      const lines = lineCount(request.source)
      const diagnostics: RichDiagnostic[] = []
      const overBudget = bytes > maxSourceBytes || lines > maxLines
      if (overBudget) {
        diagnostics.push(
          infoDiagnostic(
            request,
            bytes > maxSourceBytes
              ? `Fine highlighting skipped above ${maxSourceBytes} bytes.`
              : `Fine highlighting skipped above ${maxLines} lines.`,
            'highlight-limit'
          )
        )
      }

      const language = seat.languageFor(request.info)
      const parserTask = overBudget
        ? Promise.resolve<RichDiagnostic[]>([])
        : analyzeCodeSource(request.source, request.info, {
            signal: request.signal
          }).catch(() => [])
      let highlight: CodeHighlight | null = null
      if (language && !overBudget) {
        try {
          const highlighter = await runtime()
          throwIfAborted(request)
          highlight = await highlighter.highlight(
            request.source,
            language.id,
            request.theme.scheme
          )
          throwIfAborted(request)
        } catch (reason) {
          if (request.signal.aborted) throw abortError(request)
          diagnostics.push(
            infoDiagnostic(
              request,
              'Fine highlighting is unavailable; escaped code is shown.',
              'highlight-unavailable',
              'warning'
            )
          )
        }
      }
      diagnostics.push(...(await parserTask))
      throwIfAborted(request)

      const rendered = renderCodeFrame(
        host,
        request,
        language,
        highlight,
        diagnostics,
        seat.writeText ?? defaultWriteText
      )
      throwIfAborted(request)
      host.replaceChildren(rendered.node)
      let disposed = false
      return {
        diagnostics,
        dispose() {
          if (disposed) return
          disposed = true
          rendered.dispose()
        }
      }
    },
    dispose() {
      const pending = runtimePromise
      runtimePromise = null
      const loaded = loadedRuntime
      loadedRuntime = null
      if (loaded) loaded.dispose()
      else void pending?.then((late) => late.dispose(), () => undefined)
    }
  }
}
