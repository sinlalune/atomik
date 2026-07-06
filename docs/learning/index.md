# Learning layer — own what the agents build

This folder is the beginner-first layer of the documentation. Module notes
(`../modules/`) record contracts and decisions for someone who already knows
the stack; learning notes teach the stack itself, as it is actually used in
this repository, so the owner can take over any brick an agent built.

Every learning note must:

```text
start from zero on the technologies it covers
anchor every explanation to real files in this repository
name the architecture concepts it mobilizes (trust boundary, contract, ...)
explain the methodology used to build the code, not only the result
end with hands-on exercises that prove ownership
```

Learning notes are created just-in-time: when a coding-path step first
mobilizes a technology or pattern, the same work unit adds or extends the
matching note (17). They explain shapes and concepts, so they need updating
when the shape changes, not on every diff.

## Notes

- [01 — The Electron shell, from zero](./01-electron-shell-from-zero.md) —
  processes, security switches, IPC, the Dev Docs slice, the toolchain, and
  how agents work here. Covers CP-MVP-001 S02–S03.
- [02 — React state, the pane tree, and disposable persistence](./02-react-state-panes-and-disposable-persistence.md) —
  stores, pure functions and immutability, recursive layouts, atomic writes,
  debounce. Covers CP-MVP-001 S04.
