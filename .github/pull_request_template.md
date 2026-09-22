<!-- Cairn closing review. On pull-request transport this description IS the
coherence review of one exact candidate and the approval IS the closing
acceptance. `npm run cairn-audit` prints this whole shape filled in for the
current candidate, the items below read from the record; every `<blank>` is
yours. The checker proves the candidate, its closure surface, the opening
digest and the trunk drift from Git; it reads none of the text below, which is
what the approver reads.

The blanks are backticked because a bare `<unit>` matches an HTML open tag and
the forge strips it when it renders — leaving a blank that reads as answered. -->

## What this path did

- `<what the path did>`
- `<why it is the least>`
- `<what it does not do>`

Surface: `<the page a newcomer reads for the surface this path changed, or the README section>`

## Definition of done, item by item

- item 1 — `<the item, as cairn-audit leads it from the record>` — advanced by `<unit>` — shown by `<command or page>`

## Candidate

- path: `<CP-ID>`
- candidate `C`: `<full object id>`
- base `T`, the trunk tip merged into the candidate: `<full object id>`
- scope digest at `C`: `<the digest cairn-check --scope-digest printed for this record>`; equals the opening acceptance: yes | no

## Coherence

- [ ] Does the diff contradict an accepted decision?
- [ ] Does it duplicate something another running path is building?
- [ ] Did it introduce architecture that belongs in a decision record and has none?
- [ ] Is anything now documented in two places that will drift apart?

## Advisories at `C`

Every advisory `cairn-check` raised at the candidate, each fixed, accepted, or
deferred to a named owner and follow-up; or *none*.

## Roles

- reviewer: <who approves>, holding the roles <initiator | writer | reviewer | integrator> on this path
