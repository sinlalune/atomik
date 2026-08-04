# One surface, two layers — amendment pack (proposal)

Status: **APPLIED — historical record.** Every item landed: A–C in atomik-dsl (commit b3c53ee, "owner amendment — one surface, two layers"), D–F in this repo (ADR-010 accepted 2026-07-15 + bedrock 19 §One surface, two layers + bedrock 21). Kept as the drafting artifact; nothing awaits review. (Header corrected 2026-08-04 — the stale "nothing applied" line misled a session into flagging it for owner review.)
Date: 2026-07-15
Origin: design conversation 2026-07-15 (drawing ↔ DSL bidirectionality; owner challenge:
"the free form of the mind is maybe more important than the structure of abstraction").
Drafted against: atomik-dsl repo state of 2026-07-07 (v0.3.1, CP-DSL-001/002/003/005 closed,
CP-DSL-004 draft, no active path) and main-repo bedrock corpus v0.6.

## Where each piece lands

| # | Target | Repo | Kind |
|---|---|---|---|
| A | `atomik_dsl_spec_v0_3.md` §12 | atomik-dsl | reserve `pin` + round-trip paragraph |
| B | `atomik_render_core_spec_v0_1.md` §11 | atomik-dsl | reserve edit-ops, promotion mapper, projection-agnostic clause |
| C | `coding-paths/index.md` + `00_00-orientation.md` roadmap | atomik-dsl | three reserved milestone rows (D5–D7) |
| D | `docs/bedrock/19_19-dsl-future.md` | main (4tom1k) | "One surface, two layers (reserved)" section |
| E | `docs/bedrock/21_21-canvas-future.md` | main (4tom1k) | free-ink layer, promotion gradient, roughness invariant |
| F | `docs/adr/ADR-010-one-surface-two-layers.md` | main (4tom1k) | new ADR (house style), full draft |

Sequencing note: D and E are written against the *current* text of 19/21. CP-DSL-004's S06
separately updates 19 and the reserved JSON to v0.3.1 vocabulary; the two changes are
orthogonal (doctrine vs vocabulary) and rebase trivially in either order. This pack
deliberately does **not** touch `atomik_dsl_reserved_spec_v0_1.json` — that sync is owned
by CP-DSL-004 S06 and duplicating it here would collide diffs.

---

## 0. The decision being recorded

The scene editor and a freeform drawing layer share **one editing surface with two entity
kinds**. *Bound* entities are backed by the Scene IR; their canonical form is the DSL lines
of the fenced block; editing them means semantic operations plus projection pins, written
back as printer-emitted line patches. *Free ink* has no semantics; its canonical form is a
sidecar drawing file; it carries no claims and no Truth-Lens obligations. A **promotion
gradient** connects the layers (ink → statements, as a patch proposal) and a **detachment
path** runs the other way (scene → ink copy, lossy by design). The DSL's role is restated:
not the authoring interface, but the **serialization of the bound layer**, reached by three
convergent paths — typing, generation, drawing-then-promotion.

## 1. Scope ruling — CP-DSL-004 is unchanged

Nothing here widens D4. D4 renders authored blocks, grounds wikilinks, and patches one
line on projection flip; its Deliberately-excluded list already fences off generation and
canvas (main 20/21). Every item in this pack is a *reservation* (spec text, register rows,
bedrock doctrine) or a *future path* — no code, no scope transfer. D4 opens at S00 exactly
as drafted.

## 2. What the specs already promise (why this is small)

The round-trip is half-designed-in; the pack mostly **names and sequences existing
obligations**:

- Language §2 defines **canonical form** and a normalizing printer's statement order.
- Render-core §1 lists **`print`** among lang-core's owned verbs (spec'd, not yet shipped —
  CP-DSL-001 explicitly deferred it).
- **D6/P5** put line provenance on every IR entity, with the printer guaranteeing line
  stability for unedited statements → one gesture, one line in the diff.
- **L5** already defines loud degradation for unsatisfiable `place` constraints — pins slot
  into the same discipline.
- Pipeline §8 already makes single-line patches the repair unit.

The genuinely new reservations are: `pin` (projection-plane placement hints), the semantic
edit-operation contract, the sketch-promotion mapper, and the free-ink layer doctrine.

---

## AMENDMENT A — language spec §12 (atomik-dsl)

**Anchor:** §12 "Deferred / reserved", after the existing reserved-keyword paragraph
("Each is reserved as a keyword so future versions don't break v0.3 files…").

**A1.** In the reserved inventory sentence, append:

> · `pin` (projection-plane placement hints emitted by direct manipulation — see below)

**A2.** Append a new paragraph to §12:

