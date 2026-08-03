# AI chat UI practices for prompt/context engineering (fetched 2026-08-03)

Research pass behind CP-MVP-008 S07b8b (owner: "use this iteration to
research and apply best practices in ai chat ui for agent interaction
with prompt and context engineering"; refined same day: "use well
established designers or coders as shadcn or t3 ideas (not the
library) or respected opensource projects for their modernity").
Distilled from the sources below; each item marked applied /
already-held / deferred.

## The reference implementation (primary source)

Vercel `ai-chatbot` (`components/ai-elements/prompt-input.tsx` +
shadcn `input-group.tsx`, read from source 2026-08-03) — the
canonical modern composer:

- **One card**: a single rounded (`rounded-xl` with textarea),
  hairline-bordered container with a translucent input tint; the
  FOCUS RING lives on the CARD via `:has(:focus-visible)` — border
  → ring color + soft ring — never on the textarea.
- **Inside the card, three slots**: attachments/chips row
  (`order-first flex-wrap gap-1`), borderless auto-sizing textarea
  (`field-sizing-content`, min/max height), and a block-end toolbar
  (`justify-between`): ghost tool buttons + menus LEFT, submit RIGHT.
- **Ghost tools**: icon-first, muted-foreground, menu items may carry
  shortcut hints; Enter submits, Shift+Enter breaks, IME composition
  guarded.

→ APPLIED to the chat composer as `.chat-card` (36 tokens, no raw
values): borderless `field-sizing: content` textarea, card-level
accent focus (border + 1px outline), footer row = SYSTEM ghost
toggle · ambient intent preview · send; the system section opens as
a sheet above the card. Deviation from the reference: the options
(sampling) row remains its own disclosure above the card — folding
it into the toolbar as a popover is recorded follow-up.

## Distilled practices

1. **Intent preview — show what will be sent, before sending.**
   Sequential, plain-language visibility of the upcoming action; for a
   chat request that is the composed payload (system + history +
   draft + context). → APPLIED: ambient pre-send estimate in the
   composer (`→ ~N tok + context`), title spells the parts; the
   post-send pills (S07b4) remain the exact record.
2. **Ambient, optional token/cost visibility.** "Cursor adds token
   count and cost — useful for power users, distracting for everyone
   else"; live counters ambient enough to ignore. → APPLIED: micro
   figures in muted type, detail on hover; already the S06c16/19
   stance (metrics line + Σ bar).
3. **Per-conversation settings live with the conversation, slim,
   never competing with the message area.** → ALREADY-HELD (S07b8):
   the SYSTEM disclosure + options are one-line summaries above the
   input; kept slim in this pass (micro-row, count + tokens in the
   summary itself).
4. **One consistent chip/pill language for context artifacts.**
   Attachment/context chips share one recipe; kinds differ by
   modifier only. → APPLIED: `.pill` base recipe unified across
   context pills, request-breakdown pills, and system chips
   (36's "no new pill forks" rule made real).
5. **Progressive disclosure of composition detail.** → ALREADY-HELD:
   details/summary sections; hover previews on chips.
6. **Reading comfort in assistant messages**: generous line-height
   (~1.6), bounded measure (~65–72ch), rich markdown. → APPLIED to
   `.chat-turn-body`.
7. **Message anatomy**: role + meta ambient in a header line; actions
   revealed on hover; composer docked, stop/cancel near the composer,
   large. → PARTLY HELD (header/meta/cancel exist); APPLIED:
   hover-revealed turn actions, calmer role labels.
8. **Explainable rationale / source citation on claims.** → ALREADY-
   HELD: inline claim marks (S06c17), source-backed click-through.
9. **Show context loss, never silently truncate.** → ALREADY-HELD:
   thread caps are visible in the history pill (`history · N turns`);
   the 24-turn cap is declared in the ledger. Deferred: an explicit
   "older turns not sent" marker inside the transcript view.
10. **Autonomy dial / action audit / undo.** Agent-action patterns —
    relevant to the future tool-verification path, not to chat
    composition. → DEFERRED (recorded for M6+ work).

## Sources

Primary (read from source, owner-directed quality bar):
- https://github.com/vercel/chatbot — `components/ai-elements/prompt-input.tsx`, `components/ui/input-group.tsx` (shadcn)

Secondary (pattern survey):
- https://www.setproduct.com/blog/ai-chat-interface-ui-design
- https://agentic-design.ai/patterns/ui-ux-patterns/chat-interface-patterns
- https://www.smashingmagazine.com/2026/02/designing-agentic-ai-practical-ux-patterns/
- https://thefrontkit.com/blogs/ai-chat-ui-best-practices
- https://www.parallelhq.com/blog/ux-ai-chatbots
- https://hatchworks.com/blog/ai-agents/agent-ux-patterns/
