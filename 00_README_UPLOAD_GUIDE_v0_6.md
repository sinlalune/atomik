# Atomik — v0.6 repo-ready bundle

Release 0.6.0 · 2026-07-05 · Theme: the execution-state plane and the reuse economy

**Unzip = repository.** This bundle ships directly in the ADR-009 dual-plane layout; no layout script is needed.

## Launch

```bash
mkdir atomik && cd atomik
unzip /path/to/atomik_bedrock_v0_6_execution_state_and_reuse.zip
git init && git add -A && git commit -m "v0.6 bedrock: dual-plane repository seed (ADR-009)"
claude
```

First message to the agent: *"Read AGENTS.md and execute the bootstrap protocol. CP-MVP-001 is the active path — reconcile S01 with this pre-seeded layout, record the base commit in the Work Ledger, then propose S02."*

`CLAUDE.md` bridges Claude Code to `AGENTS.md`; Codex and other AGENTS.md-standard tools read it natively.

## Layout

```text
AGENTS.md · CLAUDE.md · .gitignore
apps/ packages/ tests/           code plane (empty seeds)
docs/
  bedrock/                       pages 00–35 (+ superseded 04 draft)
  adr/  modules/  agents/  contracts/  fixtures/  diagrams/
  CHANGELOG_v0_4 / v0_5 / v0_6
  docs_source.json · index.html  generated Dev Docs artifacts (open index.html offline)
atomik-project/                  knowledge + execution plane (ACTIVE.md → CP-MVP-001)
```

## Claude project upload

Upload the individual `.md` files (`AGENTS.md`, `docs/**`, `atomik-project/**`). Skip `docs/index.html` and `docs/docs_source.json` — generated, large, redundant for retrieval.

## Diagram docs

`docs/diagrams/` holds twelve self-contained SVG figures plus their register. Nine bedrock pages embed them via `../diagrams/*.svg` links (resolve as-is in this layout); `body_html` inlines each SVG so `index.html` stays a single self-contained file. When a projected section changes, update its figure in the same work unit.

## What changed in v0.6

See `docs/CHANGELOG_v0_6_execution_state_and_reuse.md`.

## Payload integrity — 100 files (+ this guide) — 1945421 bytes

