---
{
  "id": "04-file-first-model-draft-superseded",
  "title": "Superseded draft: workspace-aware OKF model",
  "status": "superseded",
  "tags": ["files", "vault", "workspace", "okf", "superseded"],
  "relations": [
    { "to": "04-file-first-model", "kind": "superseded-by" },
    { "to": "26-okf-agent-context", "kind": "expanded-by" },
    { "to": "27-git-compatibility", "kind": "expanded-by" }
  ],
  "agent": {
    "purpose": "Historical draft retained only to show the iteration that led to the main file-first OKF-compatible workspace model.",
    "inputs": [],
    "outputs": [],
    "invariants": [
      "Do not treat this draft as canonical.",
      "Use 04-file-first-model as the current durable source of record."
    ]
  }
}
---

# Superseded draft: workspace-aware OKF model

This draft has been folded into the canonical bedrock document:

- [04 - File-first, OKF-compatible workspace model](../04_04-file-first-model.md)

The final version includes the corrections from the later discussion:

```text
source dossiers are Markdown-first
raw source assets are preserved beside Markdown
machine sidecars are optional support files
agent context is navigable through project/folder/source/note scopes
Git compatibility is a core file-writing constraint
```

Do not implement from this draft. Use the main `04_04-file-first-model.md` plus:

- `26_26-okf-agent-context.md`
- `27_27-git-compatibility.md`
