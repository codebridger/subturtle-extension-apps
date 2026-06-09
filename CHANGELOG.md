# [1.15.0](https://github.com/codebridger/subturtle-extension-apps/compare/v1.14.1...v1.15.0) (2026-06-09)


### Features

* Updated the package title and description ([fc73a6c](https://github.com/codebridger/subturtle-extension-apps/commit/fc73a6c545846055f86cad9b3cabeaf09e1d2f5d))

## [1.14.1](https://github.com/codebridger/subturtle-extension-apps/compare/v1.14.0...v1.14.1) (2026-06-08)


### Bug Fixes

* **console-crane:** align bundle selector height with the Save button ([cf057a0](https://github.com/codebridger/subturtle-extension-apps/commit/cf057a095e85ac7d55824cafe5f06eeb2568d06a)), closes [#86exw6kme](https://github.com/codebridger/subturtle-extension-apps/issues/86exw6kme)
* **console-crane:** isolate modal from host-page color/flex CSS leaks ([2b89736](https://github.com/codebridger/subturtle-extension-apps/commit/2b89736bcb6664f2ecb82ba902ef1bb5a83dcc61)), closes [#86exw6kme](https://github.com/codebridger/subturtle-extension-apps/issues/86exw6kme)
* self-heal stale auth token on translate instead of failing ([6ef3766](https://github.com/codebridger/subturtle-extension-apps/commit/6ef3766e482c0c97476b4d8aac59fe2f92f7376b))

# [1.14.0](https://github.com/codebridger/subturtle-extension-apps/compare/v1.13.0...v1.14.0) (2026-06-08)


### Bug Fixes

* **analytics:** import authentication from client lib so unit suites load ([902436f](https://github.com/codebridger/subturtle-extension-apps/commit/902436f1b15a93739527cdbd8eed6e3eca7aed70))


### Features

* **analytics:** align events with docs/metrics conventions, close tracking gaps ([6e3236e](https://github.com/codebridger/subturtle-extension-apps/commit/6e3236e70bae3cd55a3d060311c85a4b36238723))

# [1.13.0](https://github.com/codebridger/subturtle-extension-apps/compare/v1.12.0...v1.13.0) (2026-06-02)


### Bug Fixes

* **popup:** render Practice/Preview console pages in the popup router ([ff2935c](https://github.com/codebridger/subturtle-extension-apps/commit/ff2935cc6d888dbbf22963196544c81db7226bec))


### Features

* **auth:** add dev-gated password login + MCP-driven CCW agent workflow ([b4b6e46](https://github.com/codebridger/subturtle-extension-apps/commit/b4b6e4685d7c9f561ec169a3064388d4965014b9))

# [1.12.0](https://github.com/codebridger/subturtle-extension-apps/compare/v1.11.2...v1.12.0) (2026-05-26)


### Bug Fixes

* **save-modal:** break circular import to console-crane store ([ab00130](https://github.com/codebridger/subturtle-extension-apps/commit/ab00130647d72703147f8a96df6faa8e3b1fbbe5))
* **save-modal:** refetch bundle options so post-save chip shows title ([25499da](https://github.com/codebridger/subturtle-extension-apps/commit/25499da35925bebeb854f20973c3ae39b4dbd6f2))


### Features

* announce extension presence on dashboard origins for install nudge [#86](https://github.com/codebridger/subturtle-extension-apps/issues/86)exkh0z3 ([69dcf1b](https://github.com/codebridger/subturtle-extension-apps/commit/69dcf1bc0c13f293c01592545ec2ccb1111d5f3e)), closes [#86exkh0z3](https://github.com/codebridger/subturtle-extension-apps/issues/86exkh0z3)
* **console-crane:** practice + flashcard-preview pages, near-translation actions ([224b9da](https://github.com/codebridger/subturtle-extension-apps/commit/224b9da79e8b9d2f094ae3f63b1f8524fcb78299))
* **practice-now:** emphasize practiced phrase + cover login flows ([8ff3408](https://github.com/codebridger/subturtle-extension-apps/commit/8ff340831d3ca35dcbc97ddfcf7088f7f382582b))
* **practice-now:** open config to logged-out users + clearer CTAs ([2f09e05](https://github.com/codebridger/subturtle-extension-apps/commit/2f09e0577de43a55d995e9277446d313b058beef))
* **practice-now:** voice session config + dashboard deep-link ([db1a3fc](https://github.com/codebridger/subturtle-extension-apps/commit/db1a3fc08f2579c2d6c958a2e8c289c95e592339))
* **save-modal:** chunk highlights, AI advice chat, bundle suggestion ([9954c22](https://github.com/codebridger/subturtle-extension-apps/commit/9954c22f8822f5a06912247d0098d937c20ec6b5))
* **save-modal:** in-field bundle chips with dirty-aware save + inline removal ([374cbb4](https://github.com/codebridger/subturtle-extension-apps/commit/374cbb4b0c957c5def27d6b9f0211b3ed4fe17f5))
* **save-modal:** per-chunk definitions, merged pronunciation, reorder save ([f766040](https://github.com/codebridger/subturtle-extension-apps/commit/f76604023886a6d88b18831c9e492ef8253e11b7))
* **saved-phrase:** DB-first lookup, reuse stored translation, no AI re-call ([1315cc8](https://github.com/codebridger/subturtle-extension-apps/commit/1315cc86c3421ab64560e68e70d0b282c662d3ba))

## [1.11.2](https://github.com/codebridger/subturtle-extension-apps/compare/v1.11.1...v1.11.2) (2026-05-06)


### Bug Fixes

* tweak the release ([9a7ec39](https://github.com/codebridger/subturtle-extension-apps/commit/9a7ec39342bd062d370a696ca469e6d8dc34b9b0))

## [1.11.1](https://github.com/codebridger/subturtle-extension-apps/compare/v1.11.0...v1.11.1) (2026-05-06)


### Bug Fixes

* [#86](https://github.com/codebridger/subturtle-extension-apps/issues/86)exgqfpu skip token writes to host LS on dashboard origins ([838451e](https://github.com/codebridger/subturtle-extension-apps/commit/838451e9ad10d3a3755691b4ca586a0d3815a008)), closes [#86exgqfpu](https://github.com/codebridger/subturtle-extension-apps/issues/86exgqfpu)

# [1.11.0](https://github.com/codebridger/subturtle-extension-apps/compare/v1.10.1...v1.11.0) (2026-05-04)


### Bug Fixes

* persist anonymous tokens and stop logout-cascade on anon sessions ([825db93](https://github.com/codebridger/subturtle-extension-apps/commit/825db93ddf441d9c1791ae45016d85e98360e856))


### Features

* add bootstrap loader to popup for improved initial load experience ([02c59f8](https://github.com/codebridger/subturtle-extension-apps/commit/02c59f89232f44c4ef0dd3a4dbbef07f37469e80))
* add loading state and section divider to popup translate ([9c89f83](https://github.com/codebridger/subturtle-extension-apps/commit/9c89f83557f899bc1465de7625d0149489c73dda)), closes [#86exfjner](https://github.com/codebridger/subturtle-extension-apps/issues/86exfjner)
* add prerelease support for dev branch with environment-specific changelogs and configs ([24f087b](https://github.com/codebridger/subturtle-extension-apps/commit/24f087b5b8e6cc4c7c53ed1f2e2f72b974d01f6d))
* add translate input on popup home view ([efb435c](https://github.com/codebridger/subturtle-extension-apps/commit/efb435cbbbea03598fefe6a6bff0c8fd989caaa8)), closes [#86exfjner](https://github.com/codebridger/subturtle-extension-apps/issues/86exfjner)
* refresh popup help view to cover web text and quick translate [#86](https://github.com/codebridger/subturtle-extension-apps/issues/86)exfjner ([a0968ec](https://github.com/codebridger/subturtle-extension-apps/commit/a0968ec2ba5c551d94151075ce08217675cedbd9)), closes [#86exfjner](https://github.com/codebridger/subturtle-extension-apps/issues/86exfjner)

# Changelog
