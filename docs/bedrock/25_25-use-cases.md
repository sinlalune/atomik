---
{
  "id": "25-use-cases",
  "title": "Personal use-case pressure tests",
  "status": "living",
  "tags": [
    "use-cases",
    "learning",
    "pressure-tests",
    "project-bundle",
    "truth",
    "dictionary",
    "ethics",
    "voice-capture",
    "autocomplete",
    "cost"
  ],
  "relations": [
    {
      "to": "08-capture-source",
      "kind": "pressures"
    },
    {
      "to": "10-pdf-source-tab",
      "kind": "pressures"
    },
    {
      "to": "26-okf-agent-context",
      "kind": "pressures"
    },
    {
      "to": "19-dsl-future",
      "kind": "eventually-tests"
    },
    {
      "to": "21-canvas-future",
      "kind": "eventually-tests"
    },
    {
      "to": "28-truth-evidence-model",
      "kind": "pressure-tests"
    },
    {
      "to": "30-public-knowledge-dictionary",
      "kind": "pressure-tests"
    },
    {
      "to": "31-truth-lens-ux",
      "kind": "pressure-tests"
    },
    {
      "to": "33-retrieval-local-execution-cost",
      "kind": "pressure-tests"
    }
  ],
  "agent": {
    "purpose": "Use real learning goals to pressure-test the architecture without turning the app into a domain-specific product.",
    "inputs": [
      "study goal",
      "source types",
      "desired output",
      "project context"
    ],
    "outputs": [
      "adapter priority",
      "AI operation idea",
      "context/navigation requirement",
      "future DSL/canvas test",
      "truth/verification pressure test",
      "execution/cost pressure test",
      "local capability pressure test"
    ],
    "invariants": [
      "Use cases justify features only when they generalize.",
      "The MVP should remain a universal workbench.",
      "Domain-specific visuals should be built from general primitives later.",
      "Every real subject should fit inside a project bundle.",
      "Use cases must pressure-test fact/interpretation/value separation and not only source ingestion."
    ]
  }
}
---

# Personal use-case pressure tests

## AI formation

```text
project bundle -> ai-formation
PDFs/arXiv -> source dossiers + PDF tabs
handwritten notes -> capture source dossiers
math concepts -> Markdown + LaTeX first, DSL later
code practice -> code blocks first, notebook cells later
architecture brainstorming -> index/log/context packs + Markdown/canvas later
model/API claims -> dated official-source verification and provider snapshots
```

## Art exploration

```text
project bundle -> art-exploration
artworks -> image/media source dossiers
artists -> atomic notes
history/style -> direct facts separated from interpretation and aesthetic judgment
relations/canvas -> later
```

## Electricity and electronics

```text
project bundle -> electronics
handwritten circuit sketches -> capture source dossiers
formulas -> math/code explanations first
interactive Ohm's law scene -> DSL later
```

## Marx Capital

```text
project bundle -> marx-capital
PDF pages -> PDF source adapter + source.md dossier
comments -> atomic notes
thesis graph -> typed relations later
visual thesis maps -> DSL/canvas later
historical background checks -> web/PDF source dossiers + disputed interpretation view
```

## Music theory

```text
project bundle -> music-theory
handwritten scales/chords -> capture source dossiers
listening notes -> media source later
tonal diagrams -> DSL later
terminology/etymology -> dictionary entries with language and source scope
```

## Atomik design itself

```text
project bundle -> atomik
bedrock docs -> Markdown concepts
chat insights -> patch docs/index/log/context
external specs -> source dossiers
coding agent handoff -> context pack
Git diffs -> project evolution trace
```

## Design reminder

These are not separate products. They are pressure tests for one universal learning workbench.

## Truth-specific pressure tests

### Philosophy and ethics

```text
primary text quotation
  separate from
historical interpretation
  separate from
ethical evaluation
  separate from
user synthesis
```

### History and politics

```text
event date + jurisdiction + primary/secondary sources
competing historiographies preserved
current public claims require freshness checks
value-laden framing remains attributed
```

### Smart dictionary

```text
lemma + senses + forms
Wiktionary baseline
Wikidata Lexeme structure
specialist dictionary escalation
reconstructed/disputed etymology visible
```

### Science and engineering

```text
deterministic calculation before model assertion
source population/method/date retained
code behavior checked by tests where possible
analogy limits visible
```

### Atomik itself

```text
provider prices and terms dated
architecture decisions durable
claims about current APIs linked to official docs
research uncertainty preserved instead of smoothed away
```


## Voice capture and low-cost production

```text
walk or commute
  -> record a short thought on phone
  -> transfer locally to desktop project
  -> transcribe locally when device capability is adequate
  -> correct transcript
  -> turn selected passage into note/decision/question
  -> inspect operation receipt
```

Pressure test:

```text
original audio survives
transcript and model cleanup remain distinct
French/English technical vocabulary is evaluated on real recordings
cloud fallback is explicit
cost is measured per corrected usable transcript minute
```

## Local editor assistance

```text
ordinary Markdown typing
  -> deterministic links/headings/tags/snippets
  -> optional short local completion after pause or explicit gesture
  -> broader edit prediction only on desktop when accepted-value metrics justify it
```

Pressure test:

```text
no vault-wide retrieval on every keystroke
prediction cancels immediately on user input
nearby context is preferred over large hidden prompts
latency, tokens, memory, and accepted characters are visible
```
