---
type: Atomik Module Note
title: 'Module: atomik-desktop — AI, traces and truth'
description: The AI patch loop and its real engines, the chat pane, the ActionTrace ledger, mechanical truth labels and URL provenance.
tags: [module, ai, patch-loop, chat, traces, truth]
timestamp: 2026-08-17T00:00:00Z
---

# Module: atomik-desktop — AI, traces and truth

> AREA NOTE of [Module: atomik-desktop](./atomik-desktop.md), split out at
> CP-OPS-001 S02 so concurrent lanes append to different files instead of
> colliding in one 1689-line note. The root note keeps what is cross-cutting
> (public contracts, data flow, alternatives, common mistakes, tests, agent
> checklist, dependency facts); this note keeps what THIS AREA owns.

## What it owns

- BOUNDED MODEL-TOOL CONTRACT (CP-MVP-011 S01):
  `shared/generation-tools.ts`, pure. The only model-requestable verbs are
  `search_vault` and `search_wiki`; a discriminated call carries an opaque
  provider call id, allowlisted name, and schema-validated arguments. The
  renderer may request `off | model` and a Wikimedia language, but main owns
  the allowed names and hard call/depth/argument/result/byte/wall/token limits.
  Results are explicitly `untrusted: true`: retrieved prose is data, never a
  new instruction. `GenerationAdapter.tools` is required and FAIL-CLOSED;
  every existing adapter declares final-only/unsupported at S01. A provider
  opts into its native dialect only when its first request, tool-call parse,
  result continuation and final response are fixture-tested. ADR-015 pins the
  main-side loop and forbids provider-native web-search shortcuts.
- EXTERNAL RETRIEVAL RECEIPT (CP-MVP-011 S02):
  `ActionTraceLedger.recordWikimedia` appends a parented `retrieve` line for a
  live `search_wiki` execution: public-api/Wikimedia/corpus identity, language,
  HTTP request count, results, response bytes, wall time and typed outcome.
  Its input type contains no query or returned content field, and the ledger
  pins `contentRecorded: false`. The client takes the ledger through a tiny
  injected trace-sink interface.
- TYPED WIKIMEDIA OPERATION DOOR (CP-MVP-011 S05): `AiOperation.tools` is
  the renderer-wire preference (`off | model` plus one normalized Wikimedia
  language) and travels through the EXISTING `run-ai-operation` channel. Main
  validates it strictly and later derives the immutable tool allowlist; a
  model call in another language is refused. No `searchWiki`, URL or generic
  fetch method is added to preload. `WikimediaClient.search` is the internal
  provider-neutral dispatcher over Wikipedia/Wikidata/Wiktionary. Its `auto`
  branch allocates results across Wikipedia+Wikidata and shares the SAME HTTP
  request/response-byte budget and AbortSignal across both, rather than
  resetting authority at a corpus boundary. `ActionTraceLedger.beginGeneration`
  reserves the root id before the first provider turn; Wikimedia receipts are
  accepted only while that exact id+operation pair is active, final/failure
  generation lines reuse it, and quit flushes a reserved root as failed. This
  makes S06's child traces structurally parented before any adapter is enabled.
- PROVIDER-NEUTRAL TOOL LOOP (CP-MVP-011 S06): `runGenerationWithTools`
  (`electron-main/generation.ts`) is the ONE place authority lives. Adapters own
  their wire dialect and nothing else: `startToolLoop` returns a discriminated
  turn — `final`, or `tool-calls` carrying normalized `{id, name, arguments}`
  envelopes plus a `continue(results)` closure that keeps provider message state
  ADAPTER-SIDE, so the loop never rebuilds a vendor transcript. The loop parses
  every call through `parseGenerationToolCall`, executes through the injected
  `GenerationToolExecutor`, and counts calls, depth, per-call/total result chars
  and bytes, and wall time against the policy. A rejected or failed call becomes
  an untrusted error RESULT the model can recover from; a budget breach, an empty
  turn, unexpected parallel calls, or a mismatched executor result ends the
  operation as a typed `GenerationError`. Cancellation is relayed through an
  inner AbortController, so caller abort and the wall-budget timer both stop
  in-flight tool work and are reported apart (`cancelled` vs `budget-exceeded`).
  An adapter that is `unsupported` — or declares native tools without
  implementing the turn — still runs the deterministic CP-MVP-010 grounding pass
  and returns a VISIBLE `uncertainties` warning naming the engine and reason;
  chat is never silently degraded. `mistral-generation-adapter.ts` is the first
  and only native opt-in (`openai-chat-completions` dialect, `parallelCalls:
  false`), proven against recorded request/response fixtures rather than a live
  API. `generationToolDefinitions` emits the schemas from the same pure policy
  the parser enforces, so an adapter cannot advertise a verb main would refuse.
  Executed activity rides home on `AiResponseBundle.toolExecutions` with typed
  transient payloads for S07's disclosure and citations — consultation alone
  still makes nothing durable.
- WIKI TOOL CONTROL (CP-MVP-011 S07a): the wiki tool wears the SAME shape as
  the vault tool (owner ruling 2026-08-17) — an enable toggle, a `reach` depth,
  and one switch per augmentation (Wikipedia · Wikidata · Commons image ·
  Wiktionary etymology). It is **default OFF per thread**: the owner asked for
  "possibility to enable it", and a thread that reaches the network because it
  was opened is a surprise, not a preference. The renderer sends a PREFERENCE
  only — `{mode, wikiLanguage, wikiReach, wikiSources}` on the existing
  `run-ai-operation` door — and main DERIVES the authority from it:
  `createGenerationToolPolicy` turns the switches into the allowed corpora
  (`auto` only survives when both its legs are on), the reach into a result
  ceiling (quick 2 / standard 3 / deep 5), and the media switch into
  `wikiMedia` (which additionally requires Wikidata, since a Commons file is
  found through P18). Switching every source off REMOVES `search_wiki` from the
  allowlist rather than leaving a verb that can only fail. The emitted schema
  advertises only what is on, and `parseGenerationToolCall` enforces it
  independently — a schema is advice, the parser is authority: a switched-off
  corpus is refused, while over-asking on reach or media is CLAMPED, because
  wanting more breadth than the user allowed is not misconduct. The edition
  comes from the user's own locale (`wikiLanguageOf`), validated in main and
  pinned for the exchange.
