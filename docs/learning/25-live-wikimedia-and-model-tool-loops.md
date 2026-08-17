# 25 — Live Wikimedia and model tool loops, from zero

This note teaches the two new ideas CP-MVP-011 introduces: reading public
knowledge through a bounded API seat, and letting a language model request a
read-only tool without giving the model authority over the application.

Start with one distinction:

```text
the model chooses a verb and arguments
the application decides whether that verb exists and executes it
```

The model never “has the internet.” It emits data that Atomik validates.

## 1. What an API seat is

An API is a set of HTTP request/response shapes. A **seat** is Atomik's small
adapter around those shapes. It owns everything that should not leak across the
rest of the program:

- allowed hosts and endpoints;
- the identifying User-Agent;
- timeouts, cancellation, response-byte limits and rate-limit handling;
- parsing hostile remote JSON/HTML into small internal types;
- typed errors and provenance.

The public half starts in
`apps/desktop/shared/wikimedia.ts`. It is pure: no `fetch`, Electron, filesystem
or DOM. That lets `apps/desktop/tests/wikimedia-contract.test.ts` prove the
host and validation rules in milliseconds.

The later main-side half lives in `electron-main/wikimedia.ts`. Main is the
correct trust boundary because the renderer displays both trusted vault data
and hostile remote material. Giving the renderer a generic URL fetch would let
any compromised renderer choose what network resource to read. Instead it can
eventually ask for one typed operation whose host is derived from a validated
project and language.

### S02: bounding the response while it is still a stream

Checking `text.length` after `await response.text()` is too late: the whole
remote body is already in memory. `boundedText` first rejects an excessive
`Content-Length`, then reads the response stream chunk by chunk and cancels the
reader as soon as either the per-response or whole-search byte budget is
crossed. Only the bounded bytes are decoded and parsed as JSON.

Cancellation has two authors: the parent AI operation and a per-request
timeout. `requestSignal` links both to a fresh AbortController, remembers which
one won, and always removes its listener/timer. That is why the caller gets
`cancelled` when it pressed Cancel and `timeout` when the remote service took
too long — both abort the same fetch, but they mean different things.

`WikimediaClient.searchWikipedia` then performs a deliberately sequential
search → page loop. Sequential requests make rate limits, cancellation and
request accounting deterministic. Page HTML is parsed in main, chrome and
reference furniture are removed, whitespace is normalized, and the result is
clipped on a word boundary. Page id, latest revision, canonical URL, access
time and licence stay attached to that derived text.

The client records one privacy-safe child receipt through the injected
`WikimediaTraceSink`. `ActionTraceLedger.recordWikimedia` can persist it because
the receipt type has no field in which a query or article could be placed.

### Hands-on: read the host rule

Find `wikimediaHostOf`. Try the inputs `wikipedia + fr`,
`wiktionary + zh-min-nan`, and `wikipedia + ../evil`. The first two become
known Wikimedia hosts; the third fails. This is **allowlisting**: construct the
small set that is permitted instead of trying to recognize every dangerous
URL.

## 2. Several Wikimedia projects, several contracts

“Wikimedia” is not one database.

- **Wikipedia** is an encyclopedia page. Atomik wants a ranked search result,
  bounded consulted text, page/revision identity, URL, access time and licence.
- **Wikidata** is structured statements about entities. A QID is an entity id;
  a PID is a property id. A statement also has rank and a typed value. Atomik
  keeps only `WIKIDATA_PROPERTY_ALLOWLIST`, because accepting every property
  would create an accidental ontology and an unbounded payload.
- **Commons** holds media whose licence and attribution vary per file. P18 on a
  Wikidata entity points to a Commons filename. An image without a meaningful
  creator and concrete licence is withheld; the app never fills blanks with a
  guess.
- **Wiktionary** is community-authored lexical material organized by headings.
  Cross-edition structured etymology is not a stable universal API, so Atomik
  extracts a bounded section conservatively and says `unknown` when it cannot
  justify a stronger etymology status.

This is **contract normalization**: four foreign response formats become the
four discriminated result kinds in `shared/wikimedia.ts`. Downstream code can
switch on `kind` and TypeScript narrows the fields it may use.

### S03: Wikidata is statements, not a JSON dictionary

`searchWikidata` first calls `wbsearchentities` and keeps the returned order.
The `atom` fixture is the useful warning: the Atom editor ranks first and the
chemical atom ranks fifth. A matching label is not permission to choose an
entity silently, so multiple candidates carry an `ambiguous` warning.

