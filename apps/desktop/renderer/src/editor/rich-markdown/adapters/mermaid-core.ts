import type { MermaidConfig, RenderResult } from 'mermaid'
import type {
  RichRenderHandle,
  RichRenderRequest,
  RichRendererAdapter,
  RichTheme
} from '../contracts'
import { safeSvgNode } from './safe-svg'

export type MermaidRuntime = {
  initialize(config: MermaidConfig): void
  render(id: string, source: string, container?: Element): Promise<RenderResult>
  mermaidAPI: {
    updateSiteConfig(config: MermaidConfig): MermaidConfig
  }
}

const SECURE_KEYS = [
  'secure',
  'securityLevel',
  'startOnLoad',
  'maxTextSize',
  'maxEdges',
  'suppressErrorRendering',
  'deterministicIds',
  'deterministicIDSeed',
  'htmlLabels',
  'theme',
  'themeVariables',
  'themeCSS',
  'darkMode',
  'fontFamily',
  'altFontFamily',
  'dompurifyConfig',
  'arrowMarkerAbsolute',
  'legacyMathML',
  'forceLegacyMathML',
  'look',
  'layout',
  'handDrawnSeed'
] as const

const BASE_CONFIG: MermaidConfig = {
  startOnLoad: false,
  securityLevel: 'strict',
  htmlLabels: false,
  suppressErrorRendering: true,
  deterministicIds: true,
  maxTextSize: 20_000,
  maxEdges: 200,
  arrowMarkerAbsolute: false,
  theme: 'base',
  look: 'classic',
  secure: [...SECURE_KEYS]
}

const HARD_LIMITS = {
  sourceBytes: 64 * 1024,
  textCharacters: 20_000,
  edges: 200,
  outputBytes: 2 * 1024 * 1024
} as const

