/**
 * Stable semantics for the message stream. `role="log"` gives a chat
 * transcript the expected chronological live-region behavior; limiting
 * relevance to additions prevents metadata changes inside an existing turn
 * from being announced as fresh messages.
 */
export const CHAT_LOG_A11Y = {
  role: 'log',
  'aria-label': 'Conversation',
  'aria-live': 'polite',
  'aria-relevant': 'additions'
} as const
