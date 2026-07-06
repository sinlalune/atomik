# Diagram docs — derived views over the bedrock

Initialized 2026-07-05 at corpus v0.6. This folder is the visual projection of the bedrock: each figure draws one mechanism from one or a few named documents.

## Rules

- A diagram is a **derived view**: the projected documents are authoritative; the figure never introduces structure the corpus does not contain.
- Diagrams are committed (readability beats regenerability here), but each carries provenance and a refresh trigger below.
- **Same-work-unit rule** (docs 15/17): when a change to a projected section fires a refresh trigger, the diagram is updated in the same work unit as the doc — a stale committed figure is a documentation bug.
- One mechanism per figure. Simple beats complete: detail lives in the projected doc, not in the drawing.
- Figures are self-contained SVG (fixed light palette, white background) so they render in Git hosting, the future Dev Docs tab, and exports without host CSS.

## Register

| id | file | title | projects docs | refresh when | status |
|---|---|---|---|---|---|
| D01 | `D01_four_authorities.svg` | The four authorities | 00, 28 | constitutional distinction changes | current @ v0.6 |
| D02 | `D02_learning_loop_mvp.svg` | The learning loop (MVP) | 02 | short-loop steps change | current @ v0.6 |
| D03 | `D03_source_material_ladder.svg` | Source material ladder | 04, 07 | ladder stages change | current @ v0.6 |
| D04 | `D04_ai_patch_pipeline.svg` | AI operation and patch pipeline | 06 | pipeline or bundle contract changes | current @ v0.6 |
| D05 | `D05_truth_label_mechanics.svg` | Mechanical truth labeling | 06, 28 | labeling rule or label set changes | current @ v0.6 |
| D06 | `D06_retrieval_execution_ladder.svg` | Retrieval and execution ladder | 00, 33 | ladder rungs change | current @ v0.6 |
| D07 | `D07_three_planes.svg` | The three planes | 35 | plane definitions change | current @ v0.6 |
| D08 | `D08_bootstrap_protocol.svg` | Coding agent bootstrap protocol | 22 | protocol steps change | current @ v0.6 |
| D09 | `D09_dual_plane_repository.svg` | Dual-plane repository | 35, ADR-009 | repository layout changes | current @ v0.6 |
| D10 | `D10_roadmap_m0_m13.svg` | Roadmap M0–M13 | 18 | milestones or center of gravity change | current @ v0.6 |
| D11 | `D11_note_lifecycle.svg` | Note lifecycle | 11 | lifecycle states change | current @ v0.6 |
| D12 | `D12_reuse_loop.svg` | The reuse loop | 02, 20 | proposal mechanism changes | current @ v0.6 |
