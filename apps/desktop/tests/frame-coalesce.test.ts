import { describe, expect, it } from 'vitest'
import {
  frameCoalesced,
  type FrameScheduler
} from '../renderer/src/workspace/frame-coalesce'

/* A hand-driven frame clock: callbacks queue until the test paints. */
function manualFrames(): { schedule: FrameScheduler; paint: () => void } {
  const queue: Array<() => void> = []
  return {
    schedule: (cb) => {
      queue.push(cb)
    },
    paint: () => {
      const batch = queue.splice(0)
      batch.forEach((cb) => cb())
    }
  }
}

describe('frameCoalesced', () => {
  it('applies only the LATEST of many values per frame', () => {
    const applied: number[] = []
    const frames = manualFrames()
    const report = frameCoalesced<number>((v) => applied.push(v), frames.schedule)

    report(1)
    report(2)
    report(3)
    expect(applied).toEqual([])
    frames.paint()
    expect(applied).toEqual([3])
  })

  it('schedules exactly one frame callback per burst', () => {
    let scheduled = 0
    const schedule: FrameScheduler = () => {
      scheduled += 1
    }
    const report = frameCoalesced<number>(() => {}, schedule)
    report(1)
    report(2)
    report(3)
    expect(scheduled).toBe(1)
  })

  it('a new burst after a paint schedules and applies again', () => {
    const applied: number[] = []
    const frames = manualFrames()
    const report = frameCoalesced<number>((v) => applied.push(v), frames.schedule)

    report(10)
    frames.paint()
    report(20)
    report(30)
    frames.paint()
    expect(applied).toEqual([10, 30])
  })

  it('a value reported DURING apply lands on the next frame, not never', () => {
    const applied: number[] = []
    const frames = manualFrames()
    const report = frameCoalesced<number>((v) => {
      applied.push(v)
      if (v === 1) report(2)
    }, frames.schedule)

    report(1)
    frames.paint()
    expect(applied).toEqual([1])
    frames.paint()
    expect(applied).toEqual([1, 2])
  })

  it('an empty paint applies nothing', () => {
    const applied: number[] = []
    const frames = manualFrames()
    frameCoalesced<number>((v) => applied.push(v), frames.schedule)
    frames.paint()
    expect(applied).toEqual([])
  })
})