The second request uses `wbgetentities` for those QIDs. The response may contain
thousands of claims and cannot be filtered to selected properties server-side.
`wikidataStatementsOf` therefore iterates only
`WIKIDATA_PROPERTY_ALLOWLIST`, caps values per property and per entity, checks
the statement rank and mainsnak datatype, and discards everything else before
the result leaves main. It then batches one labels-only request for the QIDs
actually retained as entity values. This is **parse, reduce, then enrich**:
unwanted claims never vote on later work.

`wikidataGraphProjectionOf` turns entity-valued statements into ordinary
`GraphNode` and `GraphEdge` records. Canonical Wikidata URLs are node ids — a
QID never pretends to be a vault path. Time and P18 values stay display/media
data, not graph edges. `withExternalGraphProjection` returns a new session view
without mutating the file-built graph, and the projection carries a separate
provenance list. Nothing calls the graph persistence seat.

### S04: media and word origins need different fail-closed rules

A Wikidata P18 value is only a Commons filename. It is not yet an image that
Atomik may present. In explicit `remote` mode, `searchWikidata` resolves the
few retained filenames with one Commons `imageinfo` request. Main reduces the
selected `extmetadata` HTML to bounded plain text and returns a
`CommonsMedia` only when all of these survive validation:

- the requested file identity and source-page identity;
- HTTPS original and thumbnail URLs on `upload.wikimedia.org`;
- an explicit creator, including an honest value such as “Unknown author”;
- a licence name and safe licence URL.

Missing attribution is not repaired with plausible prose. The media item is
withheld and the result carries `media-withheld`. Private/offline mode is even
stricter: it skips the Commons request and returns no remote media URL. A
thumbnail is therefore disposable chat presentation, never a durable hotlink.

Wiktionary needs a structural rather than attribution gate. The first parser
pins only English (`English` → `Etymology`) and French (`Français` →
`Étymologie`) edition headings. It selects the matching language section,
removes nested definition/pronunciation sections and reference furniture, and
clips each section plus the combined search result. A starred or explicitly
reconstructed/disputed/attested source marker can strengthen `status`; ordinary
origin prose remains `unknown`. That uncertainty is a result, not a parser
failure to hide.

### Provenance is not truth

`WikimediaSource` records where and when text was consulted: project,
language, page id, revision, URL, access time and licence. That is enough to
return to the source. It does not prove the statement is correct. Bedrock 28's
rule still applies: relevance and citation are evidence routing, not an
epistemic verdict.

The same distinction explains transient storage. A result can ground one chat
turn without becoming a vault file. Only Save as source promotes it through a
previewed, explicit write.

## 3. Function calling is a two-turn protocol

Without tools, the adapter sends messages and receives final text:

```text
user question -> model -> final answer
```

With client tools, the model may stop and request work:

```text
user question
  -> model returns tool call { id, name, arguments }
  -> Atomik validates and executes it
  -> Atomik returns an untrusted tool result with the same id
  -> model continues, perhaps calls again, eventually returns final text
```

Providers encode the middle differently. OpenAI-style chat APIs use assistant
`tool_calls` and `tool` messages. Anthropic uses `tool_use` and `tool_result`
content blocks. Those are wire dialects, not Atomik architecture.

`apps/desktop/shared/generation-tools.ts` is the provider-neutral layer. It has
exactly two names:

- `search_vault`: query the existing ContextPacket machinery;
- `search_wiki`: query the Wikimedia seat with an explicit language/corpus.

`parseGenerationToolCall` is the authority gate. The provider adapter first
turns its native response into `{ id, name, arguments }`; the parser rejects an
unknown name, disabled mode, malformed call id, widened fields, invalid
language, or over-budget arguments. The executor never dispatches by evaluating
model text and never accepts a model-provided function.

This pattern is **dependency inversion**: vendor adapters depend on Atomik's
two-tool contract, while the core does not depend on a vendor's message shape.

### S05: one operation door, not one renderer network channel

The renderer already has one named AI operation IPC method. Adding a separate
`searchWiki` preload method would let renderer state execute the network rung
outside the model-tool policy and its parent trace. S05 therefore adds only a
strict `AiOperation.tools` preference to the existing wire object:

```text
{ mode: "off" | "model", wikiLanguage: "en" }
```

