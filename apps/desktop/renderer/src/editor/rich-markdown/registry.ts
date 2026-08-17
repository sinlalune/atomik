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

/** Adapters join this map in their own path steps. An empty registry is a
 * valid, source-visible state and is intentionally exercised by S02. */
export const defaultRichRendererRegistry = createRichRendererRegistry({})
