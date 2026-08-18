# Wikimedia live API snapshot — 2026-08-17

Purpose: dated implementation facts for CP-MVP-011. This is not product memory
about eternal API behaviour. Recheck the linked primary documentation when an
endpoint, parser, rate policy, or licence rule changes.

## Decision summary

| Seat | Endpoint family | Why |
| --- | --- | --- |
| Wikipedia search/page | MediaWiki Core REST, `/w/rest.php/v1/search/page` and `/page/{title}/with_html` | current revision metadata, licence and structured page HTML without choosing the deprecated RESTBase route |
| Wikidata search/entity | Action API, `wbsearchentities` then `wbgetentities` | entity IDs plus labels, aliases, descriptions, sitelinks and statements |
| Commons P18 metadata | Action API `query` + `imageinfo`, bounded `extmetadata` fields | file-specific creator, credit, licence, source page and thumbnail/original URLs |
| Wiktionary page | MediaWiki Core REST `page/{title}/with_html` | works across editions; the structured definition API is experimental and English-only |

The fixed host and request/result shapes are pinned in
`apps/desktop/shared/wikimedia.ts`. No response raw HTML crosses IPC.

## Official facts checked

### MediaWiki Core REST, not legacy RESTBase

- Core REST documents page search and page retrieval beneath
  `/w/rest.php/v1`. Page search returns id/key/title/description/excerpt and an
  optional thumbnail. `with_html` returns the page identity, latest revision,
  licence, and Parsoid HTML. Sources:
  [REST API get started](https://www.mediawiki.org/wiki/API:REST_API/Get_started),
  [REST API reference](https://www.mediawiki.org/wiki/API:REST_API/Reference/en).
- Wikimedia is migrating traffic away from RESTBase (`/api/rest_v1`) toward
  MediaWiki Core REST. New code therefore does not start on the old summary
  endpoint. Sources:
  [RESTBase deprecation](https://www.mediawiki.org/wiki/RESTBase/deprecation),
  [service migration](https://www.mediawiki.org/wiki/RESTBase/service_migration).
- TextExtracts still exists, but its own documentation points new Wikimedia
  production features toward newer page-content services. The separately named
  Page Description API is scheduled for deprecation in July 2026, so it is not
  a new dependency here. Sources:
  [TextExtracts](https://www.mediawiki.org/wiki/Extension:TextExtracts),
  [Page Description API](https://www.mediawiki.org/wiki/Page_Description_API).

Observed with an identifying user agent on 2026-08-17 (diagnostic only, never a
CI fixture): `en.wikipedia.org` search for `Atom` returned page id 902 and a
search excerpt; `page/Atom/with_html` returned revision id 1368905891,
timestamp `2026-08-11T19:33:57Z`, CC BY-SA 4.0 licence metadata, and about
683k HTML characters. The large page is why the transport must enforce a byte
ceiling while reading, then derive a much smaller cited text result.

S02 fixture refresh also checked the French edition at low concurrency:
`Atome` returned page id 189 and Core REST returned revision id 238155014,
timestamp `2026-07-27T17:50:43Z`, and the French CC BY-SA 4.0 deed URL. CI
keeps only minimal schema/content fragments for those English/French cases,
not the full remote articles.

### Identification, rate limits and deprecation

- Wikimedia requires an informative User-Agent with a way to contact the
  operator. Atomik sends its product/version and repository URL from main.
  Source: [Wikimedia User-Agent policy](https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy/en).
- Published rate tiers are operational facts, not an application budget.
  Clients must back off on 429, heed `Retry-After`, and avoid request bursts.
  Source: [Wikimedia API rate limits](https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits).
- During the same diagnostic, a small parallel burst reached a real HTTP 429
  with `Retry-After: 9`. That observation pins the failure fixture and the
  decision to serialize/restrict calls; it does not assert a stable threshold.
- Breaking/deprecation policy is documented, but model and extension surfaces
  still need dated fixture probes. Source:
  [MediaWiki API deprecation policy](https://www.mediawiki.org/wiki/API:Deprecation).

### Wikidata

- `wbsearchentities` is the ambiguity-preserving first call. It returns QIDs,
  language-aware matches, labels/descriptions and concept URLs. `wbgetentities`
  supplies labels, aliases, descriptions, sitelinks, revision information and
  claims. Sources:
  [presenting Wikidata knowledge](https://www.mediawiki.org/wiki/API:Presenting_Wikidata_knowledge),
  [Wikibase API](https://www.mediawiki.org/wiki/Wikibase/API/en).
- Claims are statements with ranks and potentially qualifiers/references, not
  a flat key/value dictionary. `wbgetentities` cannot ask the server for only a
  chosen claim-property subset, so main filters immediately to the allowlist in
  `WIKIDATA_PROPERTY_ALLOWLIST` and discards the rest before crossing IPC.
- Wikidata structured data is CC0. That does not make a linked Wikipedia page
  or Commons file CC0. Source:
  [Wikidata data access](https://www.wikidata.org/wiki/Wikidata:Data_access/en).
- The fixture corpus deliberately searches `Atom`: the live search's first
  candidate was Q16766305 (the Atom editor), demonstrating why a label match
  must remain a ranked candidate rather than being silently promoted as the
  requested concept. The five-result probe ranked the chemical atom Q9121
  fifth, after an Atom web standard, the dalton unit and a game; the fixture
  retains that exact order and the ambiguity signal.
- The dated Marie Curie probe returned Q7186 revision 2532255818, French and
  English labels/sitelinks, entity-valued occupation/place/citizenship claims,
  birth time, and P18 `Marie Curie (1900) (cropped).jpg`. S03's minimal fixture
  adds a synthetic non-allowlisted P999 sentinel solely to prove immediate
  filtering; the sentinel is not asserted as live Wikidata content.

### Commons P18

- P18 supplies a Commons file title. `imageinfo` returns dimensions, MIME,
  original/thumbnail URLs, and selected `extmetadata`. Because extmetadata is
  expensive, request only the attribution/licence/description fields and only
  for the few P18 candidates already selected. Source:
  [Imageinfo API](https://www.mediawiki.org/wiki/API:Imageinfo/en).
- Every file can have different reuse conditions. Durable reuse must retain
  creator/credit, licence name and URL, source page, and any attribution or
  share-alike requirements. Source:
  [Commons reuse guide](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia/en).
- `extmetadata` values may contain HTML. They are hostile input: parse to plain
  text in main, cap them, and reject a media presentation whose creator or
  licence is not meaningful. The diagnostic `File:Example.jpg` returned an
  icon-only Artist value and Public Domain terms; that is the pinned
  missing-attribution case, not permission to invent a creator.
- The low-rate S04 P18 probe followed Q7186 to
  `File:Marie Curie (1900) (cropped).jpg` (Commons page id 123803240). Its
  selected imageinfo timestamp was `2022-10-05T09:16:49Z`; upload and thumbnail
  URLs were on `upload.wikimedia.org`; Artist explicitly said `Unknown author`;
  and the terms said `Public domain` without a `LicenseUrl`. Atomik preserves
  that explicit uncertainty and maps only this named Public Domain case to the
  Commons Public-domain reuse explanation. It does not manufacture a CC deed
  or a named photographer.
- Remote thumbnails are transient presentation only and are disabled by
  private/offline policy. A saved source copies bytes locally instead of
  hotlinking. Source:
  [Wikimedia API access policy](https://www.mediawiki.org/wiki/Wikimedia_APIs/Access_policy).

### Wiktionary

- Wikimedia's structured definition endpoint is experimental and limited to
  English Wiktionary; it cannot be the multilingual contract. Source:
  [Wikimedia REST API](https://www.mediawiki.org/wiki/Wikimedia_REST_API).
- The live seat therefore retrieves edition HTML through Core REST and performs
  conservative heading-bounded extraction. `en.wiktionary.org` `atom` exposed
  page/revision/licence metadata through the same Core REST shape as Wikipedia.
- The S04 diagnostic observed English `atom` page id 29589, revision 91397040
  (`2026-06-27T05:27:18Z`), with an `English` h2 whose nested h3 section was
  `Etymology`; other language h2 sections existed in the same document and
  must not leak into that result. French `atome` was page id 50574, revision
  39727749 (`2026-08-01T18:02:30Z`), with `Français` → `Étymologie`. The first
  parser pins only these English/French heading pairs. Adding an edition needs
  a fresh dated fixture and explicit section rule; language-tag validation
  alone is not parser support.
- Etymology prose can cite reconstructed, disputed, or merely proposed forms.
  Atomik only assigns `attested`, `reconstructed`, or `disputed` when explicit
  source markers support it; parser uncertainty defaults to `unknown` and is
  shown. Sources:
  [Wiktionary references](https://en.wiktionary.org/wiki/Wiktionary:References),
  [Wiktionary etymology help](https://en.wiktionary.org/wiki/Help:Etymology).

## Model-tool capability target

Every current adapter is intentionally `unsupported` at S01 because each one
currently returns a final response bundle only. S06 may opt adapters in after
recorded payload tests:

| Adapter | Native dialect target | S01 state | Primary contract checked |
| --- | --- | --- | --- |
| Mistral | OpenAI-style chat `tools` / assistant `tool_calls` / `tool` result | final-only | [Mistral function calling](https://docs.mistral.ai/studio/conversations/function-calling) |
| OpenRouter | OpenAI-style user-defined tools; selected model must advertise `tools` | final-only | [OpenRouter tool calling](https://openrouter.ai/docs/guides/features/tool-calling) |
| OpenAI | Chat Completions function tools and tool-call ids | final-only | [OpenAI Chat API reference](https://platform.openai.com/docs/api-reference/chat) |
| Anthropic | Messages `tool_use` blocks and user `tool_result` blocks | final-only | [Claude tool-use contract](https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works) |
| Google | existing OpenAI-compatible Chat Completions route with function calling | final-only | [Gemini OpenAI compatibility](https://ai.google.dev/gemini-api/docs/openai) |
| DeepSeek | OpenAI-style candidate, pending a reachable official fixture check | final-only | no opt-in on inference alone |
| mock | none; deterministic final bundle | final-only | local contract |

Atomik uses only user-defined/client-executed tools. Provider server-side web
search is outside CP-MVP-011 even where a provider offers it. Parallel calls are
disabled first; the main loop accounts sequentially against four calls, three
depths, 25 seconds of tool wall time, 48k total tool-result characters, and the
Wikimedia request budgets.

## Fixture corpus

CI never reaches a live API. The required fixture ids are code data in
`WIKIMEDIA_FIXTURE_CASES` and are materialized by S02–S04:

- English and French Wikipedia result/revision/licence cases;
- ambiguous Atom and multilingual Marie Curie Wikidata cases;
- P18 with complete attribution and media withheld for missing attribution;
- English/French Wiktionary etymology plus parser-unknown status;
- empty, 429, malformed, oversize, timeout/cancel transport outcomes;
- provider tool-call, invalid arguments, unsupported adapter, depth/call budget,
  cancellation, citation and Save-as-source round trips in later steps.

Refresh procedure: make a low-rate opt-in diagnostic with the product user
agent, review licence and schema drift, redact volatile/unneeded fields, save a
minimal JSON fixture, and keep the expected normalized result beside it. Never
record API keys, prompts, owner queries, or full pages.


## `maxlag` on reads — measured 2026-08-17 (S06c)

The Action API's `maxlag` includes the **query service's** replication lag, not
just the database's. Measured directly, same query, same minute:

```text
maxlag=5   HTTP 200, body: error.code "maxlag" — "Waiting for wdqs1014:
           16.63 seconds lagged" (this client maps that body to rate-limit)
no maxlag  HTTP 200, Q7186 returned immediately
```

Because wdqs commonly runs well past a 5-second threshold, `maxlag=5` made the
Wikidata rung fail on EVERY attempt during the live bench — the seat looked
rate-limited when the service was in fact answering fine. `maxlag` is guidance
for bots and bulk writes; Atomik issues a handful of human-initiated reads per
question, so the reads no longer send it. The politeness that actually applies
is unchanged: an identifying User-Agent, hard request/byte budgets, low
concurrency, and honouring a real 429 with its `Retry-After`.

Note the failure mode this hides: MediaWiki returns **HTTP 200** with the error
in the body. Anything that keys on status alone reads it as success.
