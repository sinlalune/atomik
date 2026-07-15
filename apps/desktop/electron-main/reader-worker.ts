/* The reader-extraction worker (Electron utilityProcess). The CPU slab —
 * mhtml parse, DOM builds, Readability, turndown — runs HERE so the main
 * process never freezes with it (perf audit 2026-07-15: 834 ms measured
 * in-main for a 650 KB page; MB-class articles froze every IPC and
 * window verb for seconds). Pure compute: a ReaderJob in, a
 * ReaderComputeResult out; all file writes, dossier updates, and traces
 * stay in main. Forked per job; main kills it after the answer (or on
 * its 120 s timeout). */
import { readerFromHtml, readerFromSnapshot } from './web-reader'
import type { ReaderComputeResult, ReaderJob } from './web-reader'

type ParentPort = {
  on: (event: 'message', listener: (event: { data: unknown }) => void) => void
  postMessage: (message: unknown) => void
}

const parentPort = (process as unknown as { parentPort?: ParentPort }).parentPort
if (!parentPort) {
  throw new Error('reader-worker: must run inside an Electron utilityProcess')
}

parentPort.on('message', (event) => {
  const job = event.data as ReaderJob
  try {
    const computed: ReaderComputeResult =
      job.kind === 'snapshot'
        ? readerFromSnapshot(Buffer.from(job.snapshot), job.pageUrl)
        : readerFromHtml(job.html, job.pageUrl, new Map())
    parentPort.postMessage({
      ok: true,
      title: computed.title,
      markdown: computed.markdown,
      media: computed.media
    })
  } catch (error) {
    parentPort.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    })
  }
})