const ACTIVE_SOURCE = [
  {
    pattern: /%%\s*\{[\s\S]*?\}%%/i,
    message: 'configuration directives are disabled'
  },
  {
    pattern: /^[\t \r\n]*---[\t ]*\r?\n/,
    message: 'Mermaid YAML frontmatter is disabled'
  },
  {
    pattern: /(?:^|[;\r\n])\s*(?:click|link|links)\s+/i,
    message: 'click and link directives are disabled'
  },
  {
    pattern: /\b(?:https?|ftp|file|data|javascript|vbscript|blob):/i,
    message: 'external resource URLs are disabled'
  },
  {
    pattern: /(^|[\s"'(])\/\/[^\s]/m,
    message: 'protocol-relative resources are disabled'
  },
  { pattern: /\burl\s*\(/i, message: 'CSS resource URLs are disabled' },
  { pattern: /!\[[^\]]*\]\s*\(/, message: 'image resources are disabled' },
  { pattern: /@\{[^}\n]*\bimg\s*:/i, message: 'image shapes are disabled' },
  {
    pattern: /<\s*(?:script|foreignObject|iframe|object|embed|image|img)\b/i,
    message: 'embedded active content is disabled'
  }
] as const

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength
}

function abortError(request: RichRenderRequest): Error {
  return request.signal.reason instanceof Error
    ? request.signal.reason
    : new Error('Mermaid render cancelled')
}

function throwIfAborted(request: RichRenderRequest): void {
  if (request.signal.aborted) throw abortError(request)
}

/** Fast preflight. Mermaid's own maxEdges remains the authoritative parser
 * cap; this catches ordinary edge floods before the heavy parser runs. */
export function estimateMermaidEdges(source: string): number {
  return (
    source.match(/(?:<\|)?(?:--+|-\.+-|==+|~~+|-+>>|-+>|-+\)|-+x)(?:[>|xo}{]+)?/g)
      ?.length ?? 0
  )
}

export function validateMermaidSource(request: RichRenderRequest): void {
  const { source, limits } = request
  const maxSourceBytes = Math.min(
    limits.mermaid.maxSourceBytes,
    HARD_LIMITS.sourceBytes
  )
  const maxTextCharacters = Math.min(
    limits.mermaid.maxTextCharacters,
    HARD_LIMITS.textCharacters
  )
  const maxEdges = Math.min(limits.mermaid.maxEdges, HARD_LIMITS.edges)
  if (byteLength(source) > maxSourceBytes) {
    throw new Error(
      `Mermaid source exceeds ${maxSourceBytes} bytes`
    )
  }
  if (source.length > maxTextCharacters) {
    throw new Error(
      `Mermaid source exceeds ${maxTextCharacters} characters`
    )
  }
  const edges = estimateMermaidEdges(source)
  if (edges > maxEdges) {
    throw new Error(
      `Mermaid source exceeds ${maxEdges} edges (${edges} found)`
    )
  }
  for (const rule of ACTIVE_SOURCE) {
    if (rule.pattern.test(source)) throw new Error(`Mermaid ${rule.message}`)
  }
}

type Palette = {
  surface: string
  foreground: string
  accent: string
  border: string
  code: string
}

const FALLBACK_PALETTES: Record<RichTheme['scheme'], Palette> = {
  light: {
    surface: '#fbfbf9',
    foreground: '#26261f',
    accent: '#3d5a3d',
    border: '#e0e0d8',
    code: '#f1f1ec'
  },
  dark: {
    surface: '#1e1e23',
    foreground: '#e8e8e3',
    accent: '#9ec49e',
    border: '#44444c',
    code: '#26262c'
  }
}

function token(host: HTMLElement, name: string, fallback: string): string {
  const view = host.ownerDocument.defaultView
  for (const element of [host, host.ownerDocument.documentElement]) {
    const value = view
      ?.getComputedStyle?.(element)
      .getPropertyValue(name)
      .trim()
    if (value) return value
  }
  return fallback
}

function paletteFor(host: HTMLElement, theme: RichTheme): Palette {
  const fallback = FALLBACK_PALETTES[theme.scheme]
  return {
    surface: token(host, '--surface', fallback.surface),
    foreground: token(host, '--fg', fallback.foreground),
    accent: token(host, '--accent', fallback.accent),
    border: token(host, '--border', fallback.border),
    code: token(host, '--code-bg', fallback.code)
  }
}

function themeVariablesFor(palette: Palette, darkMode: boolean): object {
  const softAccent = `color-mix(in srgb, ${palette.accent} 18%, ${palette.surface})`
  const midAccent = `color-mix(in srgb, ${palette.accent} 35%, ${palette.surface})`
  const strongAccent = `color-mix(in srgb, ${palette.accent} 58%, ${palette.surface})`
  const categorical = [
    palette.code,
    softAccent,
    midAccent,
    strongAccent,
    palette.surface,
    midAccent,
    palette.code,
    softAccent
  ]
  return {
    darkMode,
    background: palette.surface,
    primaryColor: palette.code,
    primaryTextColor: palette.foreground,
    primaryBorderColor: palette.border,
    secondaryColor: softAccent,
    secondaryTextColor: palette.foreground,
    secondaryBorderColor: palette.border,
    tertiaryColor: palette.surface,
    tertiaryTextColor: palette.foreground,
    tertiaryBorderColor: palette.border,
    noteBkgColor: palette.code,
    noteTextColor: palette.foreground,
    noteBorderColor: palette.border,
    lineColor: palette.accent,
    arrowheadColor: palette.accent,
    defaultLinkColor: palette.accent,
    textColor: palette.foreground,
    mainBkg: palette.code,
    nodeBkg: palette.code,
    nodeBorder: palette.border,
    nodeTextColor: palette.foreground,
    clusterBkg: palette.surface,
    clusterBorder: palette.border,
    edgeLabelBackground: palette.surface,
    titleColor: palette.foreground,
    actorBkg: palette.code,
    actorBorder: palette.border,
    actorTextColor: palette.foreground,
    actorLineColor: palette.accent,
    signalColor: palette.accent,
    signalTextColor: palette.foreground,
    labelBoxBkgColor: palette.surface,
    labelBoxBorderColor: palette.border,
    labelTextColor: palette.foreground,
    loopTextColor: palette.foreground,
    activationBorderColor: palette.accent,
    activationBkgColor: softAccent,
    sequenceNumberColor: palette.surface,
    rectBkgColor: softAccent,
    sectionBkgColor: palette.code,
    altSectionBkgColor: palette.surface,
    sectionBkgColor2: softAccent,
    excludeBkgColor: palette.surface,
    taskBorderColor: palette.border,
    taskBkgColor: palette.code,
    activeTaskBorderColor: palette.accent,
    activeTaskBkgColor: softAccent,
    gridColor: palette.border,
    doneTaskBkgColor: palette.surface,
    doneTaskBorderColor: palette.border,
    critBorderColor: palette.accent,
    critBkgColor: midAccent,
    todayLineColor: palette.accent,
    vertLineColor: palette.border,
    taskTextColor: palette.foreground,
    taskTextOutsideColor: palette.foreground,
    taskTextLightColor: palette.foreground,
    taskTextDarkColor: palette.foreground,
    stateLabelColor: palette.foreground,
    stateBkg: palette.code,
    labelBackgroundColor: palette.surface,
    compositeBackground: palette.surface,
    compositeTitleBackground: palette.code,
    compositeBorder: palette.border,
    transitionColor: palette.accent,
    transitionLabelColor: palette.foreground,
    errorBkgColor: palette.code,
    errorTextColor: palette.foreground,
    specialStateColor: palette.accent,
    pieTitleTextColor: palette.foreground,
    pieSectionTextColor: palette.foreground,
    pieLegendTextColor: palette.foreground,
    pieStrokeColor: palette.border,
    pieOuterStrokeColor: palette.border,
    quadrant1Fill: softAccent,
    quadrant2Fill: palette.code,
    quadrant3Fill: midAccent,
    quadrant4Fill: palette.surface,
    quadrant1TextFill: palette.foreground,
    quadrant2TextFill: palette.foreground,
    quadrant3TextFill: palette.foreground,
    quadrant4TextFill: palette.foreground,
    quadrantPointFill: palette.accent,
    quadrantPointTextFill: palette.foreground,
    quadrantXAxisTextFill: palette.foreground,
    quadrantYAxisTextFill: palette.foreground,
    quadrantTitleFill: palette.foreground,
    requirementBackground: palette.code,
    requirementBorderColor: palette.border,
    requirementTextColor: palette.foreground,
    relationColor: palette.accent,
    relationLabelBackground: palette.surface,
    relationLabelColor: palette.foreground,
    archEdgeColor: palette.accent,
    archEdgeArrowColor: palette.accent,
    archGroupBorderColor: palette.border,
    ...Object.fromEntries(
      categorical.flatMap((color, index) => [
        [`cScale${index}`, color],
        [`fillType${index}`, color],
        [`pie${index + 1}`, color],
        [`git${index}`, color]
      ])
    )
  }
}

export function mermaidConfigFor(
  host: HTMLElement,
  request: RichRenderRequest
): MermaidConfig {
  const palette = paletteFor(host, request.theme)
  return {
    ...BASE_CONFIG,
    deterministicIDSeed: request.id,
    maxTextSize: Math.min(
      request.limits.mermaid.maxTextCharacters,
      HARD_LIMITS.textCharacters
    ),
    maxEdges: Math.min(request.limits.mermaid.maxEdges, HARD_LIMITS.edges),
    darkMode: request.theme.scheme === 'dark',
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    themeVariables: themeVariablesFor(
      palette,
      request.theme.scheme === 'dark'
    )
  }
}

function compactSource(source: string): string {
  const compact = source.replace(/\s+/g, ' ').trim()
  return compact.length > 240 ? `${compact.slice(0, 237)}…` : compact
}

function renderId(requestId: string): string {
  return `atomik_mermaid_${requestId.replace(/[^A-Za-z0-9_-]+/g, '_')}`
}

function stagingContainer(host: HTMLElement): HTMLElement {
  const container = host.ownerDocument.createElement('div')
  container.setAttribute('aria-hidden', 'true')
  container.style.cssText =
    'position:fixed;left:-10000px;top:0;visibility:hidden;pointer-events:none;contain:layout style;'
  const parent = host.ownerDocument.body ?? host
  parent.appendChild(container)
  return container
}

/** Mermaid keeps one global site config. The adapter owns a serial queue so a
 * request's theme and deterministic seed cannot race another mounted note. */
export function createMermaidAdapter(
  runtime: MermaidRuntime
): RichRendererAdapter {
  let initialized = false
  let tail: Promise<void> = Promise.resolve()

  const serialized = <T>(work: () => Promise<T>): Promise<T> => {
    const result = tail.then(work, work)
    tail = result.then(
      () => undefined,
      () => undefined
    )
    return result
  }

  return {
    kind: 'mermaid',
    async render(host, request): Promise<RichRenderHandle> {
      if (request.kind !== 'mermaid') {
        throw new Error(`Mermaid cannot render ${request.kind}`)
      }
      throwIfAborted(request)
      validateMermaidSource(request)

      return serialized(async () => {
        throwIfAborted(request)
        if (!initialized) {
          runtime.initialize(BASE_CONFIG)
          initialized = true
        }
        runtime.mermaidAPI.updateSiteConfig(mermaidConfigFor(host, request))

        const staging = stagingContainer(host)
        const removeStaging = (): void => staging.remove()
        request.signal.addEventListener('abort', removeStaging, { once: true })
        try {
          const result = await runtime.render(
            renderId(request.id),
            request.source,
            staging
          )
          throwIfAborted(request)
          const maxOutputBytes = Math.min(
            request.limits.maxOutputBytes,
            HARD_LIMITS.outputBytes
          )
          if (byteLength(result.svg) > maxOutputBytes) {
            throw new Error(
              `Mermaid output exceeds ${maxOutputBytes} bytes`
            )
          }
          const diagramType = result.diagramType?.replace(/[-_]+/g, ' ').trim()
          const title = diagramType
            ? `Mermaid ${diagramType} diagram`
            : 'Mermaid diagram'
          const sourceDescription = compactSource(request.source)
          const node = safeSvgNode(host.ownerDocument, result.svg, {
            requestId: request.id,
            title,
            description: sourceDescription
              ? `Rendered from Mermaid source: ${sourceDescription}`
              : 'Rendered from authored Mermaid source.'
          })
          throwIfAborted(request)
          host.replaceChildren(node)

          let disposed = false
          return {
            diagnostics: [],
            dispose() {
              if (disposed) return
              disposed = true
              node.remove()
            }
          }
        } finally {
          request.signal.removeEventListener('abort', removeStaging)
          staging.remove()
        }
      })
    }
  }
}
