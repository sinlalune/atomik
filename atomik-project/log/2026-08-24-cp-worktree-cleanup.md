---
type: Atomik Journal Entry
title: CP-WORKTREE-CLEANUP — a merged path retires its checkout, not its history
timestamp: 2026-08-24T00:00:00Z
atomik:
  path: CP-WORKTREE-CLEANUP
  step: S02
---

# CP-WORKTREE-CLEANUP — a merged path retires its checkout, not its history

CP-OPS-001 established per-step remote checkpoints and then closed from a
temporary worktree. Its cleanup was operationally correct but not yet part of
the protocol. The owner caught the missing lifecycle step immediately: remove
the worktree folder after merge.

## What landed

The self-merge sequence now has a final local transition. After the merge
commit is pushed and verified on the remote trunk, another checkout resolves
the exact path worktree, proves it is Git-clean, removes it with non-forced
`git worktree remove`, and proves the registration and directory are absent.

The rule is aligned across:

- the AGENTS bootloader and `paths.md` operating detail;
- bedrock 22's closing procedure, bedrock 24's template, and bedrock 35's Git
  lifecycle;
- ADR-012 decision 9 and its explicit enforcement limit;
- the concurrent-work learning note and layered Cairn guide;
- D08's bootstrap/session view and generated D14's full role lifecycle.

## Safety boundary

Non-forced removal is deliberate. It fails closed rather than hiding local
changes. The exact target must be a secondary worktree registered for the path
that just merged; the main/owner and dirty worktrees are excluded. If any proof
or removal fails, the merge remains true and the report says cleanup
incomplete, leaving the folder intact for inspection.

Removing the folder does not remove the local or remote path branch. The
branch remains the online per-step history required by the immediately-push
rule. Branch deletion would be a separate owner decision.

## Enforcement choice

No hook, daemon, scheduler, or Cairn blocking rule was added. Repository CI
cannot see a developer's post-merge worktree registration or directory, so
claiming enforcement would be false. The protocol records the required target
and ordering; live remote, cleanliness, and absence checks plus the closure
report prove the machine-local outcome.

## Closure and proof

The branch already contained `master == origin/master == 9040417`; its closing
rebase was a no-op at `382ba30`, so no published commit was rewritten. The
owner accepted direct closure and the coherence audit found no decision drift,
duplicate product work, or unrecorded architecture. Cairn's two self-tests and
protocol check passed; D14's 15-box/2-label geometry, D08/D14 XML, and diff
check passed; typecheck passed; all 78 test files passed with 1,101 tests
passing and 1 skipped; and the production build passed. The merge and cleanup
hashes are named in the closure report; this entry does not pretend a pre-merge
commit can record a filesystem operation that happens only after it lands.

No roadmap order changed. CP-MVP-011 and CP-MVP-012 continue independently of
this process correction.
