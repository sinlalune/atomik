import { ArrowLeftIcon, ArrowRightIcon } from './icons'

/**
 * The shared back/forward pair of every note-bar (S07m): five
 * hand-rolled ‹ › pairs had drifted into three title/behavior
 * variants — one component, one set of titles, real icons, named
 * accessibly. Page-style pagers (PDF) use the chevron icons instead;
 * this pair is HISTORY semantics.
 */
export function HistoryNav({
  backOk,
  forwardOk,
  onBack,
  onForward
}: {
  backOk: boolean
  forwardOk: boolean
  onBack: () => void
  onForward: () => void
}): React.JSX.Element {
  return (
    <span className="note-bar-nav">
      <button
        type="button"
        className="note-bar-button icon-button"
        disabled={!backOk}
        title="Back to the previously viewed note"
        aria-label="Back"
        onClick={onBack}
      >
        <ArrowLeftIcon />
      </button>
      <button
        type="button"
        className="note-bar-button icon-button"
        disabled={!forwardOk}
        title="Forward"
        aria-label="Forward"
        onClick={onForward}
      >
        <ArrowRightIcon />
      </button>
    </span>
  )
}
