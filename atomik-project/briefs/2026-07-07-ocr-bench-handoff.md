---
type: Atomik Brief
title: Handoff — OCR seat bench in flight (CP-MVP-004 annexe)
timestamp: 2026-07-07T20:00:00Z
---

# Reprendre ici (session pleine — synthèse de handoff)

## État global
- **CP-MVP-002 (M3): CLOS.** CP-MVP-004: S01–S08 exécutés, **clôture owner en attente**; whisper.cpp-small SIÈGE la transcription (validé "perfect" sur mémo réel), segments.json OK. Registre/ledger à jour.
- Record daté maître: `sessions/2026-07-07-speech-candidates.md` (37+ runs). Acceptance: `sessions/2026-07-07-cp-mvp-004-acceptance.md`.
- **Incident preuve RÉSOLU**: original.jpg Pascal restauré hash-identique (Windows Photos/ReplaceFile via "Ouvrir en externe"); fix shipped: open-externally donne une COPIE temp (e2f3f4a).

## Bench OCR — tableau au moment du handoff (page Pascal réelle)
| candidat | verdict | cpu | licence |
|---|---|---|---|
| Qwen2.5-VL 3B | ★★★ quasi-parfait | 192s | ⚠ Research |
| Qwen2.5-VL 7B (GPU dispo) | à courir | — | Apache |
| Gemma 3 4B | ★★☆ erreurs de sens | 127s | Gemma |
| SmolVLM2 | ✗ hallucine | 23s | Apache |
| RapidOCR | ★★ honnête/pertes | 3.6s | Apache (python!) |
| Tesseract | ✗ photos réelles | 2.6s | Apache |
| whisper CUDA | mémo 8.3s (ok) | — | MIT |

## EN PANNE — à débugger en premier
1. **Qwen3-VL 2B/4B** (bartowski GGUF, téléchargés OK dans `.atomik/speech-bench/models/qwen3vl-*`): runs CPU/GPU sortent **stdout VIDE** (walls 25s/87s = inférence probable). Piste: relancer SANS filtre grep pour voir stderr complet; peut-être flag chat-template/`--jinja`, ou clone llama.cpp (du 2026-07-07) à mettre à jour + rebuild (build/ et build-cuda/ dans `.atomik/speech-bench/llama.cpp/`).
2. **baidu/Unlimited-OCR** (MIT, quants sahilchachra/Unlimited-OCR-GGUF, fichiers unlim-* téléchargés): **crash std::runtime_error** au chargement — arch probablement non supportée par notre build; réessayer après update llama.cpp, sinon noter l'incompatibilité datée.
3. Puis compléter le tier GPU (RTX 5070 OK, `build-cuda/bin/llama-mtmd-cli`): qwen25vl-7b, qwen3vl-4b, unlim.

## Décisions en attente (owner)
- Clôture CP-MVP-004; siège OCR (candidats licence-propre: Qwen3-VL 4B Apache si le bug tombe, Unlimited-OCR MIT si compatible, RapidOCR python sinon; option hybride rapide+qualité).
- Image redressée du bench: `$SCRATCHPAD/pascal-upright.jpg` était session-locale — la RÉGÉNÉRER depuis sources/captures/Pascal/original.jpg (rotate -90, PIL dans `.atomik/speech-bench/venv`).

Prompt de reprise suggéré: « resume — reprends le brief 2026-07-07-ocr-bench-handoff ».
