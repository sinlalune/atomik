import { useEffect, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

/**
 * The PDF page viewer (CP-MVP-003 S04, bedrock 10): pdf.js in the
 * SANDBOXED renderer, worker from the local bundle (CSP forbids
 * remote). pdf.js 6.x removed the eval'd font path entirely, retiring
 * CVE-2024-4367 by construction (the S02 posture, now structural
 * upstream). Display only — extraction is main's job (S05); renderer
 * fidelity and extraction fidelity stay separate claims.
 */

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export function PdfView({
  dataUrl,
  requestedPage,
  initialPage,
  onPageChange,
  onAnchorPage
}: {
  dataUrl: string
  /** Citation return (S06): a jump request; a NEW object each time (even
   *  for the same page) so a repeat click re-navigates. */
  requestedPage?: { page: number } | null
  /** Restore (S07, 03 recoverable UI state): the page the tab param
   *  recorded — read once at mount; a citation return outranks it. */
  initialPage?: number
  /** Reports page turns so the tab param can follow. */
  onPageChange?: (page: number) => void
  /** "Anchor this page" — records a durable page anchor in the dossier. */
  onAnchorPage?: (page: number) => void
}): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const hostRef = useRef<HTMLDivElement | null>(null)
  const docRef = useRef<pdfjs.PDFDocumentProxy | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [page, setPage] = useState(requestedPage?.page ?? initialPage ?? 1)
  const [error, setError] = useState<string | null>(null)

  // page turns persist as the tab's page param — reopening the tab (or
  // the app) returns to this page
  useEffect(() => {
    onPageChange?.(page)
    // page-driven: the freshest callback of that render is the right one
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  // citation return: jump when a request arrives (and is real)
  useEffect(() => {
    const want = requestedPage?.page
    if (want && want >= 1) {
      setPage(numPages ? Math.min(want, numPages) : want)
    }
  }, [requestedPage, numPages])

  // the pane's real width — 0 at mount in a fresh tab (layout races the
  // effect; the owner's "blank until poked"), so the render effect waits
  // for the observer's first real measurement and follows pane resizes.
  const [hostWidth, setHostWidth] = useState(0)
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0
      setHostWidth((current) => (Math.abs(current - width) > 1 ? width : current))
    })
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  // load the document from the gated bytes
  useEffect(() => {
    let cancelled = false
    const base64 = dataUrl.slice(dataUrl.indexOf('base64,') + 7)
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    const task = pdfjs.getDocument({ data: bytes })
    task.promise.then(
      (doc) => {
        if (cancelled) return
        docRef.current = doc
        setNumPages(doc.numPages)
        setPage((current) => Math.min(Math.max(1, current), doc.numPages))
      },
      (cause: unknown) => {
        if (!cancelled) setError(`pdf: ${String(cause)}`)
      }
    )
    return () => {
      cancelled = true
      docRef.current = null
      // destroying the loading task tears down document and worker both
      void task.destroy()
    }
    // dataUrl identifies the document
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataUrl])

  // render the current page, fitted to the host width (waits for a real
  // measurement — rendering into a 0-width pane is the blank-view bug).
  // Exactly ONE render at a time: pdf.js refuses overlapping render()
  // calls on the same canvas, so the previous task is CANCELLED first
  // (the owner hit the race by flipping pages during a resize).
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null)
  useEffect(() => {
    if (numPages === 0 || hostWidth < 40) return
    let cancelled = false
    void (async () => {
      const doc = docRef.current
      const canvas = canvasRef.current
      if (!doc || !canvas) return
      try {
        const pdfPage = await doc.getPage(page)
        if (cancelled) return
        const probe = pdfPage.getViewport({ scale: 1 })
        const scale = Math.max(0.25, (hostWidth - 24) / probe.width)
        const ratio = window.devicePixelRatio || 1
        const viewport = pdfPage.getViewport({ scale: scale * ratio })
        canvas.width = viewport.width
        canvas.height = viewport.height
        canvas.style.width = `${viewport.width / ratio}px`
        canvas.style.height = `${viewport.height / ratio}px`
        const context = canvas.getContext('2d')
        if (!context) return
        renderTaskRef.current?.cancel()
        const task = pdfPage.render({ canvas, canvasContext: context, viewport })
        renderTaskRef.current = task
        await task.promise
      } catch (cause) {
        // a cancelled render is the mechanism working, not an error
        const name = (cause as { name?: string } | null)?.name
        if (!cancelled && name !== 'RenderingCancelledException') {
          setError(`pdf render: ${String(cause)}`)
        }
      }
    })()
    return () => {
      cancelled = true
      renderTaskRef.current?.cancel()
    }
  }, [page, numPages, hostWidth])

  if (error) return <p className="error">{error}</p>
  return (
    <div className="pdf-view" ref={hostRef}>
      <div className="pdf-nav">
        <button
          type="button"
          className="note-bar-button"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          ‹
        </button>
        <span className="pdf-nav-status">
          page {page} / {numPages || '…'}
        </span>
        <button
          type="button"
          className="note-bar-button"
          disabled={numPages === 0 || page >= numPages}
          onClick={() => setPage((p) => Math.min(numPages, p + 1))}
        >
          ›
        </button>
        {onAnchorPage && numPages > 0 && (
          <button
            type="button"
            className="note-bar-button"
            title={`Record a durable anchor to page ${page} in the dossier`}
            onClick={() => onAnchorPage(page)}
          >
            ⚓ anchor page {page}
          </button>
        )}
      </div>
      <canvas ref={canvasRef} className="pdf-canvas" />
    </div>
  )
}
