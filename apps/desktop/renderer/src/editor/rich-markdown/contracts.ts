export type RichRendererKind = 'math' | 'mermaid' | 'vega-lite' | 'code'

export type RichSeverity = 'error' | 'warning' | 'info' | 'hint'

/** Adapter-relative diagnostic. The host maps these offsets to note offsets
 * when it projects them into CodeMirror (ADR-014). */
export type RichDiagnostic = {
  from: number
  to: number
  severity: RichSeverity
  message: string
  source: string
  code?: string
}

export type RichTheme = {
  name: string
  scheme: 'light' | 'dark'
}

export type RichLimits = {
  maxBlocks: number
  maxOutputBytes: number
  timeoutMs: number
  math: {
    maxSourceBytes: number
    maxExpand: number
    maxSize: number
  }
  mermaid: {
    maxSourceBytes: number
    maxTextCharacters: number
    maxEdges: number
  }
  vegaLite: {
    maxSourceBytes: number
    maxDepth: number
    maxProperties: number
    maxRows: number
    maxPrimitiveCells: number
  }
  code: {
    maxSourceBytes: number
    maxLines: number
  }
}

export const DEFAULT_RICH_LIMITS: Readonly<RichLimits> = {
  maxBlocks: 128,
  maxOutputBytes: 2 * 1024 * 1024,
  timeoutMs: 3_000,
  math: {
    maxSourceBytes: 32 * 1024,
    maxExpand: 1_000,
    maxSize: 20
  },
  mermaid: {
    maxSourceBytes: 64 * 1024,
    maxTextCharacters: 20_000,
    maxEdges: 200
  },
  vegaLite: {
    maxSourceBytes: 256 * 1024,
    maxDepth: 32,
    maxProperties: 50_000,
    maxRows: 5_000,
    maxPrimitiveCells: 100_000
  },
  code: {
    maxSourceBytes: 256 * 1024,
    maxLines: 20_000
  }
}

export type RichRenderRequest = {
  id: string
  kind: RichRendererKind
  source: string
  info: string
  theme: RichTheme
  limits: Readonly<RichLimits>
  signal: AbortSignal
}

export type RichRenderHandle = {
  diagnostics: readonly RichDiagnostic[]
  dispose(): void
}

export type RichRendererAdapter = {
  kind: RichRendererKind
  render(
    host: HTMLElement,
    request: RichRenderRequest
  ): Promise<RichRenderHandle>
  /** Releases adapter-global caches (for example a Shiki highlighter). */
  dispose?(): void
}

export type RichAdapterLoader = () => Promise<RichRendererAdapter>

export type RichAdapterLoaders = Partial<
  Record<RichRendererKind, RichAdapterLoader>
>
