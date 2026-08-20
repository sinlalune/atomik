import type { Runtime, Spec, ViewOptions } from 'vega'
import type { TopLevelSpec } from 'vega-lite'
import {
  createVegaLiteAdapter,
  type VegaLiteRuntime
} from './vega-lite-core'

export async function loadVegaLiteRuntime(): Promise<VegaLiteRuntime> {
  const [vegaLite, vega, interpreter] = await Promise.all([
    import('vega-lite'),
    import('vega'),
    import('vega-interpreter')
  ])
  return {
    // The logger is what turns Vega's own diagnosis into something the reader
    // can see (S02). Vega-Lite reports at COMPILE time ("y-scale's zero is
    // dropped…"), Vega at RUN time ("Log scale domain includes zero…"), so
    // both halves take the same sink.
    compile: (spec, options) =>
      vegaLite.compile(spec as unknown as TopLevelSpec, {
        ...(options?.logger ? { logger: options.logger as never } : {})
      }),
    // `ast: true` keeps Vega's expressions as a parsed tree instead of
    // compiling them into JavaScript source. Vega's default path ends in
    // `Function(...)`, which the renderer's `script-src 'self'` CSP refuses
    // (13) — the real app showed every chart falling back to source with
    // "Evaluating a string as JavaScript violates ... 'unsafe-eval'".
    // Relaxing the CSP is not on the table, so the AST plus the official
    // interpreter is how a chart runs inside the policy rather than around it.
    parse: (spec) => vega.parse(spec as Spec, {}, { ast: true }),
    createView: (runtime, options) =>
      new vega.View(runtime as Runtime, {
        ...(options as ViewOptions),
        expr: interpreter.expressionInterpreter
      })
  }
}

/** The lightweight adapter itself is lazy, then validates authored JSON before
 * this second boundary imports either chart runtime. */
export const vegaLiteAdapter = createVegaLiteAdapter(loadVegaLiteRuntime)
