import type {
  RichRenderHandle,
  RichRenderRequest,
  RichRendererAdapter,
  RichTheme
} from '../contracts'
import { safeSvgNode } from './safe-svg'

export type VegaLoader = {
  load(uri: string, options?: unknown): Promise<string>
  sanitize(uri: string, options?: unknown): Promise<{ href: string }>
  http(uri: string, options?: unknown): Promise<string>
  file(filename: string): Promise<string>
}

export type VegaView = {
  runAsync(): Promise<unknown>
  toSVG(): Promise<string>
  finalize(): unknown
}

export type VegaLiteRuntime = {
  compile(spec: Record<string, unknown>): { spec: unknown }
  parse(spec: unknown): unknown
  createView(
    runtime: unknown,
    options: { renderer: 'svg'; loader: VegaLoader; hover: false }
  ): VegaView
}

export type VegaLiteRuntimeLoader = () => Promise<VegaLiteRuntime>

const HARD_LIMITS = {
  sourceBytes: 256 * 1024,
  depth: 32,
  properties: 50_000,
  rows: 5_000,
  primitiveCells: 100_000,
  outputBytes: 2 * 1024 * 1024
} as const

const POISON_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
const ACTIVE_KEYS = new Set([
  'action',
  'actions',
  'bind',
  'download',
  'export',
  'href',
  'loader',
  'patch',
  'url'
])
const DATA_KEYS = new Set(['format', 'name', 'values'])
const FORMAT_KEYS = new Set([
  'delimiter',
  'feature',
  'mesh',
  'parse',
  'property',
  'type'
])

type VegaLimits = {
  sourceBytes: number
  depth: number
  properties: number
  rows: number
  primitiveCells: number
}

type ValidationState = {
  limits: VegaLimits
  properties: number
  stringBytes: number
  rows: number
  primitiveCells: number
  datasetNames: Set<string>
  namedReferences: Set<string>
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength
}

