import type {
  RichAdapterLoaders,
  RichRendererAdapter,
  RichRendererKind
} from './contracts'

export class RichRendererRegistry {
  private readonly loaded = new Map<
    RichRendererKind,
    Promise<RichRendererAdapter>
  >()

  constructor(private readonly loaders: RichAdapterLoaders) {}

  has(kind: RichRendererKind): boolean {
    return this.loaders[kind] !== undefined
  }

  load(kind: RichRendererKind): Promise<RichRendererAdapter> | null {
    const loader = this.loaders[kind]
    if (!loader) return null
    const existing = this.loaded.get(kind)
    if (existing) return existing

    const pending = loader()
      .then((adapter) => {
        if (adapter.kind !== kind) {
          throw new Error(
            `Rich renderer loader for ${kind} returned ${adapter.kind}`
          )
        }
        return adapter
      })
      .catch((reason: unknown) => {
        this.loaded.delete(kind)
        throw reason
      })
    this.loaded.set(kind, pending)
    return pending
  }

  async dispose(): Promise<void> {
    const adapters = await Promise.allSettled(this.loaded.values())
    this.loaded.clear()
    for (const result of adapters) {
      if (result.status === 'fulfilled') result.value.dispose?.()
    }
  }
}

export function createRichRendererRegistry(
  loaders: RichAdapterLoaders
): RichRendererRegistry {
  return new RichRendererRegistry(loaders)
}

/** Every concrete runtime stays behind its own static dynamic-import target so
 * Vite can keep it out of the no-rich startup path. */
export const defaultRichRendererRegistry = createRichRendererRegistry({
  math: async () =>
    import('./adapters/katex').then((module) => module.katexAdapter),
  mermaid: async () =>
    import('./adapters/mermaid').then((module) => module.mermaidAdapter),
  'vega-lite': async () =>
    import('./adapters/vega-lite').then((module) => module.vegaLiteAdapter)
})
