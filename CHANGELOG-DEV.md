# [1.17.0-dev.10](https://github.com/codebridger/subturtle-extension-apps/compare/v1.17.0-dev.9...v1.17.0-dev.10) (2026-10-17)


### Bug Fixes

* **analytics:** track every local save outcome, closed login windows, and keep the install id after updates ([3c9f737](https://github.com/codebridger/subturtle-extension-apps/commit/3c9f737060c15af925af16b42e59aeaf0e1867d8))

# [1.17.0-dev.9](https://github.com/codebridger/subturtle-extension-apps/compare/v1.17.0-dev.8...v1.17.0-dev.9) (2026-10-16)


### Features

* **save:** save-first E-01 to E-05 let logged-out learners save and sign in later (dev port) ([99f57e6](https://github.com/codebridger/subturtle-extension-apps/commit/99f57e6d11299eeda79d34bd5dea4c07efc49015))
* **save:** save-first E-02 show "Save without login" and "Login to save" together ([6337290](https://github.com/codebridger/subturtle-extension-apps/commit/63372906e7963bf9487d1f5b0e585c002596bd3f))

# [1.17.0-dev.8](https://github.com/codebridger/subturtle-extension-apps/compare/v1.17.0-dev.7...v1.17.0-dev.8) (2026-10-16)


### Bug Fixes

* **analytics:** E-01 E-05 send the install id and trigger with translation calls ([1466a8f](https://github.com/codebridger/subturtle-extension-apps/commit/1466a8f09f405f4271fb1ce217796745ad08e7ae))


### Features

* **analytics:** E-02 track installs and updates and open the welcome page ([b7ddfd6](https://github.com/codebridger/subturtle-extension-apps/commit/b7ddfd6d79fddc89a9d116244c7c4dca5634633a)), closes [codebridger/subturtle-dashboard-app#144](https://github.com/codebridger/subturtle-dashboard-app/issues/144)
* **analytics:** E-03 track the save-login prompt and login results ([efec688](https://github.com/codebridger/subturtle-extension-apps/commit/efec6881407b7f51629c5ea530357c453b2c3ad1))


### Performance Improvements

* **translation:** E-04 E-06 share in-flight translations and translate each caption once ([7c0a3b2](https://github.com/codebridger/subturtle-extension-apps/commit/7c0a3b27403286fe22480d973f0fb9616cd7ae7a))

# [1.17.0-dev.7](https://github.com/codebridger/subturtle-extension-apps/compare/v1.17.0-dev.6...v1.17.0-dev.7) (2026-10-16)


### Bug Fixes

* **popup:** ignore tabs without our content scripts when telling tabs (E-03) ([9f68e9d](https://github.com/codebridger/subturtle-extension-apps/commit/9f68e9d8a50580449e1c33d6c5df6cee2e560d74))
* **save:** keep the save window open and show the saved state (E-05, E-06) ([fc3c98b](https://github.com/codebridger/subturtle-extension-apps/commit/fc3c98bfd770a5f7b591f148dc2805329071efc3))

# [1.17.0-dev.6](https://github.com/codebridger/subturtle-extension-apps/compare/v1.17.0-dev.5...v1.17.0-dev.6) (2026-10-16)


### Bug Fixes

* **languages:** send the user's id with the language calls so the pill and save row work (E-03, E-05) ([9b1d2d4](https://github.com/codebridger/subturtle-extension-apps/commit/9b1d2d430d9d2bbc329f6486f1f7bacf7cca67d4))

# [1.17.0-dev.5](https://github.com/codebridger/subturtle-extension-apps/compare/v1.17.0-dev.4...v1.17.0-dev.5) (2026-10-15)


### Features

* **languages:** send the learning language to analytics and show the own language in page settings (E-13, E-03) ([58f5845](https://github.com/codebridger/subturtle-extension-apps/commit/58f5845cedee5371e53a2c869047e728672f86d9))

# [1.17.0-dev.4](https://github.com/codebridger/subturtle-extension-apps/compare/v1.17.0-dev.3...v1.17.0-dev.4) (2026-10-15)


### Features

* **save:** add the save window language row, keep for later and per-language saves (E-05, E-06, E-07, E-08) ([8068363](https://github.com/codebridger/subturtle-extension-apps/commit/8068363b45fe7d2c711ceb1356cc724d95b460c7))

# [1.17.0-dev.3](https://github.com/codebridger/subturtle-extension-apps/compare/v1.17.0-dev.2...v1.17.0-dev.3) (2026-10-15)


### Features

* **popup:** add the language pill, list, due line and plan limit (E-03, E-04, E-11, E-14) ([8294301](https://github.com/codebridger/subturtle-extension-apps/commit/8294301ab0df4fd1104cbeb004ab2da9a68fb060))

# [1.17.0-dev.2](https://github.com/codebridger/subturtle-extension-apps/compare/v1.17.0-dev.1...v1.17.0-dev.2) (2026-10-15)


### Bug Fixes

* **languages:** keep the language state in its own store so unit tests run in CI (E-01) ([8928f6c](https://github.com/codebridger/subturtle-extension-apps/commit/8928f6cf84bc7ba147cff54f02a699688572af2a))


### Features

* **languages:** read languages and own language from the server profile (E-01, E-02, E-09, E-10, E-12) ([63f79d1](https://github.com/codebridger/subturtle-extension-apps/commit/63f79d1845574774688880d01b565a9635e06293))

# [1.17.0-dev.1](https://github.com/codebridger/subturtle-extension-apps/compare/v1.16.4...v1.17.0-dev.1) (2026-10-12)


### Bug Fixes

* **analytics:** restore phrase_hovered, bootstrap the session once per page ([f1941a3](https://github.com/codebridger/subturtle-extension-apps/commit/f1941a378dba77afe3dd30d982af9324c7e5de7f))
* **settings:** default the target language on first run, never send null ([be762ba](https://github.com/codebridger/subturtle-extension-apps/commit/be762ba875de3df75bc7ac6ee62d44f616e90a32))
* **word-card:** bidi-safe text, Esc to close/back, whole-word Nibble selections ([154ee7b](https://github.com/codebridger/subturtle-extension-apps/commit/154ee7bf478f61e657dd7afa16fec8863dd44407))


### Features

* **practice-now:** offer Text or Voice sized to the user's tier ([1fcfd20](https://github.com/codebridger/subturtle-extension-apps/commit/1fcfd2034759c9e0b871b33e426fb37f87aba15c))

## [1.16.4-dev.1](https://github.com/codebridger/subturtle-extension-apps/compare/v1.16.3...v1.16.4-dev.1) (2026-10-06)


### Bug Fixes

* shield the dashboard session on every dashboard host #z8zc9zywfj ([2b8a06e](https://github.com/codebridger/subturtle-extension-apps/commit/2b8a06eefe614a324600b8942001c9acd7ee173b)), closes [#z8zc9zywfj](https://github.com/codebridger/subturtle-extension-apps/issues/z8zc9zywfj)

## [1.16.3-dev.2](https://github.com/codebridger/subturtle-extension-apps/compare/v1.16.3-dev.1...v1.16.3-dev.2) (2026-10-06)


### Bug Fixes

* shield the dashboard session on every dashboard host #z8zc9zywfj ([2b8a06e](https://github.com/codebridger/subturtle-extension-apps/commit/2b8a06eefe614a324600b8942001c9acd7ee173b)), closes [#z8zc9zywfj](https://github.com/codebridger/subturtle-extension-apps/issues/z8zc9zywfj)

## [1.16.3-dev.1](https://github.com/codebridger/subturtle-extension-apps/compare/v1.16.2...v1.16.3-dev.1) (2026-10-06)


### Bug Fixes

* **popup:** list any web page as supported and drop the unused Google Translate permission #z8zc9zyg38 ([a9f00e4](https://github.com/codebridger/subturtle-extension-apps/commit/a9f00e4180348877dc877a52f46c302430f274b9)), closes [#z8zc9zyg38](https://github.com/codebridger/subturtle-extension-apps/issues/z8zc9zyg38)

# [1.16.0-dev.3](https://github.com/codebridger/subturtle-extension-apps/compare/v1.16.0-dev.2...v1.16.0-dev.3) (2026-10-05)


### Bug Fixes

* **popup:** list any web page as supported and drop the unused Google Translate permission #z8zc9zyg38 ([a9f00e4](https://github.com/codebridger/subturtle-extension-apps/commit/a9f00e4180348877dc877a52f46c302430f274b9)), closes [#z8zc9zyg38](https://github.com/codebridger/subturtle-extension-apps/issues/z8zc9zyg38)

# [1.16.0-dev.2](https://github.com/codebridger/subturtle-extension-apps/compare/v1.16.0-dev.1...v1.16.0-dev.2) (2026-09-23)


### Bug Fixes

* **auth:** make "With Current Chrome User" actually sign in ([b09624a](https://github.com/codebridger/subturtle-extension-apps/commit/b09624a6d90fb6759ce9ec476ffe6c9d4372fdba))
* **auth:** sign in with the SubTurtle Firebase projects' Google clients ([dd4a800](https://github.com/codebridger/subturtle-extension-apps/commit/dd4a80008fbafaf87f3017125332de83569b0760))
* **auth:** sign in with the SubTurtle Firebase projects' Google clients ([#40](https://github.com/codebridger/subturtle-extension-apps/issues/40)) ([1115ee2](https://github.com/codebridger/subturtle-extension-apps/commit/1115ee2a7984893ea7eaffe27059f9a05a0e6b48))

# [1.16.0-dev.1](https://github.com/codebridger/subturtle-extension-apps/compare/v1.15.1...v1.16.0-dev.1) (2026-06-19)


### Features

* **popup:** show extension version in home footer [#86](https://github.com/codebridger/subturtle-extension-apps/issues/86)exqazkq ([fe37a47](https://github.com/codebridger/subturtle-extension-apps/commit/fe37a47f980a54cace443555da14a182f68f6502)), closes [#86exqazkq](https://github.com/codebridger/subturtle-extension-apps/issues/86exqazkq)

## [1.15.1-dev.1](https://github.com/codebridger/subturtle-extension-apps/compare/v1.15.0...v1.15.1-dev.1) (2026-06-17)


### Bug Fixes

* **console-crane:** close bundle selector dropdown and contain its list [#86](https://github.com/codebridger/subturtle-extension-apps/issues/86)exzbh61 ([f9f1c8e](https://github.com/codebridger/subturtle-extension-apps/commit/f9f1c8e465f81ae14a8bdf40f42d7642f702be4c)), closes [#86exzbh61](https://github.com/codebridger/subturtle-extension-apps/issues/86exzbh61)
* **console-crane:** keep bundle list within the modal frame [#86](https://github.com/codebridger/subturtle-extension-apps/issues/86)exzbh61 ([ca49b14](https://github.com/codebridger/subturtle-extension-apps/commit/ca49b143cbefa8d6d3097066c0295ce8819a2795)), closes [#86exzbh61](https://github.com/codebridger/subturtle-extension-apps/issues/86exzbh61)

# [1.15.0-dev.2](https://github.com/codebridger/subturtle-extension-apps/compare/v1.15.0-dev.1...v1.15.0-dev.2) (2026-06-17)


### Bug Fixes

* **console-crane:** close bundle selector dropdown and contain its list [#86](https://github.com/codebridger/subturtle-extension-apps/issues/86)exzbh61 ([f9f1c8e](https://github.com/codebridger/subturtle-extension-apps/commit/f9f1c8e465f81ae14a8bdf40f42d7642f702be4c)), closes [#86exzbh61](https://github.com/codebridger/subturtle-extension-apps/issues/86exzbh61)
* **console-crane:** keep bundle list within the modal frame [#86](https://github.com/codebridger/subturtle-extension-apps/issues/86)exzbh61 ([ca49b14](https://github.com/codebridger/subturtle-extension-apps/commit/ca49b143cbefa8d6d3097066c0295ce8819a2795)), closes [#86exzbh61](https://github.com/codebridger/subturtle-extension-apps/issues/86exzbh61)

# [1.15.0-dev.1](https://github.com/codebridger/subturtle-extension-apps/compare/v1.14.1...v1.15.0-dev.1) (2026-06-09)


### Features

* Updated the package title and description ([fc73a6c](https://github.com/codebridger/subturtle-extension-apps/commit/fc73a6c545846055f86cad9b3cabeaf09e1d2f5d))

## [1.14.1-dev.2](https://github.com/codebridger/subturtle-extension-apps/compare/v1.14.1-dev.1...v1.14.1-dev.2) (2026-06-08)


### Bug Fixes

* self-heal stale auth token on translate instead of failing ([6ef3766](https://github.com/codebridger/subturtle-extension-apps/commit/6ef3766e482c0c97476b4d8aac59fe2f92f7376b))

## [1.14.1-dev.1](https://github.com/codebridger/subturtle-extension-apps/compare/v1.14.0...v1.14.1-dev.1) (2026-06-08)


### Bug Fixes

* **console-crane:** align bundle selector height with the Save button ([cf057a0](https://github.com/codebridger/subturtle-extension-apps/commit/cf057a095e85ac7d55824cafe5f06eeb2568d06a)), closes [#86exw6kme](https://github.com/codebridger/subturtle-extension-apps/issues/86exw6kme)
* **console-crane:** isolate modal from host-page color/flex CSS leaks ([2b89736](https://github.com/codebridger/subturtle-extension-apps/commit/2b89736bcb6664f2ecb82ba902ef1bb5a83dcc61)), closes [#86exw6kme](https://github.com/codebridger/subturtle-extension-apps/issues/86exw6kme)

# [1.14.0-dev.2](https://github.com/codebridger/subturtle-extension-apps/compare/v1.14.0-dev.1...v1.14.0-dev.2) (2026-06-08)


### Bug Fixes

* **console-crane:** isolate modal from host-page color/flex CSS leaks ([2b89736](https://github.com/codebridger/subturtle-extension-apps/commit/2b89736bcb6664f2ecb82ba902ef1bb5a83dcc61)), closes [#86exw6kme](https://github.com/codebridger/subturtle-extension-apps/issues/86exw6kme)

# [1.14.0-dev.1](https://github.com/codebridger/subturtle-extension-apps/compare/v1.13.0...v1.14.0-dev.1) (2026-06-08)


### Bug Fixes

* **analytics:** import authentication from client lib so unit suites load ([902436f](https://github.com/codebridger/subturtle-extension-apps/commit/902436f1b15a93739527cdbd8eed6e3eca7aed70))


### Features

* **analytics:** align events with docs/metrics conventions, close tracking gaps ([6e3236e](https://github.com/codebridger/subturtle-extension-apps/commit/6e3236e70bae3cd55a3d060311c85a4b36238723))

# [1.13.0-dev.3](https://github.com/codebridger/subturtle-extension-apps/compare/v1.13.0-dev.2...v1.13.0-dev.3) (2026-06-08)


### Bug Fixes

* **analytics:** import authentication from client lib so unit suites load ([902436f](https://github.com/codebridger/subturtle-extension-apps/commit/902436f1b15a93739527cdbd8eed6e3eca7aed70))


### Features

* **analytics:** align events with docs/metrics conventions, close tracking gaps ([6e3236e](https://github.com/codebridger/subturtle-extension-apps/commit/6e3236e70bae3cd55a3d060311c85a4b36238723))

# [1.13.0-dev.2](https://github.com/codebridger/subturtle-extension-apps/compare/v1.13.0-dev.1...v1.13.0-dev.2) (2026-06-02)


### Bug Fixes

* **popup:** render Practice/Preview console pages in the popup router ([ff2935c](https://github.com/codebridger/subturtle-extension-apps/commit/ff2935cc6d888dbbf22963196544c81db7226bec))

# [1.13.0-dev.1](https://github.com/codebridger/subturtle-extension-apps/compare/v1.12.0...v1.13.0-dev.1) (2026-06-02)


### Features

* **auth:** add dev-gated password login + MCP-driven CCW agent workflow ([b4b6e46](https://github.com/codebridger/subturtle-extension-apps/commit/b4b6e4685d7c9f561ec169a3064388d4965014b9))

# [1.12.0-dev.3](https://github.com/codebridger/subturtle-extension-apps/compare/v1.12.0-dev.2...v1.12.0-dev.3) (2026-05-25)


### Features

* **practice-now:** emphasize practiced phrase + cover login flows ([8ff3408](https://github.com/codebridger/subturtle-extension-apps/commit/8ff340831d3ca35dcbc97ddfcf7088f7f382582b))
* **practice-now:** open config to logged-out users + clearer CTAs ([2f09e05](https://github.com/codebridger/subturtle-extension-apps/commit/2f09e0577de43a55d995e9277446d313b058beef))
* **practice-now:** voice session config + dashboard deep-link ([db1a3fc](https://github.com/codebridger/subturtle-extension-apps/commit/db1a3fc08f2579c2d6c958a2e8c289c95e592339))

# [1.12.0-dev.2](https://github.com/codebridger/subturtle-extension-apps/compare/v1.12.0-dev.1...v1.12.0-dev.2) (2026-05-24)


### Bug Fixes

* **save-modal:** break circular import to console-crane store ([ab00130](https://github.com/codebridger/subturtle-extension-apps/commit/ab00130647d72703147f8a96df6faa8e3b1fbbe5))
* **save-modal:** refetch bundle options so post-save chip shows title ([25499da](https://github.com/codebridger/subturtle-extension-apps/commit/25499da35925bebeb854f20973c3ae39b4dbd6f2))


### Features

* **console-crane:** practice + flashcard-preview pages, near-translation actions ([224b9da](https://github.com/codebridger/subturtle-extension-apps/commit/224b9da79e8b9d2f094ae3f63b1f8524fcb78299))
* **save-modal:** chunk highlights, AI advice chat, bundle suggestion ([9954c22](https://github.com/codebridger/subturtle-extension-apps/commit/9954c22f8822f5a06912247d0098d937c20ec6b5))
* **save-modal:** in-field bundle chips with dirty-aware save + inline removal ([374cbb4](https://github.com/codebridger/subturtle-extension-apps/commit/374cbb4b0c957c5def27d6b9f0211b3ed4fe17f5))
* **save-modal:** per-chunk definitions, merged pronunciation, reorder save ([f766040](https://github.com/codebridger/subturtle-extension-apps/commit/f76604023886a6d88b18831c9e492ef8253e11b7))
* **saved-phrase:** DB-first lookup, reuse stored translation, no AI re-call ([1315cc8](https://github.com/codebridger/subturtle-extension-apps/commit/1315cc86c3421ab64560e68e70d0b282c662d3ba))

# [1.12.0-dev.1](https://github.com/codebridger/subturtle-extension-apps/compare/v1.11.2-dev.1...v1.12.0-dev.1) (2026-05-21)


### Features

* announce extension presence on dashboard origins for install nudge [#86](https://github.com/codebridger/subturtle-extension-apps/issues/86)exkh0z3 ([69dcf1b](https://github.com/codebridger/subturtle-extension-apps/commit/69dcf1bc0c13f293c01592545ec2ccb1111d5f3e)), closes [#86exkh0z3](https://github.com/codebridger/subturtle-extension-apps/issues/86exkh0z3)

## [1.11.2-dev.1](https://github.com/codebridger/subturtle-extension-apps/compare/v1.11.1...v1.11.2-dev.1) (2026-05-06)


### Bug Fixes

* tweak the release ([9a7ec39](https://github.com/codebridger/subturtle-extension-apps/commit/9a7ec39342bd062d370a696ca469e6d8dc34b9b0))

## [1.11.1-dev.1](https://github.com/codebridger/subturtle-extension-apps/compare/v1.11.0...v1.11.1-dev.1) (2026-05-06)


### Bug Fixes

* [#86](https://github.com/codebridger/subturtle-extension-apps/issues/86)exgqfpu skip token writes to host LS on dashboard origins ([838451e](https://github.com/codebridger/subturtle-extension-apps/commit/838451e9ad10d3a3755691b4ca586a0d3815a008)), closes [#86exgqfpu](https://github.com/codebridger/subturtle-extension-apps/issues/86exgqfpu)

# [1.11.0-dev.4](https://github.com/codebridger/subturtle-extension-apps/compare/v1.11.0-dev.3...v1.11.0-dev.4) (2026-05-06)


### Bug Fixes

* [#86](https://github.com/codebridger/subturtle-extension-apps/issues/86)exgqfpu skip token writes to host LS on dashboard origins ([838451e](https://github.com/codebridger/subturtle-extension-apps/commit/838451e9ad10d3a3755691b4ca586a0d3815a008)), closes [#86exgqfpu](https://github.com/codebridger/subturtle-extension-apps/issues/86exgqfpu)

# [1.11.0-dev.3](https://github.com/codebridger/subturtle-extension-apps/compare/v1.11.0-dev.2...v1.11.0-dev.3) (2026-05-04)


### Bug Fixes

* persist anonymous tokens and stop logout-cascade on anon sessions ([825db93](https://github.com/codebridger/subturtle-extension-apps/commit/825db93ddf441d9c1791ae45016d85e98360e856))

# [1.11.0-dev.2](https://github.com/codebridger/subturtle-extension-apps/compare/v1.11.0-dev.1...v1.11.0-dev.2) (2026-05-03)


### Features

* add loading state and section divider to popup translate ([9c89f83](https://github.com/codebridger/subturtle-extension-apps/commit/9c89f83557f899bc1465de7625d0149489c73dda)), closes [#86exfjner](https://github.com/codebridger/subturtle-extension-apps/issues/86exfjner)
* add translate input on popup home view ([efb435c](https://github.com/codebridger/subturtle-extension-apps/commit/efb435cbbbea03598fefe6a6bff0c8fd989caaa8)), closes [#86exfjner](https://github.com/codebridger/subturtle-extension-apps/issues/86exfjner)
* refresh popup help view to cover web text and quick translate [#86](https://github.com/codebridger/subturtle-extension-apps/issues/86)exfjner ([a0968ec](https://github.com/codebridger/subturtle-extension-apps/commit/a0968ec2ba5c551d94151075ce08217675cedbd9)), closes [#86exfjner](https://github.com/codebridger/subturtle-extension-apps/issues/86exfjner)

# [1.11.0-dev.1](https://github.com/codebridger/subturtle-extension-apps/compare/v1.10.1...v1.11.0-dev.1) (2026-05-03)


### Features

* add bootstrap loader to popup for improved initial load experience ([02c59f8](https://github.com/codebridger/subturtle-extension-apps/commit/02c59f89232f44c4ef0dd3a4dbbef07f37469e80))
* add prerelease support for dev branch with environment-specific changelogs and configs ([24f087b](https://github.com/codebridger/subturtle-extension-apps/commit/24f087b5b8e6cc4c7c53ed1f2e2f72b974d01f6d))

# Dev Changelog