Main parses that object, rejects widened fields and unsafe language labels,
then derives the allowlist. A later provider call must use the same pinned
language; the model cannot silently switch editions. The actual executor is
`WikimediaClient.search` inside main. Specific corpora dispatch to their fixed
seats. `auto` consults Wikipedia and Wikidata sequentially with one shared
request/response-byte counter and one AbortSignal, so crossing the corpus
boundary resets neither budget nor cancellation.

Trace identity follows the same ownership rule. `beginGeneration` reserves a
root trace id immediately before provider work. `recordWikimedia` accepts a
child only while that exact root id and operation id are active; the completed
or failed generation line later reuses the reserved id. If the app quits in
between, `flush` lands the reserved parent as failed rather than leaving an
orphaned retrieval receipt.

### S06: who owns the loop, and who owns the transcript

The second turn needs the FIRST turn's provider message state — the assistant
message carrying the tool call must be replayed verbatim beside the tool result,
or the provider rejects the continuation. Two designs are possible:

```text
A  the loop keeps provider messages     -> the loop learns every wire dialect
B  the adapter keeps them in a closure  -> the loop stays provider-neutral
```

Atomik takes B. `startToolLoop` returns a discriminated turn, and a `tool-calls`
turn carries `continue(results)` — a closure over that adapter's own message
array. The loop hands back results and receives the next turn; it never sees a
`tool_calls` field or an Anthropic content block. Authority is the mirror image:
budgets, parsing, execution, cancellation and the fallback live in the loop, so
adding a provider cannot loosen a limit.

The distinction that matters most in the loop is **a bad call versus a broken
operation**. A rejected name, malformed arguments or a failing seat becomes an
untrusted error RESULT handed back to the model, which can correct itself — the
provider transcript stays valid, and the exchange still ends in an answer. A
budget breach, an empty tool turn, parallel calls from an adapter that declared
`parallelCalls: false`, or an executor result whose id/name does not match the
call it answers ends the operation with a typed `GenerationError`. The first
class is expected model behavior; the second means something is no longer
trustworthy, and continuing would spend the owner's money on a loop that has
already lost its invariants.

Cancellation gets its own controller. The loop aborts an inner signal from
either the caller's signal or the wall-budget timer, so in-flight tool work
actually stops — but it remembers WHICH fired, because a user pressing cancel
and a runaway loop hitting its ceiling are different diagnostics that a shared
`AbortError` would flatten into one.

Bounding the result is a serialization problem, not a `slice` problem. A tool
result must reach the provider under budget AND still parse as JSON, so
`boundedToolContent` clips inside the structure: longest prose fields first,
then repeated array entries, then — only if the shape itself is too large — a
bare truncation marker. Truncating the serialized string instead would hand the
model a syntax error and waste the whole turn.

### S06b: one dialect, one codec — and never rebuild the wire

Adding the second provider is where you find out whether the boundary was
drawn in the right place. It was, with one correction.

Providers do not divide into "each needs its own integration". They divide into
DIALECTS, and the dialect is not always the one the vendor's name suggests:

```text
openai-chat-completions   Mistral · Google · OpenAI · OpenRouter · DeepSeek
anthropic-messages        Anthropic
```

Google lands in the first group because Atomik's adapter targets Gemini's
OpenAI-compatibility endpoint rather than the native `generateContent` API. So
the codec written for Mistral serves Gemini unchanged, and the adapter supplies
only transport, usage arithmetic and result shaping. Count dialects, not
vendors, before deciding how much work a provider is.

The correction came from probing the live endpoint instead of assuming its
response shape. Gemini returns this on a tool call:

```json
{ "id": "call_…", "type": "function",
  "function": { "name": "search_wiki", "arguments": "{…}" },
  "extra_content": { "google": { "thought_signature": "…" } } }
```

That `thought_signature` carries reasoning continuity across the tool boundary.
The original codec REBUILT the assistant turn from the fields it had
normalized — `{id, type, function:{name, arguments}}` — which is byte-for-byte
plausible and silently drops the signature. Hence the rule:

```text
normalize INWARD   for Atomik's authority layer — parse, validate, execute
echo OUTWARD       the provider's own message object, field for field
```

**A normalized copy is not a substitute for the original.** Anything you did
not model is exactly what gets lost, and vendor extras are where the losses
hurt. A probe catches this in one request; a fixture written from imagination
never would.

Two smaller findings from the same probe, both now pinned by tests: Gemini
omits `content` **entirely** on a tool turn (an absent key, not an empty
string), and its `total_tokens` exceeds `prompt + completion` because thinking
is billed as output without appearing in `completion_tokens` — so cost computed
from prompt+completion understates real spend.