- CONSULTED-SOURCES SURFACE (CP-MVP-011 S07b): after the owner benched S07a,
  the verdict was that the lookup happened invisibly — tokens spent,
  Wikipedia's authority borrowed, nothing to check. `consultedMaterialOf`
  (`shared/chat-citations.ts`, pure) flattens a turn's `toolExecutions` into
  deduplicated sources, attributed media and warnings; `ConsultedBlock` renders
  them under the answer. It is NOT a citation marker: a marker binds a sentence
  the model chose to cite, this names what was READ — including the case where
  three pages were consulted and none were cited, which is the case most worth
  seeing. Each source shows kind, title, project·language, the exact revision
  read (id when exposed, else the date) and a copy-link; a Wikidata entity
  shows its LABEL, never its bare QID. Media carries creator and licence
  BESIDE the image, because a credit one hover away is a credit not given, and
  any item missing attribution is dropped here as well as upstream — a
  presentation bug must not be able to publish an uncredited image. What was
  consulted attaches to the ANSWER turn (`priorTurns.length + 1`), mirroring
  how the packet attaches to the question it was compiled for, and stays
  session-live: a reopened transcript keeps the prose, not the thumbnails.
  In-app navigation is deliberately absent — opening a live remote page is the
  web-source lifecycle's job and arrives with save-as-source (S08), so the URL
  is copyable rather than pretending to be a link.
- ONE SWITCH PER VERB (CP-MVP-011 S07c): the allowlist follows the user's
  switches INDEPENDENTLY — `vault` gates `search_vault`, the wiki sources gate
  `search_wiki`. Before this, `createGenerationToolPolicy` always granted
  `search_vault` whenever tools were on, so enabling the wiki tool silently
  handed the model the vault as well; the owner's 2026-08-18 bench caught it
  the honest way — an answer opened "Based on your note" with the vault switch
  off. With every verb switched off the loop does not run at all: an empty
  allowlist is tools-off, not an empty `tools: []` array, which providers
  reject for no gain. The tool-driven vault read also gained the surface it
  never had — `consultedMaterialOf` now flattens `vault-context` payloads into
  notes (path, title, stage, reason, tokens) that render beside the external
  sources and open in place. The distinction the UI now draws: the pre-pass
  packet belongs to the QUESTION it was compiled for and opens from its pill;
  a tool-driven read happened mid-answer and belongs to the ANSWER.
- EXTERNAL CITATIONS THROUGH THE VAULT MECHANISM (CP-MVP-011 S07e): the owner
  benched S07b and found the model attributing with blockquotes and an em-dash
  — *"where are wiki citations? It is just using quoteblocks instead of the
  mechanism we built for vault citation"*. It had never been told it could
  cite them. Citation numbers are now DATA assigned in main, in the executor,
  where the material is gathered: each result gets the next number continuing
  after the vault references the request already used (`citationOffset`), and
  they ride back inside the tool result's `_atomik` envelope — beside
  `untrusted`, in the part the model is told is Atomik speaking, never inside
  the payload it is told is data — together with
  `EXTERNAL_CITATION_INSTRUCTION`. The instruction rides WITH the material
  because a rule written before the lookup cannot name the sources it
  produced. `CitationSource` gained an `external` arm, so one numbering, one
  marker parser and one chip renderer serve both kinds; an external chip
  carries its URL in `data-citation-external` rather than a vault path, so the
  reveal-a-note handler never receives something that is not a note. Verified
  live: the same question that produced blockquote attributions produced 26
  numbered markers and zero blockquotes.
- ONE CALL, EVERY ENABLED SOURCE (CP-MVP-011 S07e): `auto` now means "every
  corpus the user switched on", carried from the policy into the search
  context, with the result allowance spread across them (remainder to the
  earlier corpora, at least one each). It previously required BOTH Wikipedia
  and Wikidata and consulted only those two — which is why an owner with all
  four switches on got Wikipedia alone and had to ask for Wikidata and
  Wiktionary by name. The tool description was the other half: one that states
  only what a tool DOES gets under-called, so it now says WHEN to call
  (including for a bare topic as the whole question), names `auto` as the
  preferred single call, and says the results arrive numbered.
- CITATIONS SURVIVE THE TAB (CP-MVP-011 S07f): external citations lived only
  in a session ref, so switching tabs cleared them and chips reverted to bare
  markers — the owner's *"the render of citation disapeared after tab
  switching"*. They now persist with the turn through the SAME `cited:` meta
  vault citations always used; the canonical URL is the path. On restore a
  path matching `https?://` rebuilds the external arm, so a reopened chip
  still points outward instead of asking the workspace to reveal a note named
  after a URL.
- WHAT A HOVER CLAIMS (CP-MVP-011 S07f): a cited extent now ends at the
  sentence's LAST marker when real prose still follows it. A marker placed
  mid-sentence used to light the whole sentence, and when that sentence filled
  its paragraph the hover read as "this entire paragraph came from source 2"
  while the model had only meant the clause it had just written. It is the
  last marker rather than the hovered one deliberately: every marker in a
  sentence must resolve to the same extent (S10g/S10i), or two markers would
  produce overlapping spans and the wrapper would nest them. A marker followed
  only by punctuation still closes its sentence, which is the ordinary case.