- `.gitignore` — 52 bytes — sha256 `3286682473552c8db66a43dc5a591b6b6b1e566fa8f07cec8551ca8796b17158`
- `AGENTS.md` — 1497 bytes — sha256 `43c3231642aeae1c9253d87599f37afc2e0dd38b1e94fa1b5358c8b0e8ebf2c1`
- `CLAUDE.md` — 38 bytes — sha256 `45b387dd97ce78d9d80cd5e8a24963730a45555db033442ed2020bf7f94fd2c1`
- `apps/.gitkeep` — 0 bytes — sha256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- `atomik-project/brainstorm/index.md` — 146 bytes — sha256 `d63e435559aafb1ed8a0ef6e8097f6d8efc19577cddf69ee1efa3116a3b37f4a`
- `atomik-project/briefs/index.md` — 138 bytes — sha256 `4d2f55d3886abd7582eeeb8ca95bc51dd7af512b5f1de4b691f13be4cbb64e17`
- `atomik-project/coding-paths/ACTIVE.md` — 423 bytes — sha256 `274841d648dfdee3894e264d27a7aa048a8c623653c2d0d0457b527b40d0fabd`
- `atomik-project/coding-paths/CP-MVP-001.md` — 7123 bytes — sha256 `d5aedbfa4080256a3ace922ec61295fa12072f247f78eed6507edb5528391518`
- `atomik-project/coding-paths/index.md` — 1855 bytes — sha256 `182f29ad71f1fb5a0d39f4b5d6b0f5832e3e60804116f5fc5e0617cd8cc05897`
- `atomik-project/index.md` — 1289 bytes — sha256 `a8ccb040a76bc0c9d416c8cb7708a14e04e6bbed3d73b4cad21fd0a13a45ca15`
- `atomik-project/log.md` — 298 bytes — sha256 `e44eca31abae362691bcb516c5e8ae6e873fd24c404c4efa323a5030fd0e691a`
- `atomik-project/sessions/.gitkeep` — 0 bytes — sha256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- `atomik-project/sources/.gitkeep` — 0 bytes — sha256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- `docs/CHANGELOG_v0_4_truth_evidence.md` — 7787 bytes — sha256 `45d9a8d165e4c479fbaa6c6f236a696e426ecdef2af2fdb727abbe9aa33ba95a`
- `docs/CHANGELOG_v0_5_retrieval_local_execution_cost.md` — 3167 bytes — sha256 `58f89c1ec24ee1cf4710550d49ba2ab066cecbd197cec67d760c8b637d533a05`
- `docs/CHANGELOG_v0_6_execution_state_and_reuse.md` — 7118 bytes — sha256 `8be5fb5d3d2421784a9c49f02e461efbba87b0ea96172b4a26a7660c7e3efa69`
- `docs/adr/ADR-001-file-first-okf-project-bundles.md` — 2168 bytes — sha256 `1f8e79a99979d4f203e354fe66e4d68b55a604f04bc6d8e6dba9744a0397b6be`
- `docs/adr/ADR-002-markdown-source-dossiers.md` — 1954 bytes — sha256 `818acbd1bf6280d489b51456645879a534e9413da255da1ba0bded179fed3e7d`
- `docs/adr/ADR-003-git-compatibility-contract.md` — 1685 bytes — sha256 `efc8c819c6803cf085d5fd06dda26b8dbe7a88c41aa0881c683a361dd75c1a7b`
- `docs/adr/ADR-004-claim-level-truth-evidence.md` — 3697 bytes — sha256 `685dbbfe7c81b974d96093db10aaeabad003f052c2390f7eda5399398a674a7a`
- `docs/adr/ADR-005-live-grounding-transient-verification.md` — 3761 bytes — sha256 `5db1dcdefe90a4afe10797a94b0b92f160abdce65dd25be40ea5d336d01e9cd5`
- `docs/adr/ADR-006-public-knowledge-lexicographic-baseline.md` — 3592 bytes — sha256 `26dbb4c14eba4924fc95bd77fd18f09593060b87cbbd6c6dc9320f03db7e4644`
- `docs/adr/ADR-007-hybrid-retrieval-optional-semantic-indexes.md` — 2640 bytes — sha256 `982fa5c9fffa658b9e6d23ffc73609cb1dafa7d8889c8a1dd31bacbb90f77b48`
- `docs/adr/ADR-008-operation-traces-execution-economics.md` — 2899 bytes — sha256 `64d245bbd1a16fa6561b1ac0a788c0e7f9c059801afcff49838d3ee204c40ae1`
- `docs/adr/ADR-009-coding-paths-work-ledger-dual-plane.md` — 4767 bytes — sha256 `9b9b8755aed4f3b1fefaaddcc603890ed8d51061e653b6954f989d39795e64e4`
- `docs/agents/agent_documentation_contract.md` — 3087 bytes — sha256 `0f0194deb179b2d65d6480cebae9534b04f4c938e441b7f8c1e014cee9d478d5`
- `docs/agents/first_prompt_for_coding_agent.md` — 7272 bytes — sha256 `06ee8cdc5a659e3905d87f9b71da1eb0bc11bfd77d591c898325e46dac8fe56f`
- `docs/bedrock/00_00-orientation.md` — 8252 bytes — sha256 `83f42fa66d45ed5d3f76e8ed7f60558adfec9ef76614a1244ec91050a1407f7b`
- `docs/bedrock/01_01-workbench-first.md` — 5819 bytes — sha256 `f689edd90bc4c1ed315a5f410bfa6b7d22db3a5c56fb8a546a24a7992c6ccb2e`
- `docs/bedrock/02_02-learning-loop.md` — 8061 bytes — sha256 `3b5530c226cb653feb27f363f025dc8d0200aedadef4fd2d5c6864aa965c05d6`
- `docs/bedrock/03_03-workspace-tabs.md` — 5898 bytes — sha256 `12a34318fde01fe02086d4dbddb5d22b64f836ec9f4849fd88d511fd367a5b26`
- `docs/bedrock/04_04-file-first-model.md` — 18660 bytes — sha256 `93882413d4ca784a8ba479ba2bcfe3eaaf057718b88f0412705048fc00003452`
- `docs/bedrock/05_05-resource-selection-model.md` — 7278 bytes — sha256 `7ca3446ba7139f68bfe3c909310b52c31ab635e8dea60441e02721f699ec9142`
- `docs/bedrock/06_06-ai-patch-pipeline.md` — 16166 bytes — sha256 `84642658a673ef5a427b47d859e95b9ac6ae4013be63683a91ab0da79942804a`
- `docs/bedrock/07_07-source-adapters.md` — 9778 bytes — sha256 `c605964d796dc75dbc15d617ea2d3779d67cf1deccd65f63f3fdcb872013ca38`
- `docs/bedrock/08_08-capture-source.md` — 6561 bytes — sha256 `effb3958951cb19aeb611019819284e20359364beca0f3a6e62f2d9aee2f0e45`
- `docs/bedrock/09_09-web-source-tab.md` — 5142 bytes — sha256 `9dfbd7f294e09735ee8e5cbb30c8383f69deb1db711dee333dd18c96806d04f1`
- `docs/bedrock/10_10-pdf-source-tab.md` — 3900 bytes — sha256 `810ee025d3e113f7555e02d313a8192f112b79b71d5936ac53b13c18bd449419`
- `docs/bedrock/11_11-markdown-page-model.md` — 7913 bytes — sha256 `95a25dd01f24a4559dbc06c9dd9514dacaddb51f0700bc2c7101f8edefdb44f7`
- `docs/bedrock/12_12-electron-mvp.md` — 5743 bytes — sha256 `de219b02f1615be301303ced6fda95719a655a3439e6f93da6748e49463c3cba`
- `docs/bedrock/13_13-electron-security.md` — 6244 bytes — sha256 `685869323fb416d49c0c747ef0663666a3faaedbf9dc8c229fb7706a57fd3ea3`
- `docs/bedrock/14_14-app-kernels.md` — 10724 bytes — sha256 `a18a7209dde58077b6aaea82abc44034da8e3d3ee2328ea06abba073618c9d85`
- `docs/bedrock/15_15-maintainability.md` — 5319 bytes — sha256 `15360fa69bf45c7a5cafe77886b9976e8279fed345e84da7f3efad7bb3dcc168`
- `docs/bedrock/16_16-dev-docs-tab.md` — 4576 bytes — sha256 `25fc4035953c986fc417422c6f7ce8b99c00528149c569201e4c8f17dd114c81`
- `docs/bedrock/17_17-self-evolving-docs.md` — 5412 bytes — sha256 `eb2418b8a86752d92c2c5397edfdd9764761b11f76bd75f0bdc40d5b68567789`
- `docs/bedrock/18_18-roadmap.md` — 15550 bytes — sha256 `26256d7e3010828c78a59c3269fc9ec528143c9da3e59210827a359ab90640d3`
- `docs/bedrock/19_19-dsl-future.md` — 3334 bytes — sha256 `715f51c5250c33240ac8caceb98812aca6580bc15abe76c7dfd430dc0a155e0f`
- `docs/bedrock/20_20-relations-future.md` — 7086 bytes — sha256 `7f0ca4db540215b1e2dd5b2e6f556d3bd88618f33d7ef49b88dd75e0e16cf70c`
- `docs/bedrock/21_21-canvas-future.md` — 3191 bytes — sha256 `9531569b03f169ce870bc2220bcd044ed753c6b933e8bcd47f5b5ee14a5550bf`
- `docs/bedrock/22_22-agent-handoff.md` — 5064 bytes — sha256 `0e2786662dec4b3e3290044e91b7ee5463ad22446cc6ebc17f0c967b7d66acba`
- `docs/bedrock/23_23-references.md` — 8867 bytes — sha256 `ae0723fd599114417f7ca0737d3d53af6ecbfd3d6a7a643a783ae245b43ce47a`
- `docs/bedrock/24_24-doc-templates.md` — 8475 bytes — sha256 `971bd30f66122f7f6e027d7782ef2e9d07951156ff489faf3adc9b93584b2e06`
- `docs/bedrock/25_25-use-cases.md` — 5843 bytes — sha256 `84c40ece932e31ae008ea0a8c1cb9a5f27f17be6f4a0d3dbfef765414a54275f`
- `docs/bedrock/26_26-okf-agent-context.md` — 11155 bytes — sha256 `fc0518bb6e530e7821408b97db5503a02d7ed40786d95ac0e69fd2c5b9fa516f`
- `docs/bedrock/27_27-git-compatibility.md` — 8385 bytes — sha256 `503af3c7484f8e2a98f5a903896bf6ea2f7112aa69ce7c53ffbd42d04dda9d57`
- `docs/bedrock/28_28-truth-evidence-model.md` — 17440 bytes — sha256 `d139a9d3f73788911d5775590350d88d36d442a3f257b627e94c5f31ae649bc0`
- `docs/bedrock/29_29-verification-grounding-router.md` — 19992 bytes — sha256 `8644ebdb25149158a3afa2b9fd84a206ad0ae2670448461288d82a7ca3fd1cef`
- `docs/bedrock/30_30-public-knowledge-dictionary.md` — 16835 bytes — sha256 `5be105ac7f3764e177b0ce72fd54c37a868d50b7d41d02207e6b20de31ddad3b`
- `docs/bedrock/31_31-truth-lens-ux.md` — 14434 bytes — sha256 `f0cd794e07f28a86c04ec7e2f0905f240d22a57f756529c12304f0a195e56f34`
- `docs/bedrock/32_32-truth-investigation-record.md` — 18379 bytes — sha256 `264f7a8225d47d942d5897765286ca4b3e5378a4d12ef9f886034ee39bd3db7c`
- `docs/bedrock/33_33-retrieval-local-execution-cost.md` — 13392 bytes — sha256 `575ac9f62a7d984487b2a6eafab7d7279a2c192f215ea5bafc99bfa3cf30f314`
- `docs/bedrock/34_34-local-execution-investigation-record.md` — 12253 bytes — sha256 `cac925bf0df06c7bdf5dbdc9e42a4d0404c505aab10cde0b95aea10ac157fed5`
- `docs/bedrock/35_35-coding-path-execution-state.md` — 9214 bytes — sha256 `efeda576a03072cbec9e093c4844dfa8ceba7340bb49f93586e026dad38a517c`
- `docs/bedrock/archive/04_04-file-first-model_workspace-aware_okf_draft.md` — 1420 bytes — sha256 `0ff02514d52e23ae45257783570f22a7750afa0c7a0e17d49957ac93aaf3a149`
- `docs/contracts/architecture_kernels_v0_2.json` — 13529 bytes — sha256 `f856c44a05f1f9e3a8aebf7202b7c4739bfa8be1374010f79c9ad00bf0fa2f16`
- `docs/contracts/atomik_dsl_reserved_spec_v0_1.json` — 2494 bytes — sha256 `f9f8f030c3764af6dcec605f121242f46c46f84e0f1af425c4c1ba668d1cf09d`
- `docs/contracts/electron_security_contract_v0_2.json` — 3549 bytes — sha256 `1fd0f01ec999a6e523b2bdfe8e012fa4c6dbf7db2dd3f51a2567b6dbc2fb8b34`
- `docs/contracts/mvp_roadmap_v0_2.json` — 9382 bytes — sha256 `5248daa4c61be32afd8cd47219391fb91e2b177fc78d12aca1e3be9b952447c6`
- `docs/contracts/operation_trace_contract_v0_1.json` — 6092 bytes — sha256 `22cb166019ffd6d75526e1b5e69281752a3df8d72173bf4ef129a82b611110af`
- `docs/contracts/public_knowledge_pack_contract_v0_1.json` — 4060 bytes — sha256 `8fd7e728e679bc5440e77c84f384b077e04af8d4a46bd16dd21e57dc2a521c2c`
- `docs/contracts/truth_evidence_contract_v0_1.json` — 8333 bytes — sha256 `f1d18a105098ffb4abab0fa4b9679e17b5bade571dfd9dcc587322aceedbbe24`
- `docs/contracts/verification_provider_policy_v0_1.json` — 6953 bytes — sha256 `d4331b11de58dadc775fe34afa32a5f645eddfe5ba9b52776deafaaf99a5ef55`
- `docs/diagrams/D01_four_authorities.svg` — 2236 bytes — sha256 `796cd518aa51f96afa91d2819703081a82cd8b9d5d0aae162ea91e35cdfb61ef`
- `docs/diagrams/D02_learning_loop_mvp.svg` — 3642 bytes — sha256 `4b41dd0aff7631121dfed47708e4e948bd19f57000170decb11061f1128b3520`
- `docs/diagrams/D03_source_material_ladder.svg` — 2538 bytes — sha256 `40f8fdb0c5bc318819f0d4cacbe35c1aa5eb8aa33b5c2ddf4263777dc81d5b6f`
- `docs/diagrams/D04_ai_patch_pipeline.svg` — 3075 bytes — sha256 `19ae5c696afa55b7b761ba95991ae468381b6c5a5ececbf237ea708e4eb1cb24`
- `docs/diagrams/D05_truth_label_mechanics.svg` — 2608 bytes — sha256 `2be3f5d1adb053543ffe8070080e95e7d5e9a23771d09408f480a51bf034b764`
- `docs/diagrams/D06_retrieval_execution_ladder.svg` — 3709 bytes — sha256 `05aac929f09e6557bcb9499b39993b9f1f7d7df7a03dcfc25181ca77076e27ea`
- `docs/diagrams/D07_three_planes.svg` — 2131 bytes — sha256 `a306f3e4b66b2d15285c967044acdc70dc1a00c90d2f9fa3500c0c5d56511450`
- `docs/diagrams/D08_bootstrap_protocol.svg` — 3644 bytes — sha256 `e1284a9ec94344088eecd18ea4bd2cabbc33584496da4ad054a4fde170693026`
- `docs/diagrams/D09_dual_plane_repository.svg` — 3131 bytes — sha256 `c8122216867654ae38069363913d407c6e76d048d5bb82e2df2ba45b48b4dc28`
- `docs/diagrams/D10_roadmap_m0_m13.svg` — 3924 bytes — sha256 `2aa4a667f3b62872d0e5016df661083bc36ac309819ad7cd7e6c68b028d0847b`
- `docs/diagrams/D11_note_lifecycle.svg` — 2548 bytes — sha256 `c0cefaec735cf381729365fc12464aa70dcfcb847520d2f58893e4103951fa27`
- `docs/diagrams/D12_reuse_loop.svg` — 2591 bytes — sha256 `d3de05989ddf626da86e6a43450497222bef0c0cac74dda0a90a8255c77f448f`
- `docs/diagrams/index.md` — 2477 bytes — sha256 `ed1b2a972e7a8eb5d3d199a54910cc8bcf7c97d08e92746de55ab123ada0544a`
- `docs/docs_source.json` — 724289 bytes — sha256 `698e67091fbb49b0e074a5e99e6f29ae52042fd874a5c1a3716d1b54a768fe3d`
- `docs/fixtures/action_trace_fixture.json` — 2403 bytes — sha256 `51959f890332545722eede73e283d67d4bd4a184eb012a5ca219d94710c78043`
- `docs/fixtures/atomic_note_from_capture.md` — 815 bytes — sha256 `1dd1baf4746819b8ffa9171fd1e1b7d4ba174086fc9a793a327de31d0ff4c5d0`
- `docs/fixtures/capture_source_dossier.md` — 779 bytes — sha256 `16c788864a72f48cf61c64b057abc6132463929888d93e680c4a7662fbedb11c`
- `docs/fixtures/capture_source_record.json` — 666 bytes — sha256 `7e9b27b0e9a4a2283cb700cba7fcd85c090637697a385c7af19079317dea01cd`
- `docs/fixtures/dictionary_entry_fixture.md` — 2547 bytes — sha256 `4e6b50c4228f8324e5e74168266299b4e68b4948071ed96c28d2236753e24145`
- `docs/fixtures/future_derivative_scene.atomik` — 487 bytes — sha256 `6a7efd0649ccf38c2084062f002004b172ed1808a77679f18f2897d7f9f8a254`
- `docs/fixtures/truth_claim_fixture.md` — 1703 bytes — sha256 `6959589f30f29442a188f50fb5a9cc9ba168cb02166949168b1384b9a70e9234`
- `docs/fixtures/verification_report_fixture.json` — 3027 bytes — sha256 `0b04a467ef13b5b5025a74cc2220ae26c0260d541cd70871cfaec50ed19efd57`
- `docs/index.html` — 704365 bytes — sha256 `4af758da97ab6a2bd6bf0e15fddc6111a74b22e1e0a0a7778b87a2e8fcc953bf`
- `docs/index.md` — 1101 bytes — sha256 `06cc8e31fe8aac8b4504358d9a228c326964cb604a74ccaebb0b382c540756ef`
- `docs/log.md` — 385 bytes — sha256 `0c95ffdaa86461331fbf97a5b1d69307170c3cf599298566324de2b14c101709`
- `docs/modules/.gitkeep` — 0 bytes — sha256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- `packages/.gitkeep` — 0 bytes — sha256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- `tests/.gitkeep` — 0 bytes — sha256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
