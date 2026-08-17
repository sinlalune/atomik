import type { Runtime, Spec, ViewOptions } from 'vega'
import type { TopLevelSpec } from 'vega-lite'
import {
  createVegaLiteAdapter,
  type VegaLiteRuntime
} from './vega-lite-core'

async function loadVegaLiteRuntime(): Promise<VegaLiteRuntime> {
  const [vegaLite, vega] = await Promise.all([
    import('vega-lite'),
    import('vega')
  ])
  return {
    compile: (spec) => vegaLite.compile(spec as unknown as TopLevelSpec),
    parse: (spec) => vega.parse(spec as Spec),
    createView: (runtime, options) =>
      new vega.View(runtime as Runtime, options as ViewOptions)
  }
}

/** The lightweight adapter itself is lazy, then validates authored JSON before
 * this second boundary imports either chart runtime. */
export const vegaLiteAdapter = createVegaLiteAdapter(loadVegaLiteRuntime)
