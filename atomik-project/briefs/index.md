# Briefs

Generated handoff snapshots produced from coding-path state (bedrock 35). Disposable and regenerable; never the primary memory.

Each running path owns one rolling `<path-id>-handoff.md` view, refreshed from
its Work Ledger in every completed step's commit. That commit is pushed before
the agent offers a fresh-session boundary. A new session in the same worktree
derives the path from its branch, reads the path file and this view, verifies
Git reality, and starts the recorded next action without an owner recap.

If a brief disagrees with the path or Git, regenerate the brief. Never repair
canonical state from a generated summary.