- THE AGENT TRACE, DURABLE BESIDE THE TRANSCRIPT (CP-MVP-011 S07g): the owner
  benched the tool loop on 2026-08-18 and asked for a run to be auditable after
  the session that produced it — architecture delegated, one shape given: *a
  separate folder linked from the chat note, with a JSON block*.
  `shared/agent-trace.ts` builds the record and the note (pure);
  `renderer/src/workspace/agent-trace-note.ts` writes it through the injected
  `createNote` verb — the same exclusive vault verb the transcript is born
  with, so parents are made by the verb and a taken name retries instead of
  clobbering. The note lands in `chats/<day>/<slug>-traces/turn-NN.md`, which
  `chatHistoryOf` never lists (it walks `chats/` and its day folders, one level
  each), and the answer's heading carries `<!-- trace:<path> -->` beside its
  `run:`/`cited:`/`packet:` comments, so a reopened transcript still finds it.
  **Two ledgers, two questions.** `.atomik/usage/private/actions.jsonl` stays
  content-free telemetry answering "what did this cost"; the trace note answers
  "what did THIS answer stand on" and therefore records the query the model
  wrote, the corpus it reached, the revision it read and the licence it carried.
  What it never records is the fetched PROSE — article extracts, packet
  excerpts, the untrusted `content` handed to the model — because writing that
  into the vault would make a durable copy of public material through the back
  door, which is exactly what **Save as source** exists to do deliberately
  (28 + ADR-015). Only an exchange with real tool activity earns a file; a
  plain answer is already described by its own heading comments. A trace that
  cannot be written returns null rather than throwing: the answer is the
  user's work and must land, and the missing trace link beside a populated
  consulted block is itself the visible signal.
- THE TRACE AFTER THE OWNER'S FIRST BENCH (CP-MVP-011 S07h): four rulings from
  reading the owner's own `chats/2026-08-20/emmanuel-macron.md` and its trace.
  (1) EVERY answered turn is traced. The rule "only exchanges with tool
  activity" was refuted by turn 1 of that very file — *"Je ne trouve aucune
  information…"*, no tools, no trace, and the exchange most worth auditing had
  no record. A trail with holes reads as a bug. (2) The packet's EXCERPTS ride
  the trace. The no-prose rule bars fetched PUBLIC text; a vault excerpt is the
  user's own note quoted from a file one folder away, so recording it
  duplicates nothing and is the only way to see what was read of your own
  vault after the tab closed. (3) The transcript links its trace as a
  WIKILINK, `<!-- trace:[[chats/…/turn-03]] -->`: `parseEdges` skips fenced
  blocks and code spans but NOT html comments, so the trace becomes a graph
  node while staying invisible in the render — and stays out of the thread
  history a visible link line would join. `parseTraceMeta` still reads the
  S07g bare path, and only the wikilink form may omit `.md`. (4) The trace
  note's H1 is plain text (`Agent trace — <chat> · turn N`) with the wikilink
  on its own line: an H1 containing a markdown link had become the note's
  TITLE in every pill and relation sentence.
- WHAT A WARNING HAS TO SAY (CP-MVP-011 S07h): the owner read two warnings in
  their trace and could act on neither. `truncated` now names the articles and
  the cap they hit (`maxArticleTextChars`, 6 000) instead of "one or more
  articles were clipped" — the cap is a deliberate prompt budget, and seeing
  WHICH page lost its tail is what makes it arguable. `ambiguous` never meant
  "this entity is doubtful": Wikidata's search returned more candidates than
  the slots the reach gave it and the top-ranked one was taken. Said blankly
  it fires on every common name, so it now names the chosen entity with its
  QID and how many it beat.
- THE BUDGET SELECTS, IT NO LONGER TRUNCATES (CP-MVP-011 S07i): the owner's
  ruling after reading their own trace — *"We can't set a limit to a page if
  we have no tool to semantically or lexically assert that we have reached the
  part that fits the answer"*. `shared/wiki-sections.ts` scores an article's
  sections against the query with BM25 over `retrieval-core`'s tokenizer —
  the vault's own scorer, same constants, same folding, no embeddings (M9,
  and 33's lexical baseline is what this rung is measured against). The
  section is the document and the ARTICLE is the corpus: an idf computed over
  all of Wikipedia would say nothing about which paragraph of this page
  answers. The lead is always kept (it says who the article is about) but
  capped at 40% of the budget so it cannot crowd out the answer, and unspent
  budget flows back to it when nothing competes. Winners return to READING
  order — an article served out of order reads as nonsense — each labelled
  with its heading so mid-article prose is not mistaken for the article.
  `WikipediaArticle.sections` carries `{kept, skipped}`, and the `truncated`
  warning now says *"read (lead), Réforme des retraites; 14 other sections did
  not fit the 6 000-character budget"* instead of confessing a clip. An
  omission you can see is inspectable (26); "clipped" was not.
- WHEN THE QUERY CANNOT DISCRIMINATE (CP-MVP-011 S07j): S07i's scorer
  degenerates in one case the owner's bench hit immediately — the model
  searched *"réforme des retraites en France en 2023"* and got the article of
  that name, where every section carries every query term. The idf collapses
  toward its floor and ranking becomes keyword DENSITY: §Manifestations et
  grèves won because it is long and repeats the topic, not because it answers
  better. `SATURATION_SHARE` (0.6 of sections, for pages with at least four)
  detects it and returns to reading order, and `focused: false` travels with
  the result so the warning can say *"the query matched the whole page, so it
  was read from the top rather than ranked"*. "We ranked" and "we gave up
  ranking" are different claims about the same text.
- A DEAD EXCHANGE LEAVES A RECORD (CP-MVP-011 S07j): a failed or cancelled run
  used to leave the question in the transcript and nothing else — the owner
  found a stray unanswered `## you` and could not tell a failure from a double
  send. The trace record gained `outcome`, the renderer writes one on the
  failure path with the error, and the you-turn is stamped
  `<!-- unanswered:[[…]] -->` (only when a trace actually landed: a marker
  pointing at no record claims a record exists). The turn shows a quiet line
  offering to open it. The recording is wrapped in its own catch — a failed
  record must never replace the failure the user needs to see.
