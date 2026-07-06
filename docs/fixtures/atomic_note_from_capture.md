---
type: Atomik Note
title: Query, key, and value vectors define attention lookup
description: Attention compares a query vector with key vectors to decide how strongly to combine value vectors.
tags: [ai, attention]
timestamp: 2026-06-17T00:00:00Z
atomik:
  status: seed
sources:
  - source: sources/captures/2026-06-14-handwritten-attention/source.md
    anchor: original-image
---

# Query, key, and value vectors define attention lookup

## Core idea

Attention compares a query vector with key vectors to decide how strongly to combine value vectors.

## Math

$$
Attention(Q,K,V)=softmax(QK^T/\sqrt{d_k})V
$$

## Code sketch

```python
scores = q @ k.T / math.sqrt(d_k)
weights = softmax(scores)
output = weights @ v
```

## Questions

- Why divide by sqrt(d_k)?
- How does multi-head attention change this?
