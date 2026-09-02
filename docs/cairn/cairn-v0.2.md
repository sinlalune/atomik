Fair — that was over-built. Here it is as one thing.

Brief — Cairn v0.2 revision

Goal. Revise the v0.1 spec so every item below is either resolved in normative text or listed under Deliberate non-goals with a reason. Spec text only — no checker implementation. Every new requirement gets a conformance-matrix row with an honest "reference tools" column.

Hard constraints. Net concept count must not exceed 66 (v0.1 has ~25 real ideas plus a Git glossary; any new term requires merging or deleting one). No claim strengthened without naming the mechanism that establishes it.

P0 — these break stated promises
Checkpoint retention. Rebase-before-close force-pushes the path branch, orphaning every checkpoint the ledger names. The ledger then points at commits that no longer exist, which breaks resumability directly. Require retention under refs/cairn/checkpoints/<id>/<n> before any force-push, or forbid force-push on path branches.
Provisional commits. The rule that pre-acceptance work stays uncommitted and unpushed during inspection contradicts the spec's own thesis — the state most likely to be lost (agent working tree, mid-session) is the one state forbidden from being pushed. Define a pushed provisional commit, marked as such, excluded from candidate identity.
Handoff brief section. The brief is the bootstrap contract and is currently unspecified — mentioned six times, never given fields. Specify: frontmatter (checkpoint, checkpoint_pushed, base_commit, trunk_seen, writes, governs as path@oid, verify as exact commands, budget_tokens), seven capped body sections, ~1200-token budget, and an answerable-alone contract: a reader with only AGENTS.md + brief must be able to state the outcome, the resume commit, the single next action, what it may write, what it must read and at which commit, what's blocking, what was already tried and rejected, and the exact verification commands. If the ledger is needed to answer any of those, the brief failed. Brief is mutable and rewritten per work unit; the ledger is the append-only history. Add a cold-resume benchmark as the pilot's primary metric.
P1 — make records mean what they claim
Field-level closure surface. A may touch the path record, and the definition of done lives inside it — closure can legally rewrite what acceptance was against. Restrict A to status, subject_commit, ledger append, brief pointer.
Scope digest. scope_ref is a mutable pointer, so scope is bound to nothing while implementation is bound to a commit. Record a digest at opening, re-verify at closing.
Candidate base + drift predicate. Record base T in the closing record. Acceptance survives while the trunk delta since T touches nothing in the path's writes: or governs:; otherwise invalidate and re-close.
Structured dispositions. advisory_disposition becomes {rule, disposition, reason}[], verified against the advisories actually raised at C. As an unstructured string, "every advisory MUST be recorded" is unenforceable.
Per-role actor identity. Advisory when opening and closing share an actor. Solo/agent setups collapse all five roles, which makes acceptance a self-issued signature — make the degradation visible rather than invisible.
scope-drift blocking unless the declaration is updated in the same commit. That's already what the prose prescribes.
P2 — adoption and cost
Lightweight path becomes the default; full ceremony opt-in for control-plane and high-risk changes. v0.1 requires ~9 artifacts per bounded change. Without this, v0.2 is strictly harder to adopt than v0.1.
Typed work units, so same-work-unit matches the normative "where relevant" instead of demanding any module note plus any path edit. As written it trains agents to produce meaningless doc deltas.
Repair procedures for mid-path protocol violations. Real deployments live here.
Redaction ceremony for secrets/PII in immutable records.
P3 — editorial
Hash-algorithm agnostic — "full object id", not forty hex characters. The "universal" edition is currently SHA-1-specific.
Reconcile diagram and transition table both ways: diagram implies blocked → ready; table omits ready → blocked, which happens whenever acceptance stalls. Resolve archived → archived.
Split the Git glossary from Cairn-specific concepts.
Origin gap — foundation paths

v0.1 begins at accepted intent and has no story for its own first hour, though ideation is where agent context loss hurts most (no compiler catches doc drift). Define a foundation path: write surface docs/** plus draft path records, work units are documents, verification is links + schema + coherence audit — all three already exist as corpus rules, so no new gate needed. Deliverable is bedrock text plus an MVP roadmap of draft path records awaiting opening acceptance (draft → running already exists). Governing docs pinned as path@oid, which is also what makes the scope digests in item 5 cheap. Add an adoption path variant for brownfield repos: back-document existing modules into an initial docs/modules/ so an existing repo has a legal entry point.

Do not do these
Do not fix trunk drift with remote_trunk == T at integration. It's the obvious answer and it's first-come-first-served: every landing invalidates every other path's closure, and if audit+acceptance takes longer than trunk velocity, nothing ever closes. Use the drift predicate.
Do not ship P1 alone. Every item is a tightening; none make the protocol cheaper. P2-10 is the counterweight, not polish.
Do not implement checker rules in this pass.
Do not add concepts to solve item 16.

Done when all nineteen items are resolved or listed as non-goals with reasons, the conformance matrix covers every added requirement, and concept count hasn't grown.