- SHARED DIALECT CODEC (CP-MVP-011 S06b): `electron-main/openai-tool-codec.ts`
  owns the `openai-chat-completions` wire grammar ONCE — schema emission, call
  parsing, the `role: "tool"` continuation, and usage accumulation. An adapter
  supplies only transport, usage arithmetic and result shaping through
  `OpenAiTurnHooks`, so a provider on this dialect never re-derives the
  protocol. Five of the six real providers sit here (Mistral, Google, OpenAI,
  OpenRouter, DeepSeek); only Anthropic needs the second codec. **The assistant
  turn is ECHOED VERBATIM, never rebuilt from the normalized call.** Gemini
  attaches `tool_calls[].extra_content.google.thought_signature` — opaque
  reasoning continuity — and a reconstructed turn drops it silently;
  normalization exists for Atomik's authority layer, the wire keeps what the
  provider put on it. Google is the second native opt-in, proven by a live
  two-turn probe on 2026-08-17 plus recorded fixtures; its usage folds
  `total_tokens - prompt_tokens` into output because Gemini bills thinking as
  output while omitting it from `completion_tokens` (charging from
  prompt+completion understates spend). Adapters stay fail-closed until their
  own codec is fixture-proven — the capability test asserts exactly which ids
  are native.
- MAIN-SIDE EXECUTOR (CP-MVP-011 S06):
  `electron-main/generation-tool-executor.ts` binds the two verbs to their
  existing seats — `search_vault` to the traced ContextPacket compiler,
  `search_wiki` to `WikimediaClient.search` — and is the only component holding
  the parent trace/operation ids and media policy, which therefore cannot be
  influenced from the renderer or the model. `boundedToolContent` serializes
  each payload as VALID JSON wrapped in an explicit untrusted notice, then clips
  it deterministically (longest prose fields first, then repeated array entries,
  then a bare truncation marker) so hostile or oversized material reaches the
  provider inside budget and still parses. `recordRetrieval` now accepts the
  parent triple and refuses a parented vault receipt whose root id and operation
  are not live, giving `search_vault` the same parented, content-free receipt
  `search_wiki` already had.

- Mechanical truth labels (06 §labeling rule, S10): `electron-main/truth.ts`
  (truth-core validator seat, 14 — validators never call AI). Providers
  submit ClaimCandidates that can assert FORM only (interpretive /
  needs-citation; the type admits nothing else); `labelClaims` computes
  every label: exact containment in a supplied selection → source-backed
  with hashed EvidenceRecord (quote + sha256, reproducible); no fuzzy
  matching by design (a paraphrase is model-only); derivability outranks
  asserted forms; smuggled labels fall to model-only (adversarial-tested).
  Panel UI: one chip per claim, [source] opens the anchor in the editor
  (select + scroll), [challenge] qualifies the claim inside the editable
  proposal — the repair patch preview accepted through the normal path.
- OUTPUT BUDGET, one number seen from two sides (CP-AI-CAPABILITIES S03,
  owner directive 2026-08-20): `PARAM_LIMITS.maxTokens.default` (renderer:
  what an absent field means) and `DEFAULT_MAX_OUTPUT_TOKENS` (main: the
  ceiling actually applied) are both 5000 and are pinned EQUAL by a test.
  They were 2000, and the bench cut a derivation off mid-formula — which is
  the failure mode that matters here: a truncated response is worse than a
  short one, because its tail is an unterminated `$$` or fence that reaches
  the reader as raw source. With the capability blocks telling the model it
  may emit diagrams, charts and derivations, long output is the expected
  shape rather than an outlier, so the budget follows the prompt.
- DEFAULT ENGINE (same directive): `resolveGenerationEngine` leads its
  key-scan with `google`, whose `defaultModel` is `gemini-3.7-flash`. The
  order only decides anything when no explicit `generationEngine` is stored
  AND several provider keys exist — the first-run case, and the one where
  nobody has chosen the engine that will be asked for a diagram.
