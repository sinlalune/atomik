/**
 * Prop-follow guard for notePath tab params (CP-MVP-007 S07a, owner
 * report: creation flashed OTHER notes). The tab param trails real
 * opens by a few dispatch ticks; re-running the follow effect on a
 * STALE prop re-opened the previous note (flash), whose onNoteOpened
 * wrote the stale value back — a visible ping-pong under the S02+
 * refresh pushes. Rule: follow the prop ONLY when its value actually
 * transitions, and never re-open what was just requested.
 */
export function noteFollowTarget(
  state: { prevProp: string | undefined },
  prop: string | undefined,
  lastRequested: string | null
): string | null {
  if (prop === state.prevProp) return null
  state.prevProp = prop
  if (!prop || prop === lastRequested) return null
  return prop
}
