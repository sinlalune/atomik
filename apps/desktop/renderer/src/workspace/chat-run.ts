/**
 * Session state that must SURVIVE a chat tab's remount (CP-MVP-008
 * S06c6, owner: "when I switch between tabs the content of the chats
 * disappears"). Tab switching unmounts the view (TabContent is keyed
 * by the active tab), which used to drop two things the transcript
 * file cannot restore:
 *
 * - the IN-FLIGHT RUN — with real provider latency (seconds, unlike
 *   the mock's milliseconds) a switch-away-and-back landed the answer
 *   invisibly in the file: no thinking indicator, no refresh, no
 *   error message;
 * - the DRAFT input — retyping a question after every tab switch,
 *   worst exactly when the provider 503s and retries are needed.
 *
 * Keyed by TAB id, module-level, session-only — deliberately not
 * persisted (a draft is not knowledge; an in-flight promise cannot
 * be). The remounting ChatView adopts what it finds here.
 */

export type ChatRun = {
  operationId: string
  /** Settles when the exchange fully lands (answer appended to the
   *  transcript, or failed). NEVER rejects — failures land in
   *  `error` so adopters need no catch. */
  done: Promise<void>
  /** Set by the run closure before settling; the adopter surfaces it. */
  error: string | null
}

const runs = new Map<string, ChatRun>()
const drafts = new Map<string, string>()

export function registerChatRun(tabId: string, run: ChatRun): void {
  runs.set(tabId, run)
  void run.done.finally(() => {
    if (runs.get(tabId) === run) runs.delete(tabId)
  })
}

export function chatRunFor(tabId: string): ChatRun | null {
  return runs.get(tabId) ?? null
}

export function chatDraftFor(tabId: string): string {
  return drafts.get(tabId) ?? ''
}

export function setChatDraft(tabId: string, text: string): void {
  if (text.length === 0) drafts.delete(tabId)
  else drafts.set(tabId, text)
}
