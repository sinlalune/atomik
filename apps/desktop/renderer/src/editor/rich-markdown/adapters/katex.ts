/// <reference path="../katex-css.d.ts" />

import katex from 'katex'
import 'katex/dist/katex.min.css'
import type {
  RichRenderHandle,
  RichRendererAdapter
} from '../contracts'

/**
 * KaTeX 0.16 calls `macros.hasOwnProperty` internally, while ADR-014
 * deliberately gives every expression a null-prototype macro table. Keep the
 * table prototype-free and provide only that compatibility method as a
 * non-enumerable own property. User macro names include their leading slash,
 * so they cannot replace this method.
 */
function freshMacros(): Record<string, string> {
  const macros = Object.create(null) as Record<string, string>
  Object.defineProperty(macros, 'hasOwnProperty', {
    configurable: false,
    enumerable: false,
    value: Object.prototype.hasOwnProperty,
    writable: false
  })
  return macros
}

function throwIfAborted(signal: AbortSignal): void {
  if (!signal.aborted) return
  throw signal.reason instanceof Error
    ? signal.reason
    : new Error('Math render cancelled')
}

/** Local-only KaTeX projection. Authored bytes reach KaTeX as TeX, never HTML. */
export const katexAdapter: RichRendererAdapter = {
  kind: 'math',
  async render(host, request): Promise<RichRenderHandle> {
    if (request.kind !== 'math') {
      throw new Error(`KaTeX cannot render ${request.kind}`)
    }
    throwIfAborted(request.signal)

    const markup = katex.renderToString(request.source, {
      displayMode: request.info !== 'inline',
      output: 'htmlAndMathml',
      trust: false,
      globalGroup: false,
      throwOnError: true,
      maxExpand: request.limits.math.maxExpand,
      maxSize: request.limits.math.maxSize,
      macros: freshMacros()
    })

    // KaTeX produced this markup under trust:false. The authored expression
    // remains escaped in its MathML annotation and never reaches this sink as
    // executable HTML. Abort once more before publishing synchronous work.
    throwIfAborted(request.signal)
    host.innerHTML = markup

    let disposed = false
    return {
      diagnostics: [],
      dispose() {
        if (disposed) return
        disposed = true
        host.replaceChildren()
      }
    }
  }
}