> **Interactive round-trip editing (reserved).** A future editing surface manipulates a
> scene through its IR, not its pixels: an edit is a semantic operation (add / remove /
> retype / reorder / set attribute) serialized back to canonical source by the printer
> (§2), with `parse(print(ir)) ≡ ir` as the conformance property and D6 line provenance
> keeping unedited lines byte-stable — one gesture, one line in the diff. Direct spatial
> fine-tuning serializes as reserved **`pin`** lines: projection-plane *preferences* that
> constrain the archetype's layout without replacing it (render-core L1–L5 continue to
> hold; an unsatisfiable pin degrades loudly per L5). `pin` is to `place` what styling is
> to knowledge: `place` states spatial **facts** in the model plane ("the heart is above
> the diaphragm"); `pin` states rendering **preference** in the projection plane and
> carries no epistemic weight — moving a node never changes what the scene claims. The
> generated profile excludes `pin` (the generator card §10 already forbids silent
> projection choices), so the pocket spec and its token budget are untouched. Argument
> forms (archetype-relative slots vs normalized coordinates) are decided by the
> implementing path; the language value "the author never writes coordinates" (§6, Place)
> weighs toward archetype-relative forms. A pin line must satisfy the degradation
> invariant — `pin mito right-of nucleus` reads sensibly in a plain editor.

---

## AMENDMENT B — render-core spec §11 (atomik-dsl)

**Anchor:** §11 "Deliberately deferred" — append three items to the list:

> · **Semantic edit operations (reserved)** — the editing counterpart of the repair loop:
> a bounded operation set over the IR (add/remove entity, retype relation, reorder step,
> set attribute, add/remove `pin`) whose **only write path is printer-emitted line
> patches**. The tool edits the file, never a parallel document. Contract sketch:
> op → IR delta → minimal line edit (D6); `parse ∘ print` identity is the merge gate.
>
> · **Sketch promotion (reserved)** — a pure mapper from a freeform drawing document
> (Excalidraw JSON) to model-plane statements: shape → `node`, bound arrow → `relation`,
> container/group → `group`, text → labels; emitted directly in canonical form.
> Fixture-tested in this repository, DOM-free. Archetype and claim *inference* stays a
> generation concern (language spec §8) and lives app-side, as a patch proposal.
>
> · **Projection-agnostic IR (clarification, binding on future work)** — the IR carries no
> canonical geometry (P2) and must stay that way: a future non-SVG renderer — including a
> 2.5D/isometric or 3D projection of the same model — is a new layout/paint target, not
> an IR change. Nothing outside the projection plane may ever encode coordinates into
> canonical form.

---

## AMENDMENT C — register + orientation roadmap (atomik-dsl)

**Anchor 1:** `coding-paths/index.md`, register table, after the T1 row:

> | D5 | canonical printer + semantic edit operations (round-trip: `parse(print(ir)) ≡ ir`; op → IR delta → line patch via D6) | — | reserved (opens just-in-time) |
> | D6 | `pin` — projection-plane placement hints from direct manipulation (surface change → v0.4; layout consumes pins as constraints under L5; excluded from the generated profile) | — | reserved; depends on D5 (pins are printed lines) |
> | D7 | sketch-promotion mapper — Excalidraw JSON → model-plane statements, pure and fixture-tested; UI + AI proposal stay main-repo | — | reserved; independent of D5/D6 (the mapper emits canonical text directly, as generators do) |

**Anchor 2:** `00_00-orientation.md`, roadmap block, after the D4 line:

> ```text
> D5  canonical printer + edit operations              (reserved)
> D6  pin — placement hints, v0.4 surface              (reserved, after D5)
> D7  sketch-promotion mapper (Excalidraw → atomik)    (reserved)
> ```

Register discipline respected: rows exist so no milestone is silently unassigned; **paths
are not drafted** — they open just-in-time (the CP-DSL-004 early-draft exception is not
repeated here).

---

## AMENDMENT D — main bedrock 19 (4tom1k)

**Anchor:** end of `19_19-dsl-future.md`, after "Truth-aware scene requirement".

> ## One surface, two layers (reserved)
>
> The scene renderer and the freeform drawing layer share one editing surface with two
> kinds of entities:
>
> ```text
> bound entity   backed by the Scene IR; canonical form = the DSL lines of the fenced
>                block; edits = semantic operations + projection pins, written back as
>                printer-emitted line patches (one gesture, one line in the diff)
> free ink       strokes, shapes, labels with no semantics; canonical form = a sidecar
>                drawing file; carries no claims and no Truth-Lens obligations
> ```
>
> A gradient connects them, not a wall:
>
> ```text
> draw freely
>   -> select shapes
>   -> promote to model-plane statements
>      (deterministic mapping; archetype/claim proposal through the patch pipeline)
>   -> bound scene
>
> bound scene
>   -> detach as ink copy (lossy by design, provenance noted)
>   -> riff freely
> ```
>
> Invariants:
>
> - The bound scene's modifiability is bounded — semantic operations and pins, never
>   pixel-canonical. Unlimited modifiability is provided by detachment, **as a copy**.
> - Promotion is a patch proposal, never a silent write.
> - The DSL is the **serialization of the bound layer**. Typing it, generating it, and
>   drawing-then-promoting are three entry paths converging on the same file form.
> - Visual roughness is an honest signal: hand-drawn ink renders rough because it carries
>   no claim; only bound entities expose epistemic status. This extends "polish ≠ truth":
>   roughness does not mean false — it means *unclaimed*.
>
> Drawing from scratch is itself a learning act (retrieval practice — doc 02: outputs more
> durable than inputs), so the free-ink block may ship as a workbench feature independent
> of, and possibly before, the DSL editing surface. Sequencing is a roadmap (18) decision.

---

## AMENDMENT E — main bedrock 21 (4tom1k)

**E1.** Add one line to the frontmatter `agent.invariants` array:

> "Free ink carries no epistemic status; a hand-drawn edge between bound nodes is
> annotation, not a relation claim."

**E2. Anchor:** end of file, after "Truth Lens on canvas":

> ## Free-ink layer (reserved)
>
> The canvas (and the page-level scene surface — doc 19, "One surface, two layers") hosts
> a freeform drawing layer:
>
> ```text
> canonical form   sidecar drawing file beside the page (Excalidraw document), or a
>                  fenced drawing block; referenced by path like any resource
> component        embeddable MIT drawing editor (Excalidraw) — license verified, see
>                  ADR-010's volatile-fact table; recheck before integration
> semantics        none — ink is annotation and thinking surface, never knowledge record
> diff discipline  pragmatic, not strict: ink carries no claims, so the comprehensible-
>                  diff rule binds knowledge changes, not strokes
> ```
>
> Ink may annotate *over* a rendered scene (circle a node while studying). Anchoring is an
> open design question for the implementing path: entity-id anchoring survives layout
> changes; absolute coordinates drift. Record the choice in the path, not here.
>
> Promotion and detachment follow doc 19's gradient. Promotion of canvas ink into scenes
> or notes flows through the AI patch pipeline as a proposal. A hand-drawn arrow between
> two bound nodes *looks* like a relation but is not one — the renderer must keep the two
> visually distinguishable (roughness vs rendered style), and the Truth Lens ignores ink.

---

## AMENDMENT F — ADR-010 draft (4tom1k, `docs/adr/ADR-010-one-surface-two-layers.md`)

> # ADR-010: One surface, two layers — bound scenes and free ink
>
> Status: proposed
> Date: 2026-07-15
>
> ## Context
>
> The atomik DSL's generation path is real (CP-DSL-003 measured it; CP-DSL-005 demos it
> end-to-end), but iterating by regeneration is a lottery: high cross-run structural
> variance is a confirmed finding of the generability eval. Direct manipulation of the
> rendered scene is the missing loop. Independently, drawing a representation from scratch
> is a first-class learning act (retrieval practice) the workbench does not serve at all.
> The owner challenged whether the DSL should remain canonical ("the free form of the mind
> is maybe more important than the structure of abstraction"). Meanwhile, bedrock 21
> forbids the canvas becoming a hidden database, and the DSL uniquely carries what no
> drawing can: behavior (gated predict-then-see steps — C4 —, reactive rules), epistemics
> (claim/status/misconception, refutation grammar), line-diffability, and cheap-model
> tractability (GBNF-constrained generation and single-line repair). None of these are
> visual properties.
>
> ## Decision
>
> 1. One editing surface, two entity kinds: **bound** (Scene-IR-backed; canonical form =
>    DSL lines in the fenced block) and **free ink** (canonical form = sidecar drawing
>    file; no semantics, no claims).
> 2. The DSL's role is restated: the **serialization of the bound layer**, reached by
>    typing, generation, or drawing-then-promotion — three convergent entry paths.
> 3. Bound edits are semantic operations plus projection `pin` hints, written back
>    exclusively as printer-emitted line patches (`parse(print(ir)) ≡ ir`; D6 provenance;
>    one gesture = one line in the diff). Pixel positions never become canonical.
> 4. Promotion (ink → model-plane statements) is a deterministic mapping plus AI proposal
>    through the patch pipeline; detachment (scene → ink) is a lossy copy with provenance.
> 5. Free ink carries no epistemic status; visual roughness is the honest marker of
>    unclaimed content (extends invariant "polish ≠ truth").
> 6. The drawing layer embeds Excalidraw (MIT). tldraw is ruled out on license grounds.
>    The Scene IR stays projection-agnostic so 2.5D/3D renderers remain possible as new
>    layout targets without language change.
>
> ## Consequences
>
> - atomik-dsl gains reserved milestones D5 (printer + edit operations), D6 (`pin`,
>   a v0.4 surface change), D7 (sketch-promotion mapper); the workbench gains a sketch
>   block shippable independently of — possibly before — M12/M13.
> - Bedrock 19/21 gain the reserved doctrine sections; layout contracts later consume
>   pins under the existing L5 loud-degradation rule.
> - A page region may have two canonical stores (DSL block + drawing sidecar); cache
>   deletion still loses nothing.
> - Volatile license facts (recheck before integration):
>
>   | Fact | Source | Checked |
>   |---|---|---|
>   | tldraw SDK: production requires a license key; source-available, not open source; hobby license discretionary + watermark; license includes environment-detection and usage-data clauses | tldraw.dev/legal/tldraw-license · tldraw.dev/community/license | 2026-07-15 |
>   | `@excalidraw/excalidraw`: MIT, embeddable React component | github.com/excalidraw/excalidraw · npm | 2026-07-15 |
>   | `@xyflow/react` (React Flow): MIT, no paywalled features — candidate for canvas M13 node-graph needs, not for the scene surface | xyflow.com/open-source | 2026-07-15 |
>
> ## Alternatives considered
>
> ### Canvas document as the canonical scene form
>
> Rejected. It is the hidden database bedrock 21 forbids: canvas JSON diffs poorly, cannot
> be grammar-constrained for cheap generation or single-line repair, and has no
> serialization for behavior (gates, rules) or epistemic status. The north-star
> misconception scene cannot exist as strokes.
>
> ### DSL remains the sole authoring interface
>
> Rejected. Regeneration-as-iteration is the observed pain (eval-confirmed structural
> variance), and drawing-from-scratch as comprehension validation goes unserved.
>
> ### Adopt the tldraw SDK for the surface
>
> Rejected on license: production key requirement, source-available terms,
> environment-detection and usage-data clauses conflict with the open, local-first,
> file-first posture — the same class of exclusion as the Qwen2.5-VL research license.
>
> ### Sync the scene into a whiteboard's document model
>
> Rejected. Two documents for one scene doubles the state model; every feature pays the
> synchronization tax twice; drift between the whiteboard document and the IR becomes a
> permanent bug class.
>
> ### Unlimited direct modifiability of the bound scene
>
> Rejected. It deletes L1 determinism, replay, and the layout contracts. The same freedom
> is provided losslessly-for-the-user via detachment-as-copy.
>
> ## Migration / rollback
>
> Nothing ships now; every piece is a reservation. If the two-layer surface later proves
> too heavy, the sketch layer degrades to a plain embedded drawing block and the DSL keeps
> its render-only path (CP-DSL-004) — no file-format changes to roll back.
>
> ## Links
>
> - `19_19-dsl-future.md`, `21_21-canvas-future.md` (amended sections)
> - ADR-009 (projection principle: interactive artifacts patch files)
> - atomik-dsl: language spec §2 (canonical form), §12 (reservations); render-core §1
>   (print obligation), D6 (provenance), L5 (loud degradation), §11 (reservations)

---

## Owner decisions required

1. **`pin` vs extending `place`.** Recommendation: `pin`, projection plane. `place` is
   model-plane spatial *knowledge* and its §6 semantics say "author never writes
   coordinates"; overloading it would leak rendering preference into the knowledge spine.
   `pin` as an epistemic no-op also matches 21's "moving a node never changes epistemic
   status" by construction. Cost: a 17th keyword — but §12 reservations and the
   unknown-keyword rule (§2) make this the designed-for path.
2. **Sketch-block sequencing** — before D4, after D4, or bundled at M13. The pack touches
   nothing in roadmap 18; this is your call. (Doc 01's acceptance questions favor early:
   it improves the daily loop and prepares scenes without forcing them.)
3. **ADR-010 timing** — land now (status: proposed → accepted) or after D4. Recommendation:
   now. It records the resolution of a foundational challenge; D4-S06's vocabulary sync is
   orthogonal.
4. **Deferred to the D6 path** (recorded, not decided): pin argument forms
   (archetype-relative slots vs normalized coordinates) and ink-annotation anchoring
   (entity id vs absolute).

## Deliberately unchanged

Pocket spec (token budget intact — `pin` excluded from the generated profile) · golden
fixture · kernels · guide (author-facing pin guidance belongs to the D6 path) ·
CP-DSL-004 (scope frozen as drafted) · roadmap 18 (owner's) ·
`atomik_dsl_reserved_spec_v0_1.json` (D4-S06 owns its sync).