- URL provenance on web-reader evidence (09/28, CP-MVP-006 S06):
  `electron-main/web-provenance.ts` resolves a `sources/web/<slug>/
  reader.md` selection to its dossier's identity (original_url,
  accessed_at, unquoted title) — CALLER-side in the `run-ai-operation`
  handler, so truth.ts/ai-mock.ts stay fs-free; `labelClaims` takes the
  resolved map and spreads it into `EvidenceRecord.source` (the
  url/dossierPath/accessedAt/title slice of 28's evidence sketch,
  renderer never asserts it). The relPath match is strict (one dot-free
  slug segment — can't climb out of sources/web/); resolution is
  best-effort by design (a broken dossier degrades to no-URL evidence,
  never a failed operation). Downstream: a new-note/append proposal
  from a web reader carries `Source: [title](url) — accessed date ·
  [dossier](relative-link)` (09 "create note with URL/provenance"; the
  dossier link is computed RELATIVE to the target note — root-absolute
  hrefs are dead clicks in the link router), and the AiPanel claim chip
  grows [page ↗] beside [source] (onOpenWebUrl threaded VaultView/
  ProjectView → EditorPane → AiPanel). E2E rung `ATOMIK_SMOKE_AI_WEB=1`
  seeds a fixture bundle and proves the whole chain on the real app.
- VAULT-GROUNDED CHAT (CP-MVP-010 S07): `AiOperation.grounding` is a
  REQUEST, never a payload — the renderer may ask for retrieval and
  bound it, but the packet is compiled MAIN-side from the instruction
  and its contents can never be supplied from the renderer. A prompt
  file can no more opt out of grounding than out of the mechanical
  grounding rules (28).
  - The packet's entries join `operation.input` as read-only reference
    selections (`referenceSelectionsOf`, pure and tested), which the
    existing chat contract already renders as "Reference notes —
    read-only, quotable". No new prompt block, no forked composition.
  - DIRECT entries are dropped from that injection: what the user
    already had open is in the operation's own selections, and sending
    it twice would pay twice for it.
  - The EXCERPT travels, never the whole note: the budget was decided
    when the packet was compiled, and re-reading files at send time
    would quietly undo it.
  - The packet returns on the bundle (`contextPacket`), so the answer
    and what produced it travel together and the reader never takes the
    grounding on faith. Consequence worth naming: because the excerpts
    are real vault text supplied as selections, an answer that quotes
    one EXACTLY earns `source-backed` through the ordinary containment
    rule (28) — retrieval still asserts nothing about truth, only that
    the sentence stands on that note.
  - UI, reshaped at S07b on the owner's first bench ("it seems that the
    packet information surface is emerging on the chat input ui when it
    is a message bounded information no? Also it is accessible but
    after sending the message, is that normal?"). Both halves of that
    report were right, and they have the same root: a packet is
    compiled for ONE message, so the composer — which is about the NEXT
    message — is the wrong home for it.
    - The TOGGLE stays in the composer: it is a preference for the next
      sends (session state, like the model drafts beside it).
    - The USED packet moved onto the turn it grounded, as a `vault N
      notes · ~T` pill in that turn's request breakdown, beside
      `system` / `your message` / `template`. It opens under the pills:
      each entry with the STAGE that found it (hover explains the rung
      in 33's vocabulary), its reason, the omissions summarized by
      reason, and the words the vault had nothing for. The COUNT
      persists in the transcript's sent meta like the other figures;
      the detail is session-live, exactly like `copy request`.
    - The composer keeps only a FORWARD preview: `preview` compiles the
      packet for the draft as typed and labels it "next send". It is
      dismissible and clears itself on send, because after the send it
      would be describing the past again.
    - A packet row says WHAT matched, not only where (S08b, owner bench
    round 4: "we don't know what content of the request has matched"):
    the reason reads `“ethos” in title, body`, and hovering it shows the
    excerpt that was actually sent.
  - APP MACHINERY NEVER GROUNDS (S08e, owner bench round 7): anything
    under `chats/` or `prompts/` is excluded from the packet, as
    `dialogue` and `machinery` respectively. The rule is on the PATH
    FAMILY rather than the node kind, because the graph rightly calls
    `chats/2026-08-03/index.md` a FOLDER — which is how a chat index
    walked straight past the S07c filter. Prompt files matter more than
    noise: feeding them back as reference is the model reading its own
    instructions as if they were the owner's knowledge.
  - DIALOGUE NEVER GROUNDS (S07c, owner bench round 2): a chat
      transcript is excluded from the packet — at the lexical stage and
      at the expansion stage — and the omission says `dialogue`. A chat
      grounded in old chats compounds its own output: the model's past
      answers would return as if they were vault knowledge. Transcripts
      stay in the retrieval index, so the search panel still finds them;
      they simply do not ground.
  - The lesson generalizes: derived information inherits the SCOPE of
      what derived it. A packet belongs to a message the way a claim
      belongs to an answer — putting it beside the composer made the
      chat's own timeline lie about when it happened.
- A CITATION IS NOT A LINK (S08d, owner bench round 6: "it still don't
  look like citation… the idea that you should use md citation format
  for it is a bad assumption, it should be format normally but with a
  different render"). The first version rewrote `[1]` into a markdown
  link, so the pill recipe rendered it as one more link — the objection
  was structural, not cosmetic. The answer's markdown is now left
  EXACTLY as the model wrote it and the markers are decorated afterwards
  (`editor/citation-chips.ts`, beside `claim-highlight`: same job, same
  shape) as a small round chip in the accent colour, skipping code and
  existing links. An invented number keeps its plain brackets, so a bad
  citation still looks like one.
- WHAT SURVIVES A CLOSED TAB (S08d): the you-heading carries `packet:`
  beside `sent:` — stage and path per entry, the packet's SHAPE — so
  reopening a conversation reopens "what the vault contributed". The
  excerpts and scores stay session-only: figures persist, prompts never
  do, and a transcript must not become a second copy of the vault.
- THE BREAKDOWN IS DETAIL (S08d): the request pills hide behind the
  `↑~N tok sent` total they explain, one click away, instead of
  crowding every turn.
- CITATIONS (CP-MVP-010 S08): `shared/chat-citations.ts`, pure.
  - The reference notes are sent NUMBERED (`### [1] \`path\``) with one
    short instruction, because the numbering IS the citation contract:
    a grounded answer that cannot be traced is worse than an ungrounded
    one — it borrows the vault's authority without offering the way to
    check it.
  - The Markdown stays exactly as the model wrote it. AFTER rendering,
    `editor/citation-chips.ts` decorates `[1]` / `[1, 2]` as raised
    citation markers; code and existing links are skipped, and a
    phrase-level link the model emitted remains an ordinary link.
  - The hover extent is one exact rendered sentence inside its nearest
    paragraph/list item/table cell/heading. In a blockquote, a closing
    citation instead covers the complete quoted passage; an inline
    citation followed by more quote prose stays sentence-local. The pure
    `citedSentenceRange` includes terminal punctuation whether it falls
    before or after the marker, while protecting points inside decimals
    (`€77.5`), abbreviations and dotted initials. Markers on the same
    sentence are grouped before DOM mutation, so they share one extent
    instead of nesting wrappers or shifting each other's offsets.
  - An invented number stays VISIBLE as `unresolved: [7]`. Silently
    dropping it would hide the one failure mode that matters, which is
    a model citing a source nobody gave it.
  - The map persists as a `cited:` heading comment beside `run:` — a
    heading now carries a LIST of comments — so a reopened transcript
    still resolves its markers. This session's packet is richer (it has
    titles); the file's map is what survives. Figures persist, prompts
    never do.
  - Under the answer, a sources block lists what was actually cited;
    clicking a marker or a source opens the note through the ordinary
    reveal path.
- RETRIEVAL traces (CP-MVP-010 S06): `recordRetrieval` appends one
  `action: 'retrieve'` line per compiled context packet — stages,
  candidates, selected entries, estimated context tokens, wallMs,
  `location: 'deterministic'`, zero EXTERNAL billing (33's rule: a local
  result reports zero external cost without claiming zero cost, and the
  wall time sits right beside it). Appended IMMEDIATELY, unlike a
  generation draft: retrieval has no accept/reject decision to wait for.
  The QUERY is never recorded — user text is content like a prompt — and
  a test greps the ledger to keep it that way. The line points at its
  packet by id, one-way: telemetry points at knowledge, never the
  reverse.
- The ActionTrace ledger (S09, 33-minimal): `electron-main/action-trace.ts`
  (the execution-core seat, 14) — ONE JSON line per operation appended to
  `.atomik/usage/private/actions.jsonl` at DECISION time (drafts in
  memory; failures append immediately; quit flushes undecided). Exactly
  the S09 minimum in 06's ActionTrace shape: ids, deterministic location +
  provider/model identity, estimated tokens (named estimated, chars/4),
  wallMs, EUR 0 estimated external, status + decision, contentRecorded
  false — a test greps the ledger for prompt/selection text and fails if
  content ever leaks. Badge in the AI panel via `get-ai-trace-summary`;
  decision reported via `resolve-ai-trace` (fire-and-forget: telemetry
  never blocks UX).
- The AI patch loop (06, S08; REAL engines CP-MVP-008 S02; MULTI-PROVIDER CP-PROVIDERS S02/S03/S05): the typed
  `GenerationAdapter` seam in `electron-main/generation.ts` (the ai-core
  seat, 14) behind `atomik:run-ai-operation` — engines are PURE COMPUTE;
  identity travels in the answering adapter's output, so the renderer
  contract is unchanged from the mock era. Multiple selectable engines:
  `ai-mock.ts` (S08, the deterministic offline path), `mistral-generation-adapter.ts`
  (Mistral chat completions: Mistral Large 2, Mistral Small 3, Codestral 2501, Pixtral Large),
  `openrouter-generation-adapter.ts` (OpenRouter gateway: Claude Sonnet 5, Claude Fable 5,
  Claude Opus 5, GPT-5.6 Sol/Terra/Luna, DeepSeek V4 Pro/Flash, Kimi K3, GLM 5.2, etc.
  with strict privacy controls: `allow_fallbacks: false`, `require_parameters: true`,
  `data_collection: 'deny'`, `zdr: true`, disabled lossy compression, and router metadata),
  and direct adapters `openai-generation-adapter.ts` (GPT-5.6 Sol, Terra, Luna, GPT-4.1, o3, o4-mini),
  `anthropic-generation-adapter.ts` (Claude Sonnet 5, Claude Opus 5, Claude Fable 5, Claude Opus 4.8),
  `deepseek-generation-adapter.ts` (DeepSeek-V3, DeepSeek-R1), and
  `google-generation-adapter.ts` (Gemini 3.7 Flash, Gemini 3.6 Flash, Gemini 3.5 Flash, Gemini 3.1 Pro Preview).
  Keys attached in MAIN only (13), budgets below renderer
  state (2k output tokens, 60s wall via AbortController, input token
  pre-check), and the eight-kind typed error taxonomy carried as
  `ai(<kind>): …` — offline / timeout / auth / rate-limit /
  provider-request / provider-server / cancelled / budget-exceeded —
  with NO silent fallback to the mock (13 explicit-policy rule).
  Engine selection and per-provider model overrides persist in `ai-settings.json`
  (`atomik:set-ai-engine`, `atomik:set-provider-api-key`, `atomik:set-selected-model`). `atomik:cancel-ai-operation` aborts the in-flight call
  by operation id (the AiPanel shows Cancel while running). Claim
  candidates over real output are extracted deterministically
  (sentences, fences dropped, capped) and `labelClaims` runs unchanged
  — exact containment stays the only road to source-backed (28).
  Traces (33, CP-PROVIDERS S06): provider-reported usage preferred over estimates, each
  labeled; external cost estimated in USD from the dated snapshot
  `model-research@2026-08-16` across all providers (Mistral, OpenRouter, OpenAI, Anthropic, DeepSeek, Google Gemini), snapshot
  id in the line; cloud lines wear `location: 'cloud-model'` +
  `privacy.mode: 'cloud'`, `contentRecorded` stays false.   The env-gated `ATOMIK_SMOKE_AI_LIVE=1` rung proves the live chain across providers
  (with optional `ATOMIK_SMOKE_AI_PROVIDER=<name>`, default 'mistral': engine switch,
  one real completion, cloud trace, mid-flight cancel; honest `skip:no-key` without a key).
  SCOPED PROMPT FOLDERS (S03, owner amendment 2026-07-21):
  `renderer/src/editor/prompts.ts` — a `prompts/` folder may live at
  the vault root, in ANY folder, and in a project bundle (a project IS
  a folder, so ONE walk covers all scopes); resolution NEAREST-WINS
  from the note outward with same-name shadowing (a project overrides
  a root prompt), scope tags keep shadowing visible; a prompt file is
  markdown + frontmatter `kind: system | message` (+optional
  title/description), non-prompts in prompts/ are skipped (never an
  error), index/log convention files excluded; scanned through the
  EXISTING verbs (`listVaultFiles`/`readNote` injected — zero new
  IPC). Message prompts join the AiPanel preset row (click loads the
  body); system prompts feed a selector whose body rides
  `AiOperation.systemPrompt` (bounded 8k in `isValidAiOperation`) —
  it replaces the built-in IDENTITY line only; the exact-quote
  grounding rules, destination brief, and no-preamble rule are
  composed main-side REGARDLESS (no prompt file opts out of the
  mechanical contract, 28). Starters materialize ONLY via the
  explicit ☰ → "Create starter prompts" action
  (`materializeStarterPrompts` — idempotent, missing-only, createNote
  births the folder with its S07k conventions; no writes on open).
  S03b (owner directive 2026-07-21): the TREE context menu shows
  "New prompt…" inside any prompts/ folder (`isPromptsFolder`) — a
  kind radio (message | system) + name input autofill the frontmatter
  (`buildPromptFileContent`: kind, name→title, a layer hint in the
  description) through the same createNote verb, and the file opens
  for editing. LAYERS: a full-line `{{prompt: name}}` directive
  inside a prompt body inserts the named prompt as a buildable layer
  (`expandPromptLayers` — system and message compose freely, the
  OUTER prompt's kind governs use); names resolve through the SAME
  nearest-wins scoping, so a project overrides a layer like it
  overrides a prompt; nesting capped at 8; unknown names, cycles, and
  inline mentions stay LITERAL — a broken reference is visible, never
  silently dropped; expansion runs at load, after shadowing.
  S03c (owner directive 2026-07-21): `@` in the AI instruction field
  summons the prompt menu (the editor's @ citation-menu precedent,
  hand-rolled for the textarea): a token opens at an `@` that starts
  the text or follows whitespace (emails/mid-word @ inert), filters
  name+title as you type, arrows/Enter/Tab/Escape + click; picking a
  MESSAGE prompt inserts its LAYER DIRECTIVE `{{prompt: name}}` at
  the caret (padded onto its own line mid-text so the full-line rule
  holds — S03d owner correction: never the flattened body; the
  instruction IS a buildable custom prompt), picking a SYSTEM prompt
  sets the system selector and removes the token; rows wear kind +
  scope tags (36 popover idiom, glass + opaque fallback). Prompt
  PILLS wear a dashed ring + @ glyph (visibly file-backed) and a
  click APPENDS the directive — never overwrites typed text. The
  instruction composes at RUN TIME (`expandInstruction`) against the
  note's resolved scopes; the box keeps the layered form; unknown
  layers travel visibly literal. `parsePromptFile` tolerates CRLF —
  a Windows-edited prompt must not vanish from the menus. Pure
  helpers `atPromptToken`/`applyAtInsertion`/`insertDirectiveAt`/
  `expandInstruction`/`filterPrompts` (nearest-first order pinned
  through the filter). S03e (owner bench screenshots): the EDITOR's
  own @ citation menu leads with PROMPTS when the edited note lives
  in a prompts/ folder — `promptLayerEntries` in quick-actions.ts:
  chipped `prompt` (accent pill beside note/source), nearest-first
  via CodeMirror boost (chain position encoded), inserting the layer
  directive `{{prompt: name}}`, never a link; the file never offers
  itself; outside prompts/ folders the menu is unchanged (a
  directive is inert in an ordinary note). S03f (owner brainstorm,
  prompted exchange: drag-and-drop + save-now): the system side is a
  STACK — ordered composable blocks (`personality › tone ›
  objectives`) built in the panel: @ picker appends (duplicates
  no-op), pills drag to reorder (`reorderStack`), × removes; the run
  composes bodies in order (`composeSystemStack`, already
  layer-expanded; deleted blocks drop silently) into ONE
  `systemPrompt` — grounding rules still compose main-side on top.
  "save" writes the stack as a prompt FILE of directive lines
  (`stackFileContent`, root prompts/) — round-trip tested: expanding
  the saved file reproduces the composition, which is what makes
  stacks reusable, shareable, and AGENT-AUTHORABLE (a future agent
  with vault access writes sub-agent behaviors as these same files).
  S04 (the selection is the entry point, 05): the AI trigger LEFT the
  note-bar (top row = editing concerns only) — right-click in the
  editor (or Shift+F10 at the caret) opens
  `renderer/src/editor/AiSelectionMenu.tsx` at the click location
  (TreeMenu machinery: overlay, on-screen clamping, morph in place):
  S04c (owner redesign): ONE flat composer, no morph — an orderable
  MESSAGE section and the BUILT-IN section share one numbered click
  sequence, the SYSTEM section numbers its own (the stack); the
  sequence composes via `composeMenuInstruction` (layer directives
  for files, raw lines for built-ins, the OPTIONAL typed input
  last); Enter runs and closes (Shift+Enter newline); display capped
  per section (`visibleMenuPrompts`) with a search bar past the
  threshold — picked pills never leave view; "Open chat" in the
  footer opens the PANE's chat column (S06). A menu run previews
  INLINE (S05b): `editor/inline-ai.ts` renders the proposal over the
  target range as a CM block widget (accept / edit / reject + claim
  strip + trace badge, cancel while running; the anchor maps through
  edits), new-note runs preview as a simulated tab
  (`AiNotePreview.tsx`); either way the buffer changes exactly ONCE,
  on accept, through applyChange + save. The docked
  `AiPanel.tsx` RETIRED at S06 into the two surfaces (inline +
  chat); its `BufferChange`/`PRESETS` live in `editor/ai-helpers.ts`.
  The AI channel has no filesystem path — "AI wrote my file" is
  structurally impossible.
- The chat pane (CP-MVP-008 S06 column → S06c own pane → S06c2 pane
  TYPE, 26/06; owner: "a specific pane, not a tab — but tabs handle
  multiple chats in the chat pane"): 'chat' is a PANE TYPE beside
  vault/project/docs (`tree.kind === 'chat'`; no tree panel at all)
  whose tabs are CONVERSATIONS — `ChatView.tsx` renders each
  (`view: 'chat'`), the pane's `+` opens another chat tab, and the
  transcript pointer (`file`) + context pick (`ctx`) ride ordinary
  validated tab params, relocated like every other view's
  (`relocateTabPaths` includes `file`), so no other pane's lifecycle
  can touch a conversation. `openChatPane` (model) spawns the pane —
  focus an existing chat tab anywhere, else split right into a
  chat-typed pane — from the tabstrip ChatIcon, the selection menu's
  "Open chat", or pane birth (the New Pane chooser gained Chat). The
  CONTEXT picklist covers EVERY open note-bearing tab: mounted views
  register in a workspace-wide registry
  (`workspace/ai-context.ts`, useSyncExternalStore module store —
  editors as EDITABLE entries with selection/doc/insert through
  their buffer + save, read-mode notes as READ-ONLY), and
  `openNoteTabPaths` (model) adds open-but-INACTIVE note and source
  tabs from workspace state — picked while unmounted, the note is
  read on demand as a read-only whole-note context (options wear a
  "— read-only" marker; insert needs an editor). S06c3 (owner):
  contexts are MULTIPLE — ordered pills in the `ctx` tab param (JSON
  list, legacy single-path reads as one; capped at 6 — the operation
  input cap is 8), the FIRST is the primary insert/append target
  (◉), the rest ride the operation as additional bounded selections;
  the candidate select + "+" adds, each pill's × removes, and the
  tree's existing drag payload DROPS into the chat as context (a
  note adds itself, a folder its notes recursively, capped). The
  S06c5 LAND FIX: the answered dropEffect must sit inside the
  source's effectAllowed (`compatibleDropEffect`,
  editor/drag-context.ts — the old 'link' answer under the tree's
  'move' made Chromium refuse every real drop), and two more drag
  SOURCES join: note-bearing TABS drag their note (`tabDragSource`:
  vault/project notePath, source dossier, a chat tab its transcript;
  effectAllowed 'copy'), and an EDITOR SELECTION drags with its path
  + range (EditorPane enriches dragstart with SELECTION_DRAG_MIME;
  the chat answers 'copy' so CodeMirror never deletes the source),
  landing as a RANGED pill `path#from-to` (`parseChatContextEntry`) —
  the send quotes exactly that slice, range-anchored so the checker
  can mark it source-backed.
  `relocateTabPaths` rewrites paths inside the ctx list too (ranged
  entries keep their suffix).
  Double-clicking a chat TAB renames its transcript in place
  (`chatRenameTarget` sanitizes; `relocateApply` rewrites links and
  broadcasts, so the tab's file param follows through the ordinary
  relocation path). The S06 pane-chrome
  column and its leaf `chat` map are RETIRED — the validator still
  accepts the map (saved states stay loadable), nothing renders it. Multi-turn rides the SAME
  operation contract: prior turns travel as `operation.thread`
  (`{role: user|assistant, content}`, validated in main — ≤24 turns,
  ≤8k chars each; `buildMessages` replays them verbatim between
  system and the live composed turn; the mock stamps `(turn N)` so
  multi-turn is provable offline). Each send runs `prepareAiRun`
  over the pane's ACTIVE editor (registered as `PaneAiSurface` via
  the S07d guard pattern: notePath + getSelection/getDoc/insert), so
  selection, prompt layers, and note context behave exactly like any
  AI run. Transcripts are vault FILES (S01 pin):
  `chats/YYYY-MM-DD-<slug>.md`, frontmatter `type: Atomik Chat` +
  engine + timestamp, BORN at the first message (never on open;
  createNote is exclusive — collisions retry `-2`, `-3`…), each turn
  appended as `## you` / `## atomik` through readNote/writeNote with
  the mtime handshake; `editor/chat-file.ts` holds the pure
  convention (slug/birth/append/lenient parse/thread mapping) —
  round-trip tested. "Insert into note" lands an answer AT THE
  CURSOR through the same buffer + save path as any accepted patch
  (`insertionChange` pads it into its own block) and resolves the
  turn's trace as accepted. S06b (owner bench on the REAL provider,
  six directives): turns wear chat ORIENTATION (you right as tinted
  bubbles, atomik left); a header HISTORY menu lists `chats/`
  newest-first (`chatHistoryOf`; the 36 popover idiom `.chat-pop`)
  and reopens any transcript; the S05d GENERATION OPTIONS became
  shared — pure drafts→params in `editor/gen-params.ts`, fields UI
  in `gen-options.tsx`, consumed by the selection menu AND the chat
  compose area; an answer PROMOTES to its own note
  (`chatNotePathForMessage`: first heading names it, first words the
  fallback, links stripped) opening BESIDE the chat via
  `openNoteInNewPane` (split right, pane typed, tree born hidden —
  the note is the point); `@` in the input QUOTES prompts/notes/
  sources (`editor/chat-at.ts` over the same providers as the editor
  @ menu: message prompts insert their layer directive, notes and
  source dossiers a relative markdown link that the S04o
  linked-note pipeline quotes automatically). Robustness from the
  owner's disappeared-chat report: a failed transcript read KEEPS
  the file pointer (transient failures no longer wipe the chat),
  `relocateTabPaths` drags `chat.file` on rename/move, close paths
  are regression-pinned, and both side columns cap at a pane
  fraction (tree 35%, chat 45%) so a split never crushes the note.
  CP-FEEDBACK S02 corrects the message geometry after daily use, and
  CP-MVP-010 S10i corrects its later centring: `.chat-thread` is ONE
  centred conversation lane. User turns remain compact bubbles aligned
  to that lane's right edge; Atomik turns are flat, stretch across it,
  and begin at its left edge. No message is independently centred.
  (`.markdown-body` normally auto-centers, so `.chat-turn-body`
  explicitly resets that margin.) The scroll stream
  carries `role="log"`, a polite live policy limited to additions, and
  `aria-busy` while an exchange runs; this announces completed turns
  without treating changing metrics as new messages. Assistant actions
  remain quiet until pointer hover or keyboard focus-within, so the same
  controls are discoverable without permanently crowding the answer.
  The presentation follows the flat assistant variant documented by
  [Vercel AI Elements](https://v6.ai-sdk.dev/elements/components/message)
  and the chronological update semantics of the
  [WAI-ARIA log pattern](https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA23);
  neither reference changes Atomik's file-backed transcript contract.