## 4. Why the result is marked untrusted

A Wikipedia page can contain prose such as “ignore earlier instructions.” It
is content, not a system instruction. `GenerationToolResult.untrusted: true`
forces the composition layer to label the block and place it in the data part
of the provider message.

This is the same prompt-injection boundary used for vault reference excerpts:
the model may quote or synthesize the material, but the material cannot add a
tool, change budgets, choose a destination file, or waive citation rules.

## 5. Loops need receipts and stop conditions

A naïve loop can call forever, duplicate expensive text, or keep making remote
requests after cancellation. `GENERATION_TOOL_LIMITS` names independent stop
conditions:

- calls per operation and recursion depth;
- arguments, per-call result and total result sizes;
- wall time and cancellation;
- vault result/token caps;
- Wikimedia response, text and request caps.

Do not merge these into one “token limit.” Bytes protect memory/network, chars
protect the provider prompt, calls protect remote work, depth protects control
flow, and wall time protects interaction latency. Different failures need
different diagnostics.

Each actual tool call later gets a child ActionTrace. The trace records tool,
corpus/language, count, bytes, latency, outcome and parent operation — never the
query or returned content. This is **content-free observability**: enough to
debug cost/reliability without turning telemetry into a shadow copy of the
owner's research.

## 6. Fail closed while building

At S01 every `GenerationAdapter` declares `tools.kind === 'unsupported'`.
Although several providers document native function calling, Atomik has not yet
implemented and fixture-tested their message codecs. Advertising support early
would route a production operation into code that cannot complete the second
turn.

S06 opts in one adapter only after tests prove:

1. exact tool schema in the first request;
2. call id/name/arguments extraction from a recorded response;
3. assistant call plus matching tool result in the continuation request;
4. final answer extraction and cumulative usage;
5. malformed payload, cancellation and budget exhaustion.

This is **capability declaration**: behavior becomes available when the code
can demonstrate it, not when a vendor documentation page says it exists.

S06 met that bar for Mistral only, against recorded payloads under
`tests/fixtures/generation-tools/` — no test reaches a live provider. The other
six adapters stay final-only, and the loop makes that state LOUD rather than
silent: an unsupported engine still runs the deterministic vault grounding pass
and returns an `uncertainties` warning naming the engine and the reason. A user
who switches models sees why the answer stopped consulting Wikipedia, instead of
watching quality quietly drop.

## 7. Methodology used in this path

The step order is contracts-first:

1. recheck volatile facts in official documentation and record a dated
   snapshot under `docs/research/`;
2. write pure types, budgets, host construction and validation;
3. pin hostile and edge cases before transport code;
4. implement the injected main-side seat against local fixtures;
5. add IPC only after the core has a narrow operation worth exposing;
6. add provider codecs around the unchanged tool union;
7. add UI/citations, then explicit persistence;
8. run a live opt-in bench last, never as CI.

This keeps API drift at the outside and makes most failures reproducible
offline.

## Exercises — prove ownership

1. In `wikimedia-contract.test.ts`, add a valid language with three subtags and
   a hostile language containing a slash. Explain why both are handled before
   any URL object exists.
2. Pick one PID in `WIKIDATA_PROPERTY_ALLOWLIST`. Find its value kind and state
   whether it may become a graph edge, displayed literal, or Commons lookup.
   Then describe the test you would require before adding a new PID.
3. Draw one OpenAI-style and one Anthropic-style tool round trip. Circle the
   provider-specific fields; everything outside the circles belongs in the
   neutral loop.
4. Lower `maxArgumentsChars` below a valid `search_wiki` request and run the
   contract test. Identify which boundary rejected it and why no HTTP call was
   possible.
5. Design a malicious tool result containing an instruction and a fake URL.
   List the layers that prevent it from choosing another tool, writing a file,
   or becoming a valid citation.
6. Explain why `thin` vault coverage should be visible to the model but must
   not itself execute `search_wiki`.
7. In `wikimedia.test.ts`, change the fake `Content-Length` from 100 to 40.
   Explain why the failure moves from the byte gate to JSON validation, and why
   neither case can allocate an unbounded response.
8. Search the `wikidata-entity-fr-marie-curie` fixture for `P999`. Follow the
   parser and explain why `must-not-cross` cannot appear in the normalized
   bundle, label follow-up, graph projection, or trace.