function limit(value: number, hardLimit: number): number {
  return Number.isFinite(value)
    ? Math.max(0, Math.min(value, hardLimit))
    : 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function fail(message: string): never {
  throw new Error(`Vega-Lite ${message}`)
}

function abortError(request: RichRenderRequest): Error {
  return request.signal.reason instanceof Error
    ? request.signal.reason
    : new Error('Vega-Lite render cancelled')
}

function throwIfAborted(request: RichRenderRequest): void {
  if (request.signal.aborted) throw abortError(request)
}

function effectiveLimits(request: RichRenderRequest): VegaLimits {
  return {
    sourceBytes: limit(
      request.limits.vegaLite.maxSourceBytes,
      HARD_LIMITS.sourceBytes
    ),
    depth: limit(request.limits.vegaLite.maxDepth, HARD_LIMITS.depth),
    properties: limit(
      request.limits.vegaLite.maxProperties,
      HARD_LIMITS.properties
    ),
    rows: limit(request.limits.vegaLite.maxRows, HARD_LIMITS.rows),
    primitiveCells: limit(
      request.limits.vegaLite.maxPrimitiveCells,
      HARD_LIMITS.primitiveCells
    )
  }
}

function walkComplexity(
  value: unknown,
  depth: number,
  state: ValidationState
): void {
  if (depth > state.limits.depth) {
    fail(`source exceeds nesting depth ${state.limits.depth}`)
  }
  if (typeof value === 'string') {
    state.stringBytes += byteLength(value)
    if (state.stringBytes > state.limits.sourceBytes) {
      fail(`strings exceed ${state.limits.sourceBytes} bytes`)
    }
    return
  }
  if (value === null || typeof value !== 'object') return
  if (Array.isArray(value)) {
    for (const item of value) walkComplexity(item, depth + 1, state)
    return
  }

  const entries = Object.entries(value)
  state.properties += entries.length
  if (state.properties > state.limits.properties) {
    fail(`source exceeds ${state.limits.properties} properties`)
  }
  for (const [key, child] of entries) {
    if (POISON_KEYS.has(key)) fail(`property ${key} is not allowed`)
    state.stringBytes += byteLength(key)
    if (state.stringBytes > state.limits.sourceBytes) {
      fail(`strings exceed ${state.limits.sourceBytes} bytes`)
    }
    walkComplexity(child, depth + 1, state)
  }
}

function countInlineValue(value: unknown, state: ValidationState): void {
  const addRows = (count: number): void => {
    state.rows += count
    if (state.rows > state.limits.rows) {
      fail(`inline data exceeds ${state.limits.rows} rows`)
    }
  }
  const visit = (candidate: unknown, root = false): void => {
    if (candidate === null || typeof candidate !== 'object') {
      state.primitiveCells += 1
      if (state.primitiveCells > state.limits.primitiveCells) {
        fail(
          `inline data exceeds ${state.limits.primitiveCells} primitive cells`
        )
      }
      return
    }
    if (Array.isArray(candidate)) {
      addRows(candidate.length)
      for (const child of candidate) visit(child)
      return
    }
    if (root) addRows(1)
    for (const child of Object.values(candidate)) visit(child)
  }
  visit(value, true)
}

function validateInlineValue(value: unknown, state: ValidationState): void {
  if (
    value === null ||
    (!Array.isArray(value) && !isRecord(value))
  ) {
    fail('inline data must be a structured JSON array or object')
  }
  countInlineValue(value, state)
}

function validateFormat(value: unknown): void {
  if (!isRecord(value)) fail('data.format must be an object')
  for (const key of Object.keys(value)) {
    if (!FORMAT_KEYS.has(key)) fail(`data.format.${key} is not allowed`)
  }
  const type = value['type']
  if (type !== undefined && type !== 'json' && type !== 'topojson') {
    fail('encoded text data formats are not allowed')
  }
}

function validateDataSource(value: unknown, state: ValidationState): void {
  if (!isRecord(value)) fail('data must be an object')
  for (const key of Object.keys(value)) {
    if (!DATA_KEYS.has(key)) fail(`data.${key} is not allowed`)
  }

  const hasValues = Object.hasOwn(value, 'values')
  const hasName = Object.hasOwn(value, 'name')
  if (!hasValues && !hasName) {
    fail('data must contain inline values or a named inline dataset')
  }
  if (hasValues) validateInlineValue(value['values'], state)
  if (hasName) {
    if (typeof value['name'] !== 'string' || value['name'].trim() === '') {
      fail('data.name must be a non-empty string')
    }
    if (!hasValues) state.namedReferences.add(value['name'])
  }
  if (Object.hasOwn(value, 'format')) validateFormat(value['format'])
}

function validateDatasets(value: unknown, state: ValidationState): void {
  if (!isRecord(value)) fail('top-level datasets must be an object')
  for (const [name, dataset] of Object.entries(value)) {
    if (name.trim() === '') fail('dataset names must not be empty')
    state.datasetNames.add(name)
    validateInlineValue(dataset, state)
  }
}

function validateSpecPolicy(
  value: unknown,
  state: ValidationState,
  atRoot = false
): void {
  if (Array.isArray(value)) {
    for (const child of value) validateSpecPolicy(child, state)
    return
  }
  if (!isRecord(value)) return

  for (const [key, child] of Object.entries(value)) {
    if (key === 'datasets') {
      if (!atRoot) fail('datasets are allowed only at the top level')
      validateDatasets(child, state)
      continue
    }
    if (key === 'data') {
      validateDataSource(child, state)
      continue
    }
    if (ACTIVE_KEYS.has(key)) fail(`${key} is not allowed`)
    if (
      key === 'mark' &&
      (child === 'image' || (isRecord(child) && child['type'] === 'image'))
    ) {
      fail('image marks are not allowed')
    }
    validateSpecPolicy(child, state)
  }
}

/** Parses and validates the complete authored JSON before the Vega runtime is
 * imported. The returned object is disposable projection input, never a note
 * mutation. */
export function validateVegaLiteSource(
  request: RichRenderRequest
): Record<string, unknown> {
  if (request.kind !== 'vega-lite') {
    fail(`adapter cannot render ${request.kind}`)
  }
  const limits = effectiveLimits(request)
  const sourceBytes = byteLength(request.source)
  if (sourceBytes > limits.sourceBytes) {
    fail(`source exceeds ${limits.sourceBytes} bytes`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(request.source) as unknown
  } catch {
    fail('source must be valid JSON')
  }
  if (!isRecord(parsed)) fail('source must be one JSON object')

  const state: ValidationState = {
    limits,
    properties: 0,
    stringBytes: 0,
    rows: 0,
    primitiveCells: 0,
    datasetNames: new Set(),
    namedReferences: new Set()
  }
  walkComplexity(parsed, 0, state)
  validateSpecPolicy(parsed, state, true)
  for (const reference of state.namedReferences) {
    if (!state.datasetNames.has(reference)) {
      fail(`named dataset ${JSON.stringify(reference)} is not defined inline`)
    }
  }
  return parsed
}

type Palette = {
  surface: string
  foreground: string
  accent: string
  border: string
  muted: string
  code: string
}

const FALLBACK_PALETTES: Record<RichTheme['scheme'], Palette> = {
  light: {
    surface: '#fbfbf9',
    foreground: '#26261f',
    accent: '#3d5a3d',
    border: '#e0e0d8',
    muted: '#6b6b62',
    code: '#f1f1ec'
  },
  dark: {
    surface: '#1e1e23',
    foreground: '#e8e8e3',
    accent: '#9ec49e',
    border: '#44444c',
    muted: '#9a9aa2',
    code: '#26262c'
  }
}

function hexToken(host: HTMLElement, name: string, fallback: string): string {
  const view = host.ownerDocument.defaultView
  for (const element of [host, host.ownerDocument.documentElement]) {
    const value = view
      ?.getComputedStyle?.(element)
      .getPropertyValue(name)
      .trim()
    if (value && /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(value)) return value
  }
  return fallback
}

function paletteFor(host: HTMLElement, theme: RichTheme): Palette {
  const fallback = FALLBACK_PALETTES[theme.scheme]
  return {
    surface: hexToken(host, '--surface', fallback.surface),
    foreground: hexToken(host, '--fg', fallback.foreground),
    accent: hexToken(host, '--accent', fallback.accent),
    border: hexToken(host, '--border', fallback.border),
    muted: hexToken(host, '--muted', fallback.muted),
    code: hexToken(host, '--code-bg', fallback.code)
  }
}

function fullHex(value: string): string {
  if (value.length !== 4) return value
  return `#${value
    .slice(1)
    .split('')
    .map((part) => `${part}${part}`)
    .join('')}`
}

function mixHex(left: string, right: string, rightWeight: number): string {
  const first = fullHex(left)
  const second = fullHex(right)
  const mixed = [1, 3, 5].map((at) => {
    const a = Number.parseInt(first.slice(at, at + 2), 16)
    const b = Number.parseInt(second.slice(at, at + 2), 16)
    return Math.round(a * (1 - rightWeight) + b * rightWeight)
      .toString(16)
      .padStart(2, '0')
  })
  return `#${mixed.join('')}`
}

function recordPart(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {}
}

/** Applies site-owned visual defaults after validation. Authored encodings and
 * chart semantics remain intact; Atomik owns the surrounding theme colors. */
export function themedVegaLiteSpec(
  host: HTMLElement,
  spec: Record<string, unknown>,
  theme: RichTheme
): Record<string, unknown> {
  if (Object.hasOwn(spec, 'config') && !isRecord(spec['config'])) {
    fail('config must be an object')
  }
  const palette = paletteFor(host, theme)
  const config = recordPart(spec['config'])
  const category = [
    palette.accent,
    mixHex(palette.accent, palette.surface, 0.38),
    mixHex(palette.accent, palette.foreground, 0.28),
    palette.muted,
    mixHex(palette.muted, palette.surface, 0.32),
    palette.foreground
  ]
  return {
    ...spec,
    background: palette.surface,
    config: {
      ...config,
      view: { ...recordPart(config['view']), stroke: palette.border },
      axis: {
        ...recordPart(config['axis']),
        domainColor: palette.border,
        gridColor: palette.border,
        labelColor: palette.foreground,
        tickColor: palette.border,
        titleColor: palette.foreground
      },
      header: {
        ...recordPart(config['header']),
        labelColor: palette.foreground,
        titleColor: palette.foreground
      },
      legend: {
        ...recordPart(config['legend']),
        labelColor: palette.foreground,
        titleColor: palette.foreground
      },
      title: {
        ...recordPart(config['title']),
        color: palette.foreground,
        subtitleColor: palette.muted
      },
      mark: { ...recordPart(config['mark']), color: palette.accent },
      text: { ...recordPart(config['text']), color: palette.foreground },
      line: { ...recordPart(config['line']), color: palette.accent },
      point: { ...recordPart(config['point']), color: palette.accent },
      bar: { ...recordPart(config['bar']), color: palette.accent },
      area: { ...recordPart(config['area']), color: palette.accent },
      rule: { ...recordPart(config['rule']), color: palette.muted },
      range: { ...recordPart(config['range']), category }
    }
  }
}

function denied(method: string, target: string): Promise<never> {
  return Promise.reject(
    new Error(`Vega-Lite ${method} is disabled for ${JSON.stringify(target)}`)
  )
}

export function denyAllVegaLoader(): VegaLoader {
  return {
    load: (uri) => denied('resource loading', uri),
    sanitize: (uri) => denied('link sanitization', uri),
    http: (uri) => denied('HTTP loading', uri),
    file: (filename) => denied('file loading', filename)
  }
}

function compactSource(source: string): string {
  const compact = source.replace(/\s+/g, ' ').trim()
  return compact.length > 240 ? `${compact.slice(0, 237)}…` : compact
}

function chartTitle(spec: Record<string, unknown>): string {
  const title = spec['title']
  if (typeof title === 'string' && title.trim()) return title.trim()
  if (isRecord(title)) {
    const text = title['text']
    if (typeof text === 'string' && text.trim()) return text.trim()
    if (Array.isArray(text)) {
      const joined = text.filter((part) => typeof part === 'string').join(' ')
      if (joined.trim()) return joined.trim()
    }
  }
  return 'Vega-Lite chart'
}

function chartDescription(
  spec: Record<string, unknown>,
  source: string
): string {
  if (typeof spec['description'] === 'string' && spec['description'].trim()) {
    return spec['description'].trim()
  }
  const compact = compactSource(source)
  return compact
    ? `Rendered from Vega-Lite source: ${compact}`
    : 'Rendered from authored Vega-Lite source.'
}

export function createVegaLiteAdapter(
  loadRuntime: VegaLiteRuntimeLoader
): RichRendererAdapter {
  let runtimePromise: Promise<VegaLiteRuntime> | null = null
  const runtime = (): Promise<VegaLiteRuntime> => {
    runtimePromise ??= loadRuntime().catch((reason: unknown) => {
      runtimePromise = null
      throw reason
    })
    return runtimePromise
  }

  return {
    kind: 'vega-lite',
    async render(host, request): Promise<RichRenderHandle> {
      throwIfAborted(request)
      const parsed = validateVegaLiteSource(request)
      const themed = themedVegaLiteSpec(host, parsed, request.theme)
      throwIfAborted(request)

      const loaded = await runtime()
      throwIfAborted(request)
      const compiled = loaded.compile(themed)
      throwIfAborted(request)
      const vegaRuntime = loaded.parse(compiled.spec)
      throwIfAborted(request)

      const view = loaded.createView(vegaRuntime, {
        renderer: 'svg',
        loader: denyAllVegaLoader(),
        hover: false
      })
      let finalized = false
      const finalize = (): void => {
        if (finalized) return
        finalized = true
        view.finalize()
      }
      const finalizeOnAbort = (): void => {
        try {
          finalize()
        } catch {
          // The primary cancellation reason remains the visible diagnostic.
        }
      }
      request.signal.addEventListener('abort', finalizeOnAbort, { once: true })

      let node: Element
      try {
        await view.runAsync()
        throwIfAborted(request)
        const svg = await view.toSVG()
        throwIfAborted(request)
        const maxOutputBytes = limit(
          request.limits.maxOutputBytes,
          HARD_LIMITS.outputBytes
        )
        if (byteLength(svg) > maxOutputBytes) {
          fail(`output exceeds ${maxOutputBytes} bytes`)
        }
        node = safeSvgNode(host.ownerDocument, svg, {
          requestId: request.id,
          title: chartTitle(parsed),
          description: chartDescription(parsed, request.source)
        })
        throwIfAborted(request)
      } finally {
        request.signal.removeEventListener('abort', finalizeOnAbort)
        finalize()
      }

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
    }
  }
}
