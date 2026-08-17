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

