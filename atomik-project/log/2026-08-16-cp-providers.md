---
type: Atomik Journal Entry
title: CP-PROVIDERS — multi-provider AI generation & gateway
timestamp: 2026-08-16T00:00:00Z
atomik:
  path: CP-PROVIDERS
  step: S09
---

# CP-PROVIDERS — architecture d'inférence multi-fournisseurs et passerelle OpenRouter

Extension de la frontière d'inférence d'Atomik au-delà de Mistral vers une architecture neutre et multi-fournisseurs.

1. **Cœur `GenerationAdapter` neutre (`shared/generation-params.ts`, `electron-main/generation.ts`)** :
   - Extension du type `AiEngine` (`mock`, `mistral`, `openrouter`, `openai`, `anthropic`, `deepseek`, `google`).
   - `PROVIDER_CATALOG` regroupant les modèles, descriptions, contextes et grille tarifaire datée (`model-research@2026-08-16`).
   - Maintien strict de la taxonomie des erreurs en 8 catégories typées (`offline`, `timeout`, `auth`, `rate-limit`, `provider-request`, `provider-server`, `cancelled`, `budget-exceeded`) sans repli silencieux vers le mock.

2. **Passerelle OpenRouter (`electron-main/openrouter-generation-adapter.ts`)** :
   - Intégration de l'API chat completions d'OpenRouter avec garanties strictes de confidentialité et de reproductibilité : `zdr: true` (Zero Data Retention), `allow_fallbacks: false`, `require_parameters: true`, `data_collection: 'deny'`, désactivation des transformations avec compression avec perte, capture des métadonnées du routeur.

3. **Adaptateurs directs 1st-party (`electron-main/*-generation-adapter.ts`)** :
   - OpenAI (GPT-4o, o3-mini).
   - Anthropic (Messages API avec paramètre top-level `system` et alternance stricte des tours).
   - DeepSeek (DeepSeek-V3, DeepSeek-R1).
   - Google Gemini (point d'entrée OpenAI-compatible avec Bearer & `x-goog-api-key`).
   - Tous implémentés en pur `fetch` sans dépendance lourde de SDK tiers (bedrock 15).

4. **Stockage sécurisé des clés 0600 et IPC étanche (`electron-main/ai-settings.ts`)** :
   - Fichier `ai-settings.json` stocké exclusivement côté processus principal avec permissions Unix `0600`.
   - Masquage des clés (`sk-••••1234`, `AIza••••5678`) transmis au renderer ; les secrets bruts ne franchissent jamais la frontière IPC (bedrock 13).
   - Canaux typés `setProviderApiKey` et `setSelectedModel`.

5. **Panneau de configuration des fournisseurs (`renderer/src/settings/SettingsModal.tsx`)** :
   - Dialogue complet de gestion des clés, choix du moteur actif et sélection des modèles par défaut par fournisseur accessible depuis le menu principal `AppMenu`.

6. **Télémétrie et traces d'action (`electron-main/action-trace.ts`)** :
   - Traces d'action enregistrant les tokens rapportés par les fournisseurs et le calcul du coût externe estimé en USD, avec `contentRecorded: false` vérifié par test.

7. **Documentation et apprentissage** :
   - Fiche d'apprentissage `docs/learning/23-multi-provider-ai-generation-and-gateway.md`.
   - Notes de modules mises à jour (`atomik-desktop-ai.md`, `atomik-desktop-shell.md`, `atomik-desktop-editor.md`).

788 tests unitaires bare, build et vérifications de protocole Cairn au vert.
