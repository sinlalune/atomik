/* One-per-frame coalescer for pointer-drag streams (perf audit RS2 /
 * action 6, S07j). Under software rendering (WSLg) pointermove events
 * outpace paints; dispatching per EVENT turns one slow frame into a
 * queue of full workspace re-renders. Wrapping the applier keeps only
 * the LATEST value per animation frame — the drag commits at paint
 * rate, whatever the event rate. The scheduler is a seam so the node
 * suite can drive frames by hand.
 */
export type FrameScheduler = (cb: () => void) => void

const rafScheduler: FrameScheduler = (cb) => {
  requestAnimationFrame(cb)
}

export function frameCoalesced<T>(
  apply: (value: T) => void,
  schedule: FrameScheduler = rafScheduler
): (value: T) => void {
  let pending = false
  let latest: T
  return (value: T) => {
    latest = value
    if (pending) return
    pending = true
    schedule(() => {
      pending = false
      apply(latest)
    })
  }
}
