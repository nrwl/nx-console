## [18.71.1](https://github.com/nrwl/nx-console/compare/vscode-v18.71.0...vscode-v18.71.1) (2025-10-07)


### Bug Fixes

* **nxls:** increase default set of ignored branches to align with nx cloud ([#2811](https://github.com/nrwl/nx-console/issues/2811)) ([e7e6a2b](https://github.com/nrwl/nx-console/commit/e7e6a2b62e9b22cdec397b284d22c1e86fdf5282))
* **vscode:** reduce ai fix polling frequency ([#2813](https://github.com/nrwl/nx-console/issues/2813)) ([bf04b09](https://github.com/nrwl/nx-console/commit/bf04b093cd66221b4103140d15e96e00a52b78e2))

## 18.71.0 (2025-10-06)

### 🚀 Features

- **vscode:** handle ai fixes that are not code_change better ([#2802](https://github.com/nrwl/nx-console/pull/2802))

### 🩹 Fixes

- **nxls:** ignore more branches in recent CIPEs ([#2803](https://github.com/nrwl/nx-console/pull/2803))
- handle APPLIED_AUTOMATICALLY better in fix ui & vscode cipe tree ([#2799](https://github.com/nrwl/nx-console/pull/2799))

### ❤️ Thank You

- MaxKless @MaxKless

## 18.70.0 (2025-09-29)

### 🚀 Features

- **vscode:** add periodic check to see if ai configuration is outdated ([#2786](https://github.com/nrwl/nx-console/pull/2786))
- **vscode:** show fetch & pull changes on auto-apply notification ([#2795](https://github.com/nrwl/nx-console/pull/2795))
- **vscode:** allow MCP to run on fixed port via setting ([#2791](https://github.com/nrwl/nx-console/pull/2791))

### 🩹 Fixes

- **vscode:** only poll v frequently for active AI fixes ([#2794](https://github.com/nrwl/nx-console/pull/2794))
- **vscode:** error message typo ([#2792](https://github.com/nrwl/nx-console/pull/2792))
- **vscode:** show dynamic mcp.json path in removal notification ([#2774](https://github.com/nrwl/nx-console/pull/2774))

### ❤️ Thank You

- MaxKless @MaxKless

# [18.69.0](https://github.com/nrwl/nx-console/compare/vscode-v18.68.0...vscode-v18.69.0) (2025-09-19)


### Features

* **vscode:** add uri handler for self healing links ([#2771](https://github.com/nrwl/nx-console/issues/2771)) ([ebf0ce5](https://github.com/nrwl/nx-console/commit/ebf0ce59464c5a18751f607b233fa5d1364dc281))
* **vscode:** remove unused select project in graph feature ([#2768](https://github.com/nrwl/nx-console/issues/2768)) ([f89d2d2](https://github.com/nrwl/nx-console/commit/f89d2d24ae56c3c688726abea2b5b506d925f5fe))
* **vscode:** rework MCP integration to be cursor-native ([#2770](https://github.com/nrwl/nx-console/issues/2770)) ([d4bc7cd](https://github.com/nrwl/nx-console/commit/d4bc7cdee3c5602db4400d5e253297911979faed))
* **vscode:** show notifications for auto-applied fixes ([#2767](https://github.com/nrwl/nx-console/issues/2767)) ([8c8f531](https://github.com/nrwl/nx-console/commit/8c8f5311ca3c5d08eaa72b5b8d18013dba6ed6f9))

## 18.68.0 (2025-09-15)

### 🚀 Features

- **vscode:** add context menu action for opening project details ([#2757](https://github.com/nrwl/nx-console/pull/2757))

### 🩹 Fixes

- **vscode:** show error properly when updating fix ([#2758](https://github.com/nrwl/nx-console/pull/2758))
- **vscode:** add logs link to no projects error view ([#2754](https://github.com/nrwl/nx-console/pull/2754))
- **nx-mcp:** do not block mcp init with project graph computation ([#2752](https://github.com/nrwl/nx-console/pull/2752))
- **vscode:** handle nxls STOP event during startup ([#2751](https://github.com/nrwl/nx-console/pull/2751))
- **vscode:** handle # is project names when running tasks ([#2749](https://github.com/nrwl/nx-console/pull/2749))

### ❤️ Thank You

- MaxKless @MaxKless

## 18.67.0 (2025-09-08)

- **nx-mcp:** update project_details tool description and return dependencies from it ([#2745](https://github.com/nrwl/nx-console/pull/2745))
- **nxls:** stop native watcher events from being sent after shutdown ([#2746](https://github.com/nrwl/nx-console/pull/2746))

## 18.66.3 (2025-09-05)

### 🩹 Fixes

- **vscode:** check provenance contents and verify they come from the nx repo when running anything from nx latest ([#2731](https://github.com/nrwl/nx-console/pull/2731))
- **vscode:** dont show CIPE notification multiple times even after ai fixes timed out ([#2739](https://github.com/nrwl/nx-console/pull/2739))

### ❤️ Thank You

- MaxKless @MaxKless

## 18.66.2 (2025-08-29)

### 🩹 Fixes

- fix: repair cipe notification logic for new api timing with aiFixesEnabled (#2729) ([#2729](https://github.com/nrwl/nx-console/pull/2729))

### ❤️ Thank You

- MaxKless @MaxKless

## 18.66.1 (2025-08-28)

### 🩹 Fixes

- always check nx@latest provenance status before executing anything from it ([#2724](https://github.com/nrwl/nx-console/pull/2724))

### ❤️ Thank You

- MaxKless @MaxKless

## 18.66.0 (2025-08-27)

### 🚀 Features

- **vscode:** remove vscode explain-cipe command ([#2713](https://github.com/nrwl/nx-console/pull/2713))

### 🩹 Fixes

- **vscode:** remove version check on startup ([#2718](https://github.com/nrwl/nx-console/pull/2718))
- **vscode:** remove unused explain cipe menu item ([#2716](https://github.com/nrwl/nx-console/pull/2716))

### ❤️ Thank You

- MaxKless @MaxKless

## [18.65.1](https://github.com/nrwl/nx-console/compare/vscode-v18.65.0...vscode-v18.65.1) (2025-08-20)


### Bug Fixes

* **vscode:** init config store before mcp skeleton ([#2704](https://github.com/nrwl/nx-console/issues/2704)) ([82021d2](https://github.com/nrwl/nx-console/commit/82021d29f8ad6c47987c29d520149b8cb9e85063))

# [18.65.0](https://github.com/nrwl/nx-console/compare/vscode-v18.64.1...vscode-v18.65.0) (2025-08-19)


### Bug Fixes

* make AI telemetry more consistent ([#2701](https://github.com/nrwl/nx-console/issues/2701)) ([cad26ab](https://github.com/nrwl/nx-console/commit/cad26ab7da264fe20b5dd6815dc20f7640394cfd))
* **vscode:** fix integrated nx-mcp behaviour in non-nx workspace ([#2700](https://github.com/nrwl/nx-console/issues/2700)) ([94218cf](https://github.com/nrwl/nx-console/commit/94218cfe8ab67ed58a786ee118460c0145943ba2))


### Features

* **nx-mcp:** expose recent CIPEs as MCP resources ([#2694](https://github.com/nrwl/nx-console/issues/2694)) ([614101f](https://github.com/nrwl/nx-console/commit/614101fe94374188ad9d78ec0a269d10254c1674))
* **vscode:** remove [@nx](https://github.com/nx) chat participant and redirect to MCP ([#2698](https://github.com/nrwl/nx-console/issues/2698)) ([6d40276](https://github.com/nrwl/nx-console/commit/6d40276b8a11264eb454bc2b2b4a32dc5a6b5280))

## [18.64.1](https://github.com/nrwl/nx-console/compare/vscode-v18.64.0...vscode-v18.64.1) (2025-08-18)


### Bug Fixes

* **vscode:** don't show target codelenses for synthetic targets ([#2691](https://github.com/nrwl/nx-console/issues/2691)) ([f2f27c2](https://github.com/nrwl/nx-console/commit/f2f27c20a038f5e7af888e606ffba77d88ea338f))
* **vscode:** handle eacces error when connecting to jsonrpc server ([#2696](https://github.com/nrwl/nx-console/issues/2696)) ([265910e](https://github.com/nrwl/nx-console/commit/265910e81bf9c3955a5f8796ae15d91308c781d1))

# [18.64.0](https://github.com/nrwl/nx-console/compare/vscode-v18.63.0...vscode-v18.64.0) (2025-08-13)


### Bug Fixes

* improve nx-mcp & nxls exit handlers ([#2688](https://github.com/nrwl/nx-console/issues/2688)) ([91cc0a3](https://github.com/nrwl/nx-console/commit/91cc0a3b279b21aa1aee6bcefa9b80d4a4fd67a8))
* **vscode:** don't track nx refresh when it's automatically happening on branch change ([#2686](https://github.com/nrwl/nx-console/issues/2686)) ([1b85ea9](https://github.com/nrwl/nx-console/commit/1b85ea91aa94c13c206bd0b9c3091582b3cc74ea))


### Features

* **vscode:** improve migrate ui with commands for individual actions ([#2682](https://github.com/nrwl/nx-console/issues/2682)) ([3eed25e](https://github.com/nrwl/nx-console/commit/3eed25edfaddb0e63686292a8c5b366209260cf3))

# [18.63.0](https://github.com/nrwl/nx-console/compare/vscode-v18.62.0...vscode-v18.63.0) (2025-08-11)


### Bug Fixes

* **nx-mcp:** remove unused logging from workspace tool ([#2677](https://github.com/nrwl/nx-console/issues/2677)) ([c40a305](https://github.com/nrwl/nx-console/commit/c40a3057c6fef1b09bf60ec0450badcfd429ab73))
* **nx-mcp:** update migration to stdio message ([#2681](https://github.com/nrwl/nx-console/issues/2681)) ([83e66bb](https://github.com/nrwl/nx-console/commit/83e66bb7520579c6fa2e5d321769b08ff492a6ee))
* update task ID display format in terminal section for self-healing ci ([#2671](https://github.com/nrwl/nx-console/issues/2671)) ([442de7a](https://github.com/nrwl/nx-console/commit/442de7a6430844c29e68b37a10cf4caa7214bf75))
* **vscode:** add -y flag ([#2683](https://github.com/nrwl/nx-console/issues/2683)) ([3d44504](https://github.com/nrwl/nx-console/commit/3d4450438e2d9ccbf6d4a9496a83d91190cebbe0))
* **vscode:** catch errors during messaging server initialization ([#2672](https://github.com/nrwl/nx-console/issues/2672)) ([0952c55](https://github.com/nrwl/nx-console/commit/0952c5560d52d815c2845c3a15334fa1b3967e06))
* **vscode:** clarify notification to remove old mcp server and add dont ask again button ([#2680](https://github.com/nrwl/nx-console/issues/2680)) ([55e2ad0](https://github.com/nrwl/nx-console/commit/55e2ad0e08133ba2d30708ac92ece33b4cfedbb8))
* **vscode:** repair socket & route task retrieval through ideProvider ([#2674](https://github.com/nrwl/nx-console/issues/2674)) ([d423ce9](https://github.com/nrwl/nx-console/commit/d423ce90e1a205f700b5c3bd28fd2bfa8aa3cc51))
* **vscode:** run nx version check on extension activation ([#2679](https://github.com/nrwl/nx-console/issues/2679)) ([be2e293](https://github.com/nrwl/nx-console/commit/be2e29310c975d78d8fe361e20fb14221517ee80))


### Features

* **nx-mcp:** add filtering syntax to nx_workspace tool ([#2676](https://github.com/nrwl/nx-console/issues/2676)) ([a4cffdb](https://github.com/nrwl/nx-console/commit/a4cffdb861433eb6d43a25763b3f725f27c173b8))

# [18.62.0](https://github.com/nrwl/nx-console/compare/vscode-v18.61.1...vscode-v18.62.0) (2025-08-06)


### Bug Fixes

* **vscode:** dont specify . workspacepath by default in stdio server ([#2670](https://github.com/nrwl/nx-console/issues/2670)) ([4f35349](https://github.com/nrwl/nx-console/commit/4f353491686c36196b68e40bbfd95b11a0784d74))


### Features

* **vscode:** add fetch & pull action to apply notification ([#2669](https://github.com/nrwl/nx-console/issues/2669)) ([5b8b74e](https://github.com/nrwl/nx-console/commit/5b8b74ec9b0b4dc9f93a7df0d7dbb4ed578ca986))

## [18.61.1](https://github.com/nrwl/nx-console/compare/vscode-v18.61.0...vscode-v18.61.1) (2025-08-06)


### Bug Fixes

* **nxls:** remove faulty secondary entry point filtering logic ([#2667](https://github.com/nrwl/nx-console/issues/2667)) ([2bf4580](https://github.com/nrwl/nx-console/commit/2bf4580737532a058186c6450ec6b3c147ae85ab))
* **vscode:** handle no install state better for agent rules manager ([#2666](https://github.com/nrwl/nx-console/issues/2666)) ([30b3c61](https://github.com/nrwl/nx-console/commit/30b3c61b6d7b13acd788d1267572e66984000712))

# [18.61.0](https://github.com/nrwl/nx-console/compare/vscode-v18.60.4...vscode-v18.61.0) (2025-08-05)


### Bug Fixes

* **vscode:** move nx cloud fix to rungroup level in tree view ([#2657](https://github.com/nrwl/nx-console/issues/2657)) ([1c43dab](https://github.com/nrwl/nx-console/commit/1c43dab7789a961b525eba34df5f5a1380615e30))


### Features

* enable mcp to communicate with IDE via JSON-RPC server ([#2640](https://github.com/nrwl/nx-console/issues/2640)) ([0e9729a](https://github.com/nrwl/nx-console/commit/0e9729a3c9946e7eaae969daf3cc4f53e4c03abf))
* **vscode:** use vscode api to register mcp server & migrate cursor to stdio mcp ([#2650](https://github.com/nrwl/nx-console/issues/2650)) ([feb448a](https://github.com/nrwl/nx-console/commit/feb448afde50c3ed167ac5fa4b21a36a4c64b574))

## [18.60.4](https://github.com/nrwl/nx-console/compare/vscode-v18.60.3...vscode-v18.60.4) (2025-08-05)


### Bug Fixes

* **vscode:** write file as-is when refreshing mcp ([#2660](https://github.com/nrwl/nx-console/issues/2660)) ([604c9c7](https://github.com/nrwl/nx-console/commit/604c9c7288617ab0f52f7d03e09c7061a08fc831))

## [18.60.3](https://github.com/nrwl/nx-console/compare/vscode-v18.60.2...vscode-v18.60.3) (2025-08-05)


### Bug Fixes

* improve misc cloud onboarding things  ([#2656](https://github.com/nrwl/nx-console/issues/2656)) ([7522707](https://github.com/nrwl/nx-console/commit/75227075e512e78cf00f374f5141443fe5ca058e))
* **nxls:** enable read-collections to pick up things from secondary entry points ([#2648](https://github.com/nrwl/nx-console/issues/2648)) ([fae9aa5](https://github.com/nrwl/nx-console/commit/fae9aa540f957d6cc5a8a912d6b96506c2b5db53))
* render line breaks in AI fix reasoning ([#2659](https://github.com/nrwl/nx-console/issues/2659)) ([ba80ded](https://github.com/nrwl/nx-console/commit/ba80ded3e8728acf3642238bb57d78cd7bb1841e))
* **vscode:** throttle cloud view refresh clicks ([#2654](https://github.com/nrwl/nx-console/issues/2654)) ([9c32b6b](https://github.com/nrwl/nx-console/commit/9c32b6b82207e935de944d9f572c4afb835e33dc))

## [18.60.2](https://github.com/nrwl/nx-console/compare/vscode-v18.60.1...vscode-v18.60.2) (2025-08-01)


### Bug Fixes

* self-healing UI improvements ([#2651](https://github.com/nrwl/nx-console/issues/2651)) ([22951bb](https://github.com/nrwl/nx-console/commit/22951bbb315a0cb239bfd7ab1bd56d25b580e096))
* **vscode:** handle undefined repo.state.HEAD timing issue ([#2652](https://github.com/nrwl/nx-console/issues/2652)) ([1cf110a](https://github.com/nrwl/nx-console/commit/1cf110a864cc36ca4f053c3194e5c77cb91652ca))

## [18.60.1](https://github.com/nrwl/nx-console/compare/vscode-v18.60.0...vscode-v18.60.1) (2025-07-31)


### Bug Fixes

* handle APPLIED_LOCALLY state better in cloud fix ui ([#2642](https://github.com/nrwl/nx-console/issues/2642)) ([f34cfd1](https://github.com/nrwl/nx-console/commit/f34cfd198328f4af507de9e28877903bf92b15f0))
* make sure run-task callback from new graph still works ([#2646](https://github.com/nrwl/nx-console/issues/2646)) ([a367f21](https://github.com/nrwl/nx-console/commit/a367f218ed336793d33b95019de5c11637933c5b))
* **vscode:** make refresh silent on branch change ([#2645](https://github.com/nrwl/nx-console/issues/2645)) ([ec98511](https://github.com/nrwl/nx-console/commit/ec98511a7a0b23609548ba7bdf8c392438a643b3))

# [18.60.0](https://github.com/nrwl/nx-console/compare/vscode-v18.59.3...vscode-v18.60.0) (2025-07-25)


### Features

* support using latest Nx version in tasks and IntelliJ commands, and use it to connect to cloud ([#2638](https://github.com/nrwl/nx-console/issues/2638)) ([d003e8c](https://github.com/nrwl/nx-console/commit/d003e8cda23b83174f9c098f5b19f0a5539da710))

## [18.59.3](https://github.com/nrwl/nx-console/compare/vscode-v18.59.2...vscode-v18.59.3) (2025-07-24)


### Bug Fixes

* **vscode:** use refresh command instead of direct invocation ([#2635](https://github.com/nrwl/nx-console/issues/2635)) ([f685fc9](https://github.com/nrwl/nx-console/commit/f685fc93a60fc7ce216b4ba1803008bfaf0965d7))

## [18.59.2](https://github.com/nrwl/nx-console/compare/vscode-v18.59.1...vscode-v18.59.2) (2025-07-24)


### Bug Fixes

* **vscode:** restart nxls whenever the branch changes ([#2633](https://github.com/nrwl/nx-console/issues/2633)) ([53e5329](https://github.com/nrwl/nx-console/commit/53e53299261e7c98444fd1c0d8f08c1fd8764814))

## [18.59.1](https://github.com/nrwl/nx-console/compare/vscode-v18.59.0...vscode-v18.59.1) (2025-07-21)


### Bug Fixes

* **vscode:** handle network errors gracefully in nx cloud view ([#2626](https://github.com/nrwl/nx-console/issues/2626)) ([66588f8](https://github.com/nrwl/nx-console/commit/66588f8345bdac6cd3e8a60d3513a9e4c183c2b5))

# [18.59.0](https://github.com/nrwl/nx-console/compare/vscode-v18.58.0...vscode-v18.59.0) (2025-07-18)


### Bug Fixes

* **vscode:** handle project tree case where targetGroup & target have the same name ([#2623](https://github.com/nrwl/nx-console/issues/2623)) ([41d500b](https://github.com/nrwl/nx-console/commit/41d500bcf8022cf130677e47ebf5808a59643c90))
* **vscode:** rename ai notifications to be stronger & other small fixes ([#2618](https://github.com/nrwl/nx-console/issues/2618)) ([8c46932](https://github.com/nrwl/nx-console/commit/8c469328be73bcf3695c2e0f6419adbb2ae4cfe5))
* **vscode:** set up streamable http by default for cursor too ([#2624](https://github.com/nrwl/nx-console/issues/2624)) ([a64a59c](https://github.com/nrwl/nx-console/commit/a64a59c66fb2c1529d9f5f3559e1a7144a501645))


### Features

* **mcp:** optimize nx_workspace tool & gradually drop information if result is too large ([#2622](https://github.com/nrwl/nx-console/issues/2622)) ([2a8edaa](https://github.com/nrwl/nx-console/commit/2a8edaaa0b7f9df1bfbe0ce3f1eafae497c0ad91))

# [18.58.0](https://github.com/nrwl/nx-console/compare/vscode-v18.57.1...vscode-v18.58.0) (2025-07-16)


### Bug Fixes

* dont show notifications & tree items for ai fixes with NOT_STARTED ([#2619](https://github.com/nrwl/nx-console/issues/2619)) ([33661e4](https://github.com/nrwl/nx-console/commit/33661e424b4f06c7b17d7f457837e79e8a794432))
* render inline code blocks in cloud fix webview ([#2616](https://github.com/nrwl/nx-console/issues/2616)) ([f0b3886](https://github.com/nrwl/nx-console/commit/f0b3886c9ad82ec116d4cab6fe1c8251263ba66d))
* self-healing ui fixes ([#2610](https://github.com/nrwl/nx-console/issues/2610)) ([2f46e6b](https://github.com/nrwl/nx-console/commit/2f46e6b5260624f6b88c24996421775de8d692c5))
* **vscode:** don't throw error if MCP port is already in use ([#2579](https://github.com/nrwl/nx-console/issues/2579)) ([dbb8937](https://github.com/nrwl/nx-console/commit/dbb8937ef2b5114b8e3a873bcfff39fde237f205))
* **vscode:** remove noisy logs from cloud polling ([#2597](https://github.com/nrwl/nx-console/issues/2597)) ([6a9e31c](https://github.com/nrwl/nx-console/commit/6a9e31c10430376dfb55bb41253d00bbff2b3aff))


### Features

* add suggested fix reasoning to fix ui ([#2611](https://github.com/nrwl/nx-console/issues/2611)) ([1b3373e](https://github.com/nrwl/nx-console/commit/1b3373ed21ba8539896cf5d01e717097d2561b37))
* **intellij:** add self-healing CI support ([#2604](https://github.com/nrwl/nx-console/issues/2604)) ([5727466](https://github.com/nrwl/nx-console/commit/5727466fb1136356b2ea79dafd7c131a49111629))
* track ai fix action origin ([#2607](https://github.com/nrwl/nx-console/issues/2607)) ([418842d](https://github.com/nrwl/nx-console/commit/418842d501d3a294cea6f8f8e8d4936acfeb52a1))

## [18.57.1](https://github.com/nrwl/nx-console/compare/vscode-v18.57.0...vscode-v18.57.1) (2025-07-08)


### Bug Fixes

* **nxls:** make sure json file with windows paths can be read after update ([#2605](https://github.com/nrwl/nx-console/issues/2605)) ([1b149cc](https://github.com/nrwl/nx-console/commit/1b149ccdf4f5845d1a1f61340c2109e60a31cbe5))

# [18.57.0](https://github.com/nrwl/nx-console/compare/vscode-v18.56.0...vscode-v18.57.0) (2025-07-03)


### Bug Fixes

* **generate-ui:** fix tailwind after lib breakout ([#2592](https://github.com/nrwl/nx-console/issues/2592)) ([d8529b1](https://github.com/nrwl/nx-console/commit/d8529b12f3060baa91212f741e448250e70d9eae))
* **vscode:** update AI suggested fix status handling ([#2595](https://github.com/nrwl/nx-console/issues/2595)) ([f22e902](https://github.com/nrwl/nx-console/commit/f22e902c650deed1379636065c4633f2aa51fe43))


### Features

* add spinner to nx tool window panel ([#2424](https://github.com/nrwl/nx-console/issues/2424)) ([cea32fb](https://github.com/nrwl/nx-console/commit/cea32fb7ce1cd0c998ca5959f8ffcfbafcd839ad))

# [18.56.0](https://github.com/nrwl/nx-console/compare/vscode-v18.55.0...vscode-v18.56.0) (2025-06-30)


### Features

* **vscode:** add status bar item whenever there is a fix available ([#2591](https://github.com/nrwl/nx-console/issues/2591)) ([2b746db](https://github.com/nrwl/nx-console/commit/2b746db135e12687a2f123e18c388d5e4b18d7a1))

# [18.55.0](https://github.com/nrwl/nx-console/compare/vscode-v18.54.2...vscode-v18.55.0) (2025-06-30)


### Bug Fixes

* handle ai fix verification fields ([#2590](https://github.com/nrwl/nx-console/issues/2590)) ([1fd576f](https://github.com/nrwl/nx-console/commit/1fd576f5b176722f4e6c21f6f56e1d52ab1a059a))
* **vscode:** remove affected condition from onboarding checks ([#2583](https://github.com/nrwl/nx-console/issues/2583)) ([a92b965](https://github.com/nrwl/nx-console/commit/a92b965ee6fb9a0627b4bd25d327e96c927ad7c7))
* **vscode:** remove json caching in various places ([#2587](https://github.com/nrwl/nx-console/issues/2587)) ([d30d99a](https://github.com/nrwl/nx-console/commit/d30d99a705b3425ed0af753e95f116dcf33b9f01))
* **vscode:** update angular migration message ([#2586](https://github.com/nrwl/nx-console/issues/2586)) ([cf01be2](https://github.com/nrwl/nx-console/commit/cf01be28309d31f2728f48fa065e5ff912e3d480))
* **vscode:** update self-healing ci notification wording ([#2582](https://github.com/nrwl/nx-console/issues/2582)) ([09b1480](https://github.com/nrwl/nx-console/commit/09b148034df44ac16907b9acc5ba374fe4c44046))


### Features

* **migrate:** add stop migration functionality and update commands ([#2567](https://github.com/nrwl/nx-console/issues/2567)) ([18de342](https://github.com/nrwl/nx-console/commit/18de342f29b96fb0a955f2dcfb1c4f6ff35be51d))

## [18.54.2](https://github.com/nrwl/nx-console/compare/vscode-v18.54.1...vscode-v18.54.2) (2025-06-20)


### Bug Fixes

* **vscode:** make sure diff is closed alongside the ai fix view ([#2578](https://github.com/nrwl/nx-console/issues/2578)) ([fa60de4](https://github.com/nrwl/nx-console/commit/fa60de490c2c8c1812b3f029b150346b81b5c91e))
* **vscode:** mention MCP server & rules file in notification prompt ([#2573](https://github.com/nrwl/nx-console/issues/2573)) ([8431a77](https://github.com/nrwl/nx-console/commit/8431a776e6ba587ae7112b77ff071ab650068ecb))

## [18.54.1](https://github.com/nrwl/nx-console/compare/vscode-v18.54.0...vscode-v18.54.1) (2025-06-20)


### Bug Fixes

* **vscode:** add 'Fix Creation Failed' state and improve UI elements ([#2576](https://github.com/nrwl/nx-console/issues/2576)) ([cf230eb](https://github.com/nrwl/nx-console/commit/cf230eb7de6df13f9edc921d250619d031e2af76))

# [18.54.0](https://github.com/nrwl/nx-console/compare/vscode-v18.53.0...vscode-v18.54.0) (2025-06-19)


### Bug Fixes

* make terminal font size match IDE ([#2572](https://github.com/nrwl/nx-console/issues/2572)) ([269c53e](https://github.com/nrwl/nx-console/commit/269c53eed485455c40ad24a993e2cd5a660bcc87))
* **vscode:** refactor ai fix webview & automatically update it ([#2571](https://github.com/nrwl/nx-console/issues/2571)) ([53d40a8](https://github.com/nrwl/nx-console/commit/53d40a8d9373ae18245a51b64066df1dbe16079f))


### Features

* **nx-mcp:** more nx cloud tools ([#2568](https://github.com/nrwl/nx-console/issues/2568)) ([da23c12](https://github.com/nrwl/nx-console/commit/da23c12ddb36ce6c337a849fc1c2ebd39108469c))
* **vscode:** Add support to edit Nx Cloud fixes locally ([#2575](https://github.com/nrwl/nx-console/issues/2575)) ([eb5d4fa](https://github.com/nrwl/nx-console/commit/eb5d4fac4253144dac2d7596c18e53d2e517239c))

# [18.53.0](https://github.com/nrwl/nx-console/compare/vscode-v18.52.1...vscode-v18.53.0) (2025-06-18)


### Features

* nx cloud fix webview updates ([#2566](https://github.com/nrwl/nx-console/issues/2566)) ([b6e10bc](https://github.com/nrwl/nx-console/commit/b6e10bc3407d7a81fd68f1605234ba5e610d5662))
* **vscode:** add ability to migrate even when on latest version & fixes ([#2552](https://github.com/nrwl/nx-console/issues/2552)) ([130660c](https://github.com/nrwl/nx-console/commit/130660cc9a2c390c1a8bcff8ae917d8ae93c4a79))

## [18.52.1](https://github.com/nrwl/nx-console/compare/vscode-v18.52.0...vscode-v18.52.1) (2025-06-13)


### Bug Fixes

* **vscode:** use the terminal urls from response instead of getting it manually in the Nx Cloud fix feature ([#2560](https://github.com/nrwl/nx-console/issues/2560)) ([8de9758](https://github.com/nrwl/nx-console/commit/8de97580d06e28562e62543ff0b2abbe4921bfa4))

# [18.52.0](https://github.com/nrwl/nx-console/compare/vscode-v18.51.0...vscode-v18.52.0) (2025-06-13)


### Bug Fixes

* **vscode:** update failed CI notification message ([#2557](https://github.com/nrwl/nx-console/issues/2557)) ([2a2fb41](https://github.com/nrwl/nx-console/commit/2a2fb412596193030378ea678c39aca0c225db0b))


### Features

* **vscode:** add new ui to show Nx Cloud fix ([#2558](https://github.com/nrwl/nx-console/issues/2558)) ([d12d96a](https://github.com/nrwl/nx-console/commit/d12d96a6953e870971f0a532f24bd732cf873fff))

# [18.51.0](https://github.com/nrwl/nx-console/compare/vscode-v18.50.0...vscode-v18.51.0) (2025-06-09)


### Bug Fixes

* **vscode:** automatically refresh migrate data when the view is opened ([#2548](https://github.com/nrwl/nx-console/issues/2548)) ([29050f8](https://github.com/nrwl/nx-console/commit/29050f84e2c097e839b3f21d05c57b807a2f52c2))


### Features

* **nx-mcp:** additional tools for Nx Cloud integration ([#2554](https://github.com/nrwl/nx-console/issues/2554)) ([0b277ff](https://github.com/nrwl/nx-console/commit/0b277ff52f1c54106047271b1805d0501ca67152))
* **nx-mcp:** optimize nx_workspace tool to reduce token count ([#2545](https://github.com/nrwl/nx-console/issues/2545)) ([aec6519](https://github.com/nrwl/nx-console/commit/aec65199f09f5d3eae6e094ed7beec991bd2a01f))
* **vscode:** add cipe fix notification and support ([#2556](https://github.com/nrwl/nx-console/issues/2556)) ([7c7d404](https://github.com/nrwl/nx-console/commit/7c7d40447071fbf801dc3537bbf6c0560cca7f75))

# [18.50.0](https://github.com/nrwl/nx-console/compare/vscode-v18.49.3...vscode-v18.50.0) (2025-05-31)


### Bug Fixes

* **nx-mcp:** add addtl tool annotations ([#2512](https://github.com/nrwl/nx-console/issues/2512)) ([0c80507](https://github.com/nrwl/nx-console/commit/0c805074d352de54ea9094cf9bfa09e89fe2e356))
* stop writing 'undefined' into instructions ([#2526](https://github.com/nrwl/nx-console/issues/2526)) ([8cc3798](https://github.com/nrwl/nx-console/commit/8cc379833207054f6221b47a9185f89f08ea7b9e)), closes [#2525](https://github.com/nrwl/nx-console/issues/2525)
* **vscode:** parse jsonc mcp.json file ([#2516](https://github.com/nrwl/nx-console/issues/2516)) ([bb2b70d](https://github.com/nrwl/nx-console/commit/bb2b70d97f5085754c140da438f77bec60c0afd4))
* **vscode:** register rules commands before initializing rules manager ([#2511](https://github.com/nrwl/nx-console/issues/2511)) ([9432b41](https://github.com/nrwl/nx-console/commit/9432b418584847438c9f0ca76a07d0fdf2ec98a5))
* **vscode:** repair gitignore detection & downgrade version req ([#2536](https://github.com/nrwl/nx-console/issues/2536)) ([db48467](https://github.com/nrwl/nx-console/commit/db4846792493e5cc2e38258977b230cc6e8f6de7))


### Features

* **nx-mcp:** default workspace path ([#2531](https://github.com/nrwl/nx-console/issues/2531)) ([27037f7](https://github.com/nrwl/nx-console/commit/27037f75368ee411997728d1958e87c536d2d7f9))

## [18.49.3](https://github.com/nrwl/nx-console/compare/vscode-v18.49.2...vscode-v18.49.3) (2025-05-16)


### Bug Fixes

* **vscode:** do not edit gitignore when greater or equal to 21.1.0 ([#2513](https://github.com/nrwl/nx-console/issues/2513)) ([e8b8e5b](https://github.com/nrwl/nx-console/commit/e8b8e5b7bbea212e3767ea4fc376434960f73555))

## [18.49.2](https://github.com/nrwl/nx-console/compare/vscode-v18.49.1...vscode-v18.49.2) (2025-05-16)


### Bug Fixes

* **vscode:** lowercase workspace path when hashing for the pipe directory ([#2514](https://github.com/nrwl/nx-console/issues/2514)) ([e0b93e9](https://github.com/nrwl/nx-console/commit/e0b93e9538c2dfa2c4d4339e8ddfb78796f90fa5))

## [18.49.1](https://github.com/nrwl/nx-console/compare/vscode-v18.49.0...vscode-v18.49.1) (2025-05-15)


### Bug Fixes

* **vscode:** include prerelease version when comparing versions for enabling console socket and rules ([f793c0e](https://github.com/nrwl/nx-console/commit/f793c0e1e20333c3536b17875b3ceca0ba044102))

# [18.49.0](https://github.com/nrwl/nx-console/compare/vscode-v18.48.0...vscode-v18.49.0) (2025-05-15)


### Features

* add messenging service and add more nx mcp tools ([#2507](https://github.com/nrwl/nx-console/issues/2507)) ([0cc901b](https://github.com/nrwl/nx-console/commit/0cc901b9fd2712a64c5240a9cf9df09e6add0896))

# [18.48.0](https://github.com/nrwl/nx-console/compare/vscode-v18.47.1...vscode-v18.48.0) (2025-05-12)


### Bug Fixes

* **vscode:** remove legacy migrate command ([#2505](https://github.com/nrwl/nx-console/issues/2505)) ([67ee4c0](https://github.com/nrwl/nx-console/commit/67ee4c0936b446ef04cf20d11e1a05803b642285))
* **vscode:** wait before executing the new chat command ([#2509](https://github.com/nrwl/nx-console/issues/2509)) ([69a60e1](https://github.com/nrwl/nx-console/commit/69a60e1cd380603541f55ef57302c542bc87b308))


### Features

* **vscode:** add agent rules file handling ([#2506](https://github.com/nrwl/nx-console/issues/2506)) ([c44704b](https://github.com/nrwl/nx-console/commit/c44704b2968c8b97beb5e8cb4822676f2cc2891c))

## [18.47.1](https://github.com/nrwl/nx-console/compare/vscode-v18.47.0...vscode-v18.47.1) (2025-05-08)


### Bug Fixes

* **vscode:** fix destructuring from undefined again ([#2502](https://github.com/nrwl/nx-console/issues/2502)) ([67e44cb](https://github.com/nrwl/nx-console/commit/67e44cbfccbfb9c75337753df49de89d93e79042))

# [18.47.0](https://github.com/nrwl/nx-console/compare/vscode-v18.46.0...vscode-v18.47.0) (2025-05-07)


### Bug Fixes

* **vscode:** rework how dependencies are shown in quickpick ([#2498](https://github.com/nrwl/nx-console/issues/2498)) ([f9dd5dc](https://github.com/nrwl/nx-console/commit/f9dd5dce7869b991c27e7736da37a295988a9843))


### Features

* **vscode:** enable support for streamable http transport in vscode mcp ([#2500](https://github.com/nrwl/nx-console/issues/2500)) ([c53d7e4](https://github.com/nrwl/nx-console/commit/c53d7e4e5d37fcd05a9689c90d18bedb5d20f804))

# [18.46.0](https://github.com/nrwl/nx-console/compare/vscode-v18.45.2...vscode-v18.46.0) (2025-05-06)


### Bug Fixes

* **vscode:** fix wasi loading mock when requiring nx ([#2486](https://github.com/nrwl/nx-console/issues/2486)) ([2931051](https://github.com/nrwl/nx-console/commit/293105194b3e8867b05f83e3c48b1101e947622b))
* **vscode:** handle undefined nxWorkspace in typescript plugin ([#2493](https://github.com/nrwl/nx-console/issues/2493)) ([9bd0fdc](https://github.com/nrwl/nx-console/commit/9bd0fdcb258dea41010a6f27d98f555f163225a0))
* **vscode:** properly shut down mcp on deactivation & fix cursor client error ([#2494](https://github.com/nrwl/nx-console/issues/2494)) ([b3f698b](https://github.com/nrwl/nx-console/commit/b3f698ba16129c011b62e263d1087edf9079a822))
* **vscode:** remove false dichotomy between vscode & cursor. make sure windsurf doesn't get notifications for now ([#2490](https://github.com/nrwl/nx-console/issues/2490)) ([48f0eee](https://github.com/nrwl/nx-console/commit/48f0eee4f8ee3137ffca607af763d7cc80dcf339))
* **vscode:** repair finish setup in nx cloud action with nxCloudId set ([#2489](https://github.com/nrwl/nx-console/issues/2489)) ([c319aa3](https://github.com/nrwl/nx-console/commit/c319aa322ac89a34ca24ed5758a44d5e2d041537))


### Features

* add generate-ui mcp tool & add more tools to copilot ([#2456](https://github.com/nrwl/nx-console/issues/2456)) ([6ddf5d1](https://github.com/nrwl/nx-console/commit/6ddf5d1fe973427d4d73dc3adc66a00d481b612a))
* add migrate ui to vscode ([#2463](https://github.com/nrwl/nx-console/issues/2463)) ([2e1be98](https://github.com/nrwl/nx-console/commit/2e1be98a1295330a629423beeed8745375291e7b))
* **vscode:** add undo-migration action when approving current migration ([#2483](https://github.com/nrwl/nx-console/issues/2483)) ([eba26d7](https://github.com/nrwl/nx-console/commit/eba26d7227ec2713e6c12cfbae2c587c1fbeb896))

## [18.45.2](https://github.com/nrwl/nx-console/compare/vscode-v18.45.1...vscode-v18.45.2) (2025-04-25)


### Bug Fixes

* **nx-mcp:** dont call console.log directly in stdio mode ([#2480](https://github.com/nrwl/nx-console/issues/2480)) ([7878892](https://github.com/nrwl/nx-console/commit/78788920814e1b6598b4060c480d88774293c21f))

## [18.45.1](https://github.com/nrwl/nx-console/compare/vscode-v18.45.0...vscode-v18.45.1) (2025-04-24)


### Bug Fixes

* enable copilot to help fix cipe errors with agent mode, enhanced cipe tool description ([#2474](https://github.com/nrwl/nx-console/issues/2474)) ([5c9a60d](https://github.com/nrwl/nx-console/commit/5c9a60d70e6e733d90df4dc2880aef0f37174b12))
* keep mcp alive by implementing heart beat functionality ([#2473](https://github.com/nrwl/nx-console/issues/2473)) ([9d7fc57](https://github.com/nrwl/nx-console/commit/9d7fc572c5862b529b4d01d601a97eb5ef83789d))
* **vscode:** clean up agent prompt command ([#2475](https://github.com/nrwl/nx-console/issues/2475)) ([bc58d3a](https://github.com/nrwl/nx-console/commit/bc58d3a5c5c661e3d1fe00248e160cb19575e7aa))

# [18.45.0](https://github.com/nrwl/nx-console/compare/vscode-v18.44.2...vscode-v18.45.0) (2025-04-11)


### Bug Fixes

* handle aliases and windows paths for getGeneratorSchema ([#2472](https://github.com/nrwl/nx-console/issues/2472)) ([ec2d480](https://github.com/nrwl/nx-console/commit/ec2d4800323b5ce5df033217db8cc285f060711f))
* **vscode:** catch more errors when checking yarn version ([#2467](https://github.com/nrwl/nx-console/issues/2467)) ([04bad34](https://github.com/nrwl/nx-console/commit/04bad344e1a3193dc0af466dc56e3673bccc0a57))


### Features

* add mcp and copilot support for cipe details ([#2469](https://github.com/nrwl/nx-console/issues/2469)) ([47ea625](https://github.com/nrwl/nx-console/commit/47ea625098e659f720b318b3b8f8b29abff8ff93))
* **vscode:** enable mcp support for vscode ([#2471](https://github.com/nrwl/nx-console/issues/2471)) ([77dfb46](https://github.com/nrwl/nx-console/commit/77dfb4692e67ec5183f2a61cd961d2f5e0732e46))

## [18.44.2](https://github.com/nrwl/nx-console/compare/vscode-v18.44.1...vscode-v18.44.2) (2025-04-01)


### Bug Fixes

* **nxls:** make runLinkId nullable for cloud future compat ([#2455](https://github.com/nrwl/nx-console/issues/2455)) ([be05f23](https://github.com/nrwl/nx-console/commit/be05f23a18b0f6e0f79e1bfc92173cda4c9e2fee))
* **vscode:** catch one more undefined tsconfig case ([#2459](https://github.com/nrwl/nx-console/issues/2459)) ([74ecf28](https://github.com/nrwl/nx-console/commit/74ecf28f1ada997d50f821e83b0c5d08cf0baa05))
* **vscode:** catch potential errors importing from nx paths ([#2461](https://github.com/nrwl/nx-console/issues/2461)) ([bffb4c2](https://github.com/nrwl/nx-console/commit/bffb4c2b11728ed30a3521c8e90cf03310f9fd6d))
* **vscode:** include local plugins in tool result & hide community plugins for now ([#2454](https://github.com/nrwl/nx-console/issues/2454)) ([7271fc5](https://github.com/nrwl/nx-console/commit/7271fc5ff834a930ed90ed73ae68a27ac2d032e5))

## [18.44.1](https://github.com/nrwl/nx-console/compare/vscode-v18.44.0...vscode-v18.44.1) (2025-03-26)


### Bug Fixes

* **vscode:** catch yarn --version error in new typescript plugin ([#2453](https://github.com/nrwl/nx-console/issues/2453)) ([83bf98d](https://github.com/nrwl/nx-console/commit/83bf98de880de035628adbd8b32038d5b80ef575))

# [18.44.0](https://github.com/nrwl/nx-console/compare/vscode-v18.43.0...vscode-v18.44.0) (2025-03-21)


### Features

* **vscode:** provide completion info for workspace projects using package manager workspaces ([#2447](https://github.com/nrwl/nx-console/issues/2447)) ([ebc6423](https://github.com/nrwl/nx-console/commit/ebc6423b2de2396e9bda78ee823cdd1d5da5da7b))

# [18.43.0](https://github.com/nrwl/nx-console/compare/vscode-v18.42.1...vscode-v18.43.0) (2025-03-21)


### Bug Fixes

* **vscode:** differentiate between cursor & vscode in telemetry ([#2442](https://github.com/nrwl/nx-console/issues/2442)) ([a80b02c](https://github.com/nrwl/nx-console/commit/a80b02c23ff6e2bc569340868c846e35eb2a28aa))


### Features

* add mcp tool with for available plugins ([#2448](https://github.com/nrwl/nx-console/issues/2448)) ([bf08385](https://github.com/nrwl/nx-console/commit/bf083852de7af7a56f3161b5c87a99d075ae464a))
* added collapsible state option to project view plugin ([#2438](https://github.com/nrwl/nx-console/issues/2438)) ([50236a3](https://github.com/nrwl/nx-console/commit/50236a3ec5adac776d53449ca7822155e87a0555))

## [18.42.1](https://github.com/nrwl/nx-console/compare/vscode-v18.42.0...vscode-v18.42.1) (2025-03-14)


### Bug Fixes

* **mcp:** add descriptions to tool parameters ([#2436](https://github.com/nrwl/nx-console/issues/2436)) ([4503c33](https://github.com/nrwl/nx-console/commit/4503c33a6608436f57a124ea662f029cabd96ad1))
* **vscode:** custom icon in projectViewItemsProcessors plugin ([#2428](https://github.com/nrwl/nx-console/issues/2428)) ([9ba0304](https://github.com/nrwl/nx-console/commit/9ba03042f02be432498f3070d0bd3fb540710a8a))

# [18.42.0](https://github.com/nrwl/nx-console/compare/vscode-v18.41.1...vscode-v18.42.0) (2025-03-06)


### Bug Fixes

* **nxls:** repair generator reading with schematics/collection.json ([#2419](https://github.com/nrwl/nx-console/issues/2419)) ([2721f31](https://github.com/nrwl/nx-console/commit/2721f31fdf37de498b0138ef85c8eecc0d6662a1))
* use nx binary directly in graph & shut down correctly in vscode ([#2423](https://github.com/nrwl/nx-console/issues/2423)) ([88a054e](https://github.com/nrwl/nx-console/commit/88a054e93bfefbb4a95963c781e5205ef3c02eb4))
* **vscode:** shut down graph with SIGINT to propagate signals ([#2425](https://github.com/nrwl/nx-console/issues/2425)) ([fe2680f](https://github.com/nrwl/nx-console/commit/fe2680f815300c0b9f1b25d0c099bac62f913c2d))
* **vscode:** tweak mcp impl ([#2426](https://github.com/nrwl/nx-console/issues/2426)) ([1f1f3e8](https://github.com/nrwl/nx-console/commit/1f1f3e888492a21744f63b113303a93e94ffd8bb))


### Features

* add nx mcp ([#2415](https://github.com/nrwl/nx-console/issues/2415)) ([db12e19](https://github.com/nrwl/nx-console/commit/db12e1987167d6ce75692e983383baacae2d818f))
* new projectViewItemProcessors plugin ([#2420](https://github.com/nrwl/nx-console/issues/2420)) ([1d3c3fb](https://github.com/nrwl/nx-console/commit/1d3c3fb85e8f155157530ee1dabbb914e23cf698))

## [18.41.1](https://github.com/nrwl/nx-console/compare/vscode-v18.41.0...vscode-v18.41.1) (2025-02-20)


### Bug Fixes

* **vscode:** handle missing packagemanagercommands ([#2414](https://github.com/nrwl/nx-console/issues/2414)) ([5dba101](https://github.com/nrwl/nx-console/commit/5dba101c9a2f18a8f415586e24794dcc72bef2c9))

# [18.41.0](https://github.com/nrwl/nx-console/compare/vscode-v18.40.0...vscode-v18.41.0) (2025-02-20)


### Bug Fixes

* **vscode:** tweak dep wording for project graph prompt ([#2410](https://github.com/nrwl/nx-console/issues/2410)) ([f01befb](https://github.com/nrwl/nx-console/commit/f01befb6a2ace8253482ce3208318d99c0e63552))


### Features

* **vscode:** feed docs into copilot integration (RAG) ([#2404](https://github.com/nrwl/nx-console/issues/2404)) ([a307f07](https://github.com/nrwl/nx-console/commit/a307f07be663ea98c3cf6df09548b8a0215b46fc))

# [18.40.0](https://github.com/nrwl/nx-console/compare/vscode-v18.39.0...vscode-v18.40.0) (2025-02-18)


### Bug Fixes

* **nxls:** repair generatorOptions request in node 22 ([#2407](https://github.com/nrwl/nx-console/issues/2407)) ([b259610](https://github.com/nrwl/nx-console/commit/b25961086e523a0a9e69f3c6d972b3513f3719bb))
* **vscode:** switch telemetry reporting param to "kind" ([#2408](https://github.com/nrwl/nx-console/issues/2408)) ([781cb45](https://github.com/nrwl/nx-console/commit/781cb45fc9534ddbb72373102391048ec4732863))


### Features

* **vscode:** upgrade required vscode version ([#2409](https://github.com/nrwl/nx-console/issues/2409)) ([4db5e73](https://github.com/nrwl/nx-console/commit/4db5e73c4cdf5846e4cc1aee26d8af228c6c4b79))

# [18.39.0](https://github.com/nrwl/nx-console/compare/vscode-v18.38.0...vscode-v18.39.0) (2025-02-17)


### Bug Fixes

* **vscode:** rework prompts ([#2401](https://github.com/nrwl/nx-console/issues/2401)) ([0bbedd3](https://github.com/nrwl/nx-console/commit/0bbedd3b9354cbd23edaaf508b6587a4fe53faa3))


### Features

* **vscode:** add telemetry to ai interactions ([#2403](https://github.com/nrwl/nx-console/issues/2403)) ([93035fc](https://github.com/nrwl/nx-console/commit/93035fc0afcbd4331c20c9f35fa5708f7f7119ec))

# [18.38.0](https://github.com/nrwl/nx-console/compare/vscode-v18.37.0...vscode-v18.38.0) (2025-02-12)


### Bug Fixes

* add debug mode in vscode ([#2400](https://github.com/nrwl/nx-console/issues/2400)) ([2324c95](https://github.com/nrwl/nx-console/commit/2324c959dccee246ad6dc3161ff995cdd2f0e03a))
* **nxls:** handle broken nx.json better in nxls requests ([#2399](https://github.com/nrwl/nx-console/issues/2399)) ([b631a9d](https://github.com/nrwl/nx-console/commit/b631a9d4823b71f6a605a613bc3df5c96cd24070))


### Features

* **vscode:** allow copilot integration to specify cwd when running generators ([#2398](https://github.com/nrwl/nx-console/issues/2398)) ([f35eee1](https://github.com/nrwl/nx-console/commit/f35eee12f607a0d6dbe2b3656f81afd80db29899))

# [18.37.0](https://github.com/nrwl/nx-console/compare/vscode-v18.36.0...vscode-v18.37.0) (2025-02-11)


### Features

* **vscode:** add /generate command to copilot participant ([#2395](https://github.com/nrwl/nx-console/issues/2395)) ([783e1b5](https://github.com/nrwl/nx-console/commit/783e1b5cce368b9abc97a714d74b9bd64d49c8b6))

# [18.36.0](https://github.com/nrwl/nx-console/compare/vscode-v18.35.0...vscode-v18.36.0) (2025-02-07)


### Features

* **vscode:** add copilot chat participant ([#2393](https://github.com/nrwl/nx-console/issues/2393)) ([617b5a5](https://github.com/nrwl/nx-console/commit/617b5a5e854e97f4bf2a2f43d8ae3d2d6d90b819))

# [18.35.0](https://github.com/nrwl/nx-console/compare/vscode-v18.34.0...vscode-v18.35.0) (2025-01-17)


### Bug Fixes

* **nxls:** install deps only in nested folder ([#2384](https://github.com/nrwl/nx-console/issues/2384)) ([de5fcb5](https://github.com/nrwl/nx-console/commit/de5fcb5a8fba52d8b90822a747a5e52550906612))
* set right window.environment when rendering pdv ([#2381](https://github.com/nrwl/nx-console/issues/2381)) ([d5818b1](https://github.com/nrwl/nx-console/commit/d5818b1218c04a742eea93b861e741c94413a0fc))
* **vscode:** dont stop daemon in attempt to recover on startup ([#2374](https://github.com/nrwl/nx-console/issues/2374)) ([328532f](https://github.com/nrwl/nx-console/commit/328532f4facb16a2abbfe9fe061314d3aa57443f))


### Features

* **vscode:** track nx version in analytics ([#2377](https://github.com/nrwl/nx-console/issues/2377)) ([632263d](https://github.com/nrwl/nx-console/commit/632263d4f0235b97b1bae7141b5cd4bf9f7aeeab))

# [18.34.0](https://github.com/nrwl/nx-console/compare/vscode-v18.33.2...vscode-v18.34.0) (2024-12-18)


### Bug Fixes

* **nxls:** provide autocomplete only for plugins that contain nx ([#2365](https://github.com/nrwl/nx-console/issues/2365)) ([d94aa70](https://github.com/nrwl/nx-console/commit/d94aa70971ec074f62e8ac5d862e1c6295ac8dca))
* **vscode:** handle non-atomized file paths gracefully ([#2373](https://github.com/nrwl/nx-console/issues/2373)) ([b37f4da](https://github.com/nrwl/nx-console/commit/b37f4dae35caae45b9a455f994a2f540c5ae39b0))
* **vscode:** subscribe to project graph updates in atomizer codelens provider ([#2372](https://github.com/nrwl/nx-console/issues/2372)) ([4949292](https://github.com/nrwl/nx-console/commit/4949292c5953358ba39af8a628d2b47e52518864))


### Features

* **nxls:** add namedInputs target links & fix namedInputs completion in nx.json ([#2368](https://github.com/nrwl/nx-console/issues/2368)) ([6a18b68](https://github.com/nrwl/nx-console/commit/6a18b6814a057b89719f268c463f70d08973a0ce))
* **vscode:** add atomizer codelenses ([#2370](https://github.com/nrwl/nx-console/issues/2370)) ([68fccde](https://github.com/nrwl/nx-console/commit/68fccde92133475e264b61ccbe67f8314f3046f3))
* **vscode:** show project graph error message in projects view ([#2371](https://github.com/nrwl/nx-console/issues/2371)) ([8935212](https://github.com/nrwl/nx-console/commit/89352120a6b887edb850e1c09a3027656973b637))

## [18.33.2](https://github.com/nrwl/nx-console/compare/vscode-v18.33.1...vscode-v18.33.2) (2024-12-16)


### Bug Fixes

* **nxls:** always provide at least empty project graph object ([#2358](https://github.com/nrwl/nx-console/issues/2358)) ([504ef56](https://github.com/nrwl/nx-console/commit/504ef560f804a1e1799f78d579097280e0b11f73))
* **nxls:** clean up connection & ipc channel when shutting down nxls to prevent it from staying open ([#2353](https://github.com/nrwl/nx-console/issues/2353)) ([6357105](https://github.com/nrwl/nx-console/commit/63571050a0a5eeda4cfb4485b4b78f3f55988caf))
* **vscode:** make sure only one refresh progress indicator is shown per location ([#2359](https://github.com/nrwl/nx-console/issues/2359)) ([0379c2e](https://github.com/nrwl/nx-console/commit/0379c2e05d3859aa8ac05a2c73d3dc1b16a5c74d))
* **vscode:** show project details codelens above package.json#nx if it exists ([#2361](https://github.com/nrwl/nx-console/issues/2361)) ([2cd8cb7](https://github.com/nrwl/nx-console/commit/2cd8cb7a5f97178572d8048a9c1f4d091717772a))
* **vscode:** slow down recent cipe polling after auth error ([#2360](https://github.com/nrwl/nx-console/issues/2360)) ([714fb4a](https://github.com/nrwl/nx-console/commit/714fb4ad6b77eed765435f325e8d33b1643ebc16))

## [18.33.1](https://github.com/nrwl/nx-console/compare/vscode-v18.33.0...vscode-v18.33.1) (2024-12-10)


### Bug Fixes

* drop dependency on @nx/native packages in favor of loading from local node_modules ([#2349](https://github.com/nrwl/nx-console/issues/2349)) ([368401c](https://github.com/nrwl/nx-console/commit/368401c4d8552a520bcab7e57f9bdd1cf2e36e51))
* **nxls:** ignore git logs when getting default branch ([#2350](https://github.com/nrwl/nx-console/issues/2350)) ([cdf9c46](https://github.com/nrwl/nx-console/commit/cdf9c46adf13420f784297df54ede3fb4dd4b3f6))
* **nxls:** only make nx cloud requests if in an nx cloud workspace ([#2356](https://github.com/nrwl/nx-console/issues/2356)) ([c7bc53d](https://github.com/nrwl/nx-console/commit/c7bc53df0e7937f3454f5cb00709d41aa428ecf6))
* **nxls:** use native watcher right away when daemon dies during watch process ([#2351](https://github.com/nrwl/nx-console/issues/2351)) ([ab5537c](https://github.com/nrwl/nx-console/commit/ab5537cdca09461d6f2be1def5877780c06438d8))

# [18.33.0](https://github.com/nrwl/nx-console/compare/vscode-v18.32.0...vscode-v18.33.0) (2024-12-06)


### Bug Fixes

* increase window for finding recent commits to a week instead of a day ([#2342](https://github.com/nrwl/nx-console/issues/2342)) ([c0b5d60](https://github.com/nrwl/nx-console/commit/c0b5d60aff1bd713acfd7ec0806bb7ce084d1f3b))
* make sure default branch is always filtered out when getting recent cipes ([#2346](https://github.com/nrwl/nx-console/issues/2346)) ([3de7f68](https://github.com/nrwl/nx-console/commit/3de7f68e6e489190590074f0641ceb539ef7fecd))
* **nxls:** enable project.json completion for properties in package.json#nx ([#2340](https://github.com/nrwl/nx-console/issues/2340)) ([8d01db3](https://github.com/nrwl/nx-console/commit/8d01db3dcb37b19dd2ce1f7559e81630d288ac1a))
* **vscode:** adjust wording of cloud view actions ([#2344](https://github.com/nrwl/nx-console/issues/2344)) ([b574554](https://github.com/nrwl/nx-console/commit/b574554fa21045c7c65cef9f4e3a2562c1372899))


### Features

* **nxls:** decouple daemon lifecycle from nxls lifecycle ([#2339](https://github.com/nrwl/nx-console/issues/2339)) ([8ed9385](https://github.com/nrwl/nx-console/commit/8ed9385b02acd865d309fd12c6e28833e81bb477))

# [18.32.0](https://github.com/nrwl/nx-console/compare/vscode-v18.31.1...vscode-v18.32.0) (2024-12-04)


### Bug Fixes

* check daemonClient.enabled() before using it ([#2331](https://github.com/nrwl/nx-console/issues/2331)) ([167497f](https://github.com/nrwl/nx-console/commit/167497f1730498655b95a0c14450a56362d7c9b3))
* disable nxls auto-shutdown & tweak cloud notifications ([#2338](https://github.com/nrwl/nx-console/issues/2338)) ([aa26053](https://github.com/nrwl/nx-console/commit/aa260531668652a131e185f9055e39bd1b55fa07))
* use project graph-aware devkit util when splitting targets ([#2330](https://github.com/nrwl/nx-console/issues/2330)) ([0cd1313](https://github.com/nrwl/nx-console/commit/0cd13139102ac14a81f425a493e5e4a5a3c802ad))
* **vscode:** handle tree items being undefined due to timing issue ([#2333](https://github.com/nrwl/nx-console/issues/2333)) ([1f6b549](https://github.com/nrwl/nx-console/commit/1f6b549abe6803820e6d89176bc36458ab3a61dc))


### Features

* add recent cipe view & notifications ([#2322](https://github.com/nrwl/nx-console/issues/2322)) ([fef23e3](https://github.com/nrwl/nx-console/commit/fef23e31e3abc95b4ae4c2783d47901f6175f8da))
* also track current nx console version in rollbar ([#2332](https://github.com/nrwl/nx-console/issues/2332)) ([f26c254](https://github.com/nrwl/nx-console/commit/f26c254755ac52f6e85fdc17d169cdf5f8e9b2e4))
* **vscode:** add standalone project details codelens ([#2329](https://github.com/nrwl/nx-console/issues/2329)) ([b3cc9c5](https://github.com/nrwl/nx-console/commit/b3cc9c547772ac62e6726e1564f4a9f3fc2ff29a))

## [18.31.1](https://github.com/nrwl/nx-console/compare/vscode-v18.31.0...vscode-v18.31.1) (2024-11-25)


### Bug Fixes

* **vscode:** remove extra @ from add dependency logic ([#2327](https://github.com/nrwl/nx-console/issues/2327)) ([efbb344](https://github.com/nrwl/nx-console/commit/efbb344f8c3146ebab0dca9f49f3f4e42a4cdac8))

# [18.31.0](https://github.com/nrwl/nx-console/compare/vscode-v18.30.4...vscode-v18.31.0) (2024-11-21)


### Bug Fixes

* **vscode:** don't enable typescript server plugin in new solution-style workspaces ([#2313](https://github.com/nrwl/nx-console/issues/2313)) ([3b909e9](https://github.com/nrwl/nx-console/commit/3b909e972919d9476dd678d42ab4d8b9de46d0bc))
* **vsode:** dont try to look for compilerOptions in nonexistant tsconfig ([#2324](https://github.com/nrwl/nx-console/issues/2324)) ([9a33598](https://github.com/nrwl/nx-console/commit/9a33598aff2df82a8784bceb3bc580cec7dfe3d4))


### Features

* **nxls:** allow nxls to kill itself after 3h of inactivity to prevent background resource usage ([#2307](https://github.com/nrwl/nx-console/issues/2307)) ([babaf0e](https://github.com/nrwl/nx-console/commit/babaf0ef9f922a14d29da7db8cdfc07fabdad265))


### Reverts

* Revert "chore: leverage Nx Powerpack" (#2320) ([49669d7](https://github.com/nrwl/nx-console/commit/49669d787b314a86af9c7dd68b1437f69b496873)), closes [#2320](https://github.com/nrwl/nx-console/issues/2320)

## [18.30.4](https://github.com/nrwl/nx-console/compare/vscode-v18.30.3...vscode-v18.30.4) (2024-11-13)


### Bug Fixes

* **vscode:** also show loading bar in Common Nx Commands view ([#2308](https://github.com/nrwl/nx-console/issues/2308)) ([7141dbc](https://github.com/nrwl/nx-console/commit/7141dbc3d1da51348d5f62e0bb3a1d23f636c0f4))
* **vscode:** unregister listener if cloud onboarding webview is disposed ([#2316](https://github.com/nrwl/nx-console/issues/2316)) ([30d621c](https://github.com/nrwl/nx-console/commit/30d621c046071bd2cc141501719dc3145b35aeb0))

## [18.30.3](https://github.com/nrwl/nx-console/compare/vscode-v18.30.2...vscode-v18.30.3) (2024-11-12)


### Bug Fixes

* **vscode:** retry nxls request if connection is disposed during request ([#2312](https://github.com/nrwl/nx-console/issues/2312)) ([6709217](https://github.com/nrwl/nx-console/commit/6709217372fff92359bd56e462c8c3141aa2944a))

## [18.30.2](https://github.com/nrwl/nx-console/compare/vscode-v18.30.1...vscode-v18.30.2) (2024-11-11)


### Bug Fixes

* **vscode:** catch errors during codelens creation ([#2311](https://github.com/nrwl/nx-console/issues/2311)) ([65da0d2](https://github.com/nrwl/nx-console/commit/65da0d2644b296e6088a2a8f828932bf2f1f1fc6))

## [18.30.1](https://github.com/nrwl/nx-console/compare/vscode-v18.30.0...vscode-v18.30.1) (2024-11-11)


### Bug Fixes

* **vscode:** rollbar adjustment ([#2310](https://github.com/nrwl/nx-console/issues/2310)) ([ee519ac](https://github.com/nrwl/nx-console/commit/ee519accc50e410ede152e91895a7feabd1ab417))

# [18.30.0](https://github.com/nrwl/nx-console/compare/vscode-v18.29.1...vscode-v18.30.0) (2024-11-11)


### Bug Fixes

* handle 0.0.0-pr- releases when comparing versions ([#2309](https://github.com/nrwl/nx-console/issues/2309)) ([134c2b7](https://github.com/nrwl/nx-console/commit/134c2b7b6ee8f835365d36a5cf0546fe7a2b32b1))
* kill entire process tree when shutting down nxls & vscode ([#2288](https://github.com/nrwl/nx-console/issues/2288)) ([b174106](https://github.com/nrwl/nx-console/commit/b17410640226bb58af7f005e225483c1521d1b0d))
* **nxls:** adjust parseTargetString invocation to always pass a project graph ([#2291](https://github.com/nrwl/nx-console/issues/2291)) ([68c0b0d](https://github.com/nrwl/nx-console/commit/68c0b0d04f1e7186f14c155167e6347689e1398b))
* run nxls in a way that works with yarn pnp ([#2301](https://github.com/nrwl/nx-console/issues/2301)) ([3a38499](https://github.com/nrwl/nx-console/commit/3a38499f5fc606526a5089f06a18bd7215b22bbd))
* **vscode:** improve codelens if no  targets exist for project ([#2303](https://github.com/nrwl/nx-console/issues/2303)) ([9183dce](https://github.com/nrwl/nx-console/commit/9183dce783d3803f14740e2b3c0c9313e2132127))
* **vscode:** refactor new pdv to separate webview & state machine ([#2300](https://github.com/nrwl/nx-console/issues/2300)) ([cea04fc](https://github.com/nrwl/nx-console/commit/cea04fc3374f55be14569116d5d49e306f74ee4d))
* **vscode:** repair inlined tree-kill implementation ([#2298](https://github.com/nrwl/nx-console/issues/2298)) ([f6a9e5d](https://github.com/nrwl/nx-console/commit/f6a9e5dc29f4752bbd928e66742808bd533441a0))


### Features

* **vscode:** log anonymized errors to rollbar ([#2305](https://github.com/nrwl/nx-console/issues/2305)) ([7255d56](https://github.com/nrwl/nx-console/commit/7255d56c251b87563bd80feca5a980532d064e16))
* **vscode:** rework PDV integration to use new apis & state machine ([#2272](https://github.com/nrwl/nx-console/issues/2272)) ([990e2df](https://github.com/nrwl/nx-console/commit/990e2dfb2cdc928d4041654d40d8e8c4c5cb45a6))

## [18.29.1](https://github.com/nrwl/nx-console/compare/vscode-v18.29.0...vscode-v18.29.1) (2024-10-17)


### Bug Fixes

* **nxls:** pass disabledTaskSyncGenerators when getting pdv data ([#2287](https://github.com/nrwl/nx-console/issues/2287)) ([36da921](https://github.com/nrwl/nx-console/commit/36da921bcecd930adff54f2647f418fcffd8b154))
* **vscode:** repair nx init from the angular cli screen ([#2284](https://github.com/nrwl/nx-console/issues/2284)) ([75ad581](https://github.com/nrwl/nx-console/commit/75ad58150685389644c5e9deddbdaee6641ac3a1))

# [18.29.0](https://github.com/nrwl/nx-console/compare/vscode-v18.28.1...vscode-v18.29.0) (2024-10-07)


### Bug Fixes

* **nxls:** repair support for repos with only lerna.json ([#2278](https://github.com/nrwl/nx-console/issues/2278)) ([7917879](https://github.com/nrwl/nx-console/commit/79178798d0578b349d133906113ff4a04585857a))


### Features

* **vscode:** add nxWorkspacePath configuration option ([#2274](https://github.com/nrwl/nx-console/issues/2274)) ([a69e8ed](https://github.com/nrwl/nx-console/commit/a69e8edd14b56812a1c29a277d5491700a0b4364))
* **vscode:** show refresh loading state in project view & footer ([#2280](https://github.com/nrwl/nx-console/issues/2280)) ([35432ea](https://github.com/nrwl/nx-console/commit/35432eac005398d1b2d1beaea988dccb22dc7091))

## [18.28.1](https://github.com/nrwl/nx-console/compare/vscode-v18.28.0...vscode-v18.28.1) (2024-09-25)


### Bug Fixes

* add windowsHide: true in more places ([#2262](https://github.com/nrwl/nx-console/issues/2262)) ([1731bc9](https://github.com/nrwl/nx-console/commit/1731bc907c7cada061a0815e448571868643e292))
* **intellij:** update version & fix pdv error ([#2267](https://github.com/nrwl/nx-console/issues/2267)) ([1f13b8b](https://github.com/nrwl/nx-console/commit/1f13b8b1654c3cf91b78a5d86e737c9862528e62))
* reduce number of exceptions & optimize package imports ([#2266](https://github.com/nrwl/nx-console/issues/2266)) ([67a4721](https://github.com/nrwl/nx-console/commit/67a4721a1b1cfca9f111bc72833460672ba67294))

# [18.28.0](https://github.com/nrwl/nx-console/compare/vscode-v18.27.0...vscode-v18.28.0) (2024-09-20)


### Bug Fixes

* **vscode:** fix behaviour when only 1 generator is available & refactor old code ([#2242](https://github.com/nrwl/nx-console/issues/2242)) ([df7922e](https://github.com/nrwl/nx-console/commit/df7922e36d02145044ad005f7e6ed1fccdc2d9c9))


### Features

* refactor PDV to get data directly from nxls & apply in intellij ([#2254](https://github.com/nrwl/nx-console/issues/2254)) ([bf2ad34](https://github.com/nrwl/nx-console/commit/bf2ad340352391a937164ef011b754a647840368))

# [18.27.0](https://github.com/nrwl/nx-console/compare/vscode-v18.26.0...vscode-v18.27.0) (2024-09-10)


### Bug Fixes

* **vscode:** disable ts server plugin expansion of wildcard paths ([#2248](https://github.com/nrwl/nx-console/issues/2248)) ([f31cbbe](https://github.com/nrwl/nx-console/commit/f31cbbe076bf515e3234eedbff8263104aff52a2))
* **vscode:** make command titles consistently title case ([#2247](https://github.com/nrwl/nx-console/issues/2247)) ([d77bbbe](https://github.com/nrwl/nx-console/commit/d77bbbea740edc0641dae37bddbfbcc4140edec2))
* **vscode:** only show banner message until nx 17 & don't show project dropdown if no projects ([#2249](https://github.com/nrwl/nx-console/issues/2249)) ([5839d82](https://github.com/nrwl/nx-console/commit/5839d8289132cd8da3413b48d8476dd5ceb8106f))


### Features

* **vscode:** create nx cloud onboarding view  ([#2229](https://github.com/nrwl/nx-console/issues/2229)) ([3d75f0f](https://github.com/nrwl/nx-console/commit/3d75f0fc0d5e1e02653726ae0e76c95f3765776e))

# [18.26.0](https://github.com/nrwl/nx-console/compare/vscode-v18.25.1...vscode-v18.26.0) (2024-08-22)


### Features

* restructure telemetry and record errors ([#2236](https://github.com/nrwl/nx-console/issues/2236)) ([4dd6761](https://github.com/nrwl/nx-console/commit/4dd67616195cb3b12fc5fe7de3cf3dcd6fe879f0))

## [18.25.1](https://github.com/nrwl/nx-console/compare/vscode-v18.25.0...vscode-v18.25.1) (2024-08-12)


### Bug Fixes

* enable telemetry for workspace refreshes ([#2226](https://github.com/nrwl/nx-console/issues/2226)) ([b2eb5cd](https://github.com/nrwl/nx-console/commit/b2eb5cd133871f15d6d9a1cd31316334c416174b))
* **nxls:** dynamically read nx.json schema during schema setup ([#2221](https://github.com/nrwl/nx-console/issues/2221)) ([913e1ce](https://github.com/nrwl/nx-console/commit/913e1ce2e32e74c05c4ee3d5b1d8ee346a4831cf))
* pass expanded externalFiles to ts plugin for wildcard pattern paths ([#2224](https://github.com/nrwl/nx-console/issues/2224)) ([f0010fc](https://github.com/nrwl/nx-console/commit/f0010fc12b4a664d883ef027cde2ef9b2072cf86))

# [18.25.0](https://github.com/nrwl/nx-console/compare/vscode-v18.24.1...vscode-v18.25.0) (2024-07-18)


### Bug Fixes

* **nxls:** add project folder tree e2e test & only track children by dir ([#2199](https://github.com/nrwl/nx-console/issues/2199)) ([cdadda6](https://github.com/nrwl/nx-console/commit/cdadda67293ac3f87ca7d9cf762d433d01dcafb2))
* **nxls:** handle comments when parsing nx.json ([#2201](https://github.com/nrwl/nx-console/issues/2201)) ([261f208](https://github.com/nrwl/nx-console/commit/261f20897b66a99f74e49580ee52db0a9b3f7bfa))
* repair workspace-18 e2e & make sure .env is in sharedGlobals ([#2204](https://github.com/nrwl/nx-console/issues/2204)) ([a883e25](https://github.com/nrwl/nx-console/commit/a883e25af190bfb46b100a85b2980e154d50b940))
* use command cwd when running help command rather than project root ([#2200](https://github.com/nrwl/nx-console/issues/2200)) ([44b3c02](https://github.com/nrwl/nx-console/commit/44b3c024b0ccc70136d90ddacac9f1c3180cd45b))
* **vscode:** stop recreating graph webview and prevent focus on refresh ([#2195](https://github.com/nrwl/nx-console/issues/2195)) ([42df121](https://github.com/nrwl/nx-console/commit/42df12199ba5f09ee9f1a793f7f2010893453de9))


### Features

* add @nx/gradle ([#2154](https://github.com/nrwl/nx-console/issues/2154)) ([bbbc0bc](https://github.com/nrwl/nx-console/commit/bbbc0bcd927312ff6ee03dab893035b86f579891))
* group targets by target group in sidebar ([#2198](https://github.com/nrwl/nx-console/issues/2198)) ([c681f21](https://github.com/nrwl/nx-console/commit/c681f2128838f6fd131dd5cf801d96c9a750a8f8))
* **vscode:** add atomized target highlighting and info ([#2205](https://github.com/nrwl/nx-console/issues/2205)) ([f869aff](https://github.com/nrwl/nx-console/commit/f869aff4dcbd9eeeb5a97bd282c63cf8be1f08ef))

## [18.24.1](https://github.com/nrwl/nx-console/compare/vscode-v18.24.0...vscode-v18.24.1) (2024-06-27)


### Bug Fixes

* **nxls:** ignore .nx/workspace-data paths as a precaution ([#2190](https://github.com/nrwl/nx-console/issues/2190)) ([60c91ff](https://github.com/nrwl/nx-console/commit/60c91ff525807f992c53d036057fcd93996f0aa5))
* **vscode:** escape quotes in windows powershell ([#2189](https://github.com/nrwl/nx-console/issues/2189)) ([bb73bdf](https://github.com/nrwl/nx-console/commit/bb73bdf4f95e0f4b5cd7a71c7242719f5a618ba6))
* **vscode:** repair re/move commands ([#2193](https://github.com/nrwl/nx-console/issues/2193)) ([9d36a69](https://github.com/nrwl/nx-console/commit/9d36a69a6085911e61eebe17e9b4635770d2e6ba))

# [18.24.0](https://github.com/nrwl/nx-console/compare/vscode-v18.23.0...vscode-v18.24.0) (2024-06-25)


### Bug Fixes

*  Update nx-schema.json ([#2178](https://github.com/nrwl/nx-console/issues/2178)) ([04280c6](https://github.com/nrwl/nx-console/commit/04280c6519b634cf8e3081026ccba8258f80b92e))
* **vscode:** repair broken affected --graph command in sidebar ([#2185](https://github.com/nrwl/nx-console/issues/2185)) ([70941b2](https://github.com/nrwl/nx-console/commit/70941b2e19dfcdf2d37bdae9a225e15637632b3d))


### Features

* add nx connect action & vscode cloud pane ([#2186](https://github.com/nrwl/nx-console/issues/2186)) ([2326197](https://github.com/nrwl/nx-console/commit/232619729b1e4fa9c767fa7404449352f1fcff7d))
* **misc:** add support for run-help event ([#2183](https://github.com/nrwl/nx-console/issues/2183)) ([7beb868](https://github.com/nrwl/nx-console/commit/7beb868b043c9fc6552e5b6505d6e99afcafba8a))

# [18.23.0](https://github.com/nrwl/nx-console/compare/vscode-v18.22.0...vscode-v18.23.0) (2024-06-24)


### Features

* **vscode:** make generate ui default in sidebar ([#2182](https://github.com/nrwl/nx-console/issues/2182)) ([6867a18](https://github.com/nrwl/nx-console/commit/6867a183da4e92b9b76bc47adc9b662022177674))

# [18.22.0](https://github.com/nrwl/nx-console/compare/vscode-v18.21.4...vscode-v18.22.0) (2024-06-17)


### Bug Fixes

* `npmDependencies` returns dependencies from `.nx/installation/node_modules` if `node_modules` is a file ([#2152](https://github.com/nrwl/nx-console/issues/2152)) ([7eb76f9](https://github.com/nrwl/nx-console/commit/7eb76f9f24c5be9d1a49eff9edc043fba21e4c0a))
* **nxls:** load .env files in language server to make sure daemon client has access to them ([#2158](https://github.com/nrwl/nx-console/issues/2158)) ([3bb1514](https://github.com/nrwl/nx-console/commit/3bb151443bb46355f8cceca8fac5ef5624b8ab36))
* **vscode:** empty state sidebar text & add init action ([#2163](https://github.com/nrwl/nx-console/issues/2163)) ([e25b5da](https://github.com/nrwl/nx-console/commit/e25b5da988371900af4986931e44a9ecede73f9c))
* **vscode:** register workspace change listener in all cases ([#2162](https://github.com/nrwl/nx-console/issues/2162)) ([0bcf5ae](https://github.com/nrwl/nx-console/commit/0bcf5aefee70b9ebb0519beadfd2ba24ba853cf9))
* **vscode:** update nxls workspacepath when changing it using the action ([#2155](https://github.com/nrwl/nx-console/issues/2155)) ([0ff5cce](https://github.com/nrwl/nx-console/commit/0ff5cced0574ec8661d5070283e29e35e825c34a))


### Features

* **vscode:** add nx errors to problems view & update empty view in error state ([#2143](https://github.com/nrwl/nx-console/issues/2143)) ([cf389ed](https://github.com/nrwl/nx-console/commit/cf389edaf77bce5c6b4249df6331c4ab853f6330))
* **vscode:** merge run target & common commands views, refactorings and remove old generate ui ([#2166](https://github.com/nrwl/nx-console/issues/2166)) ([82d36fe](https://github.com/nrwl/nx-console/commit/82d36fee7c4f296e6fb52bc33f46329bb4bfb28e))

## [18.21.4](https://github.com/nrwl/nx-console/compare/vscode-v18.21.3...vscode-v18.21.4) (2024-05-27)


### Bug Fixes

* **nxls:** lazily import @parcel/watcher to avoid issues ([#2140](https://github.com/nrwl/nx-console/issues/2140)) ([8d68e8e](https://github.com/nrwl/nx-console/commit/8d68e8eba7f2aba4aa6e2832b028f251ec7f1c73))
* **nxls:** resolve delegated executor defintions correctly ([#2150](https://github.com/nrwl/nx-console/issues/2150)) ([609f5a4](https://github.com/nrwl/nx-console/commit/609f5a436dae2ac1d8fb7620cbab90398c4b128f))
* rework graph with reloading & errors & update nx ([#2123](https://github.com/nrwl/nx-console/issues/2123)) ([e39e8e5](https://github.com/nrwl/nx-console/commit/e39e8e5f19cfd258f955caf75505749a56443323))

## [18.21.3](https://github.com/nrwl/nx-console/compare/vscode-v18.21.2...vscode-v18.21.3) (2024-05-10)


### Bug Fixes

* **vscode:** adjust README with version compat info ([#2137](https://github.com/nrwl/nx-console/issues/2137)) ([237d5f9](https://github.com/nrwl/nx-console/commit/237d5f9e262e0b9d02306f21ddb79c8758f9561e))

## [18.21.2](https://github.com/nrwl/nx-console/compare/vscode-v18.21.1...vscode-v18.21.2) (2024-05-10)


### Bug Fixes

* **nxls:** filter all paths that include a cache folder ([#2128](https://github.com/nrwl/nx-console/issues/2128)) ([7acb20f](https://github.com/nrwl/nx-console/commit/7acb20fa5ad6e84944262de9b32c93cf4f009adc))
* **vscode:** adapt cli task logic to handle affected & other commands correctly ([#2127](https://github.com/nrwl/nx-console/issues/2127)) ([0cd7787](https://github.com/nrwl/nx-console/commit/0cd77871b80617a3ca649d3d344279ebf16e6cfa))
* **vscode:** enable command quickpicks to specify arbitrary options ([#2129](https://github.com/nrwl/nx-console/issues/2129)) ([21a2f8b](https://github.com/nrwl/nx-console/commit/21a2f8b3f23dfef4e7435d5b7643f866430745aa))

## [18.21.1](https://github.com/nrwl/nx-console/compare/vscode-v18.21.0...vscode-v18.21.1) (2024-05-06)


### Bug Fixes

* **nxls:** catch error while resetting daemon ([#2120](https://github.com/nrwl/nx-console/issues/2120)) ([8a179d7](https://github.com/nrwl/nx-console/commit/8a179d7a5b46d48e1c04a6ac1dfcd1d05a30d257))
* refactor graph integration to use partial graphs & handle errors ([#2117](https://github.com/nrwl/nx-console/issues/2117)) ([b2e4d6d](https://github.com/nrwl/nx-console/commit/b2e4d6de596d34215335a8aacaa4523e088ad39d))
* **vscode:** fix add dependency to show nx packages ([#2119](https://github.com/nrwl/nx-console/issues/2119)) ([d535923](https://github.com/nrwl/nx-console/commit/d5359231d6afcd25aad6f2ba158e71a78db56025))

# [18.21.0](https://github.com/nrwl/nx-console/compare/vscode-v18.20.0...vscode-v18.21.0) (2024-05-02)


### Bug Fixes

* import nx from the correct location when cwd is different than the workspace root ([#2109](https://github.com/nrwl/nx-console/issues/2109)) ([744c8be](https://github.com/nrwl/nx-console/commit/744c8be993f60e390dfba22d34bec98f23978222))


### Features

* enable partial graphs in nx console & fix bugs ([#2115](https://github.com/nrwl/nx-console/issues/2115)) ([72a544e](https://github.com/nrwl/nx-console/commit/72a544ed8fd900243b2b20448415fef357241b1e))

# [18.20.0](https://github.com/nrwl/nx-console/compare/vscode-v18.19.0...vscode-v18.20.0) (2024-04-24)


### Features

* nx reset & restart nxls on manual refresh ([#2097](https://github.com/nrwl/nx-console/issues/2097)) ([f34afd2](https://github.com/nrwl/nx-console/commit/f34afd24c66ca2d5790fd5d75c4938a1510450bb))


### Reverts

* add @nx/gradle ([#2100](https://github.com/nrwl/nx-console/issues/2100)) ([84d5100](https://github.com/nrwl/nx-console/commit/84d51003e33cd4e3c984a6359b6c2c68fd4dc4ce))

# [18.19.0](https://github.com/nrwl/nx-console/compare/vscode-v18.18.0...vscode-v18.19.0) (2024-04-10)


### Bug Fixes

* correctly load graph html without assuming node_modules ([#2083](https://github.com/nrwl/nx-console/issues/2083)) ([84b5fb7](https://github.com/nrwl/nx-console/commit/84b5fb7ed5f493a731a052fbaa323a38f4b9c329))
* fix path for windows for generate ui ([#2079](https://github.com/nrwl/nx-console/issues/2079)) ([e7f9f11](https://github.com/nrwl/nx-console/commit/e7f9f118a61a65eb9d2cea3984cf1e8736a7348c))
* **nxls:** ignore nx.json when processing source maps for now ([#2087](https://github.com/nrwl/nx-console/issues/2087)) ([5f70a55](https://github.com/nrwl/nx-console/commit/5f70a554dc6505ee7a70bf1be0940a7a924fee13))
* **nxls:** repair for nx 13 & write nx/workspace tests for all supported versions ([#2084](https://github.com/nrwl/nx-console/issues/2084)) ([cdc9ecd](https://github.com/nrwl/nx-console/commit/cdc9ecde05da52d145a4fcc903976b79fe6a18dd))
* **nxls:** respect nx.json generator defaults when showing generate ui ([#2077](https://github.com/nrwl/nx-console/issues/2077)) ([d5dc4f9](https://github.com/nrwl/nx-console/commit/d5dc4f9bd9febf2ab775c14bec8384259b2bc470))
* **vscode:** catch & surface errors during task creation better ([#2082](https://github.com/nrwl/nx-console/issues/2082)) ([eaf1c56](https://github.com/nrwl/nx-console/commit/eaf1c564b6afe24db426db3a10ce4693217e0281))


### Features

* add @nx/gradle ([#2078](https://github.com/nrwl/nx-console/issues/2078)) ([1198bda](https://github.com/nrwl/nx-console/commit/1198bda628e0661e81d92fa045c4580c0d1b2096))
* **nxls:** use daemon to watch files ([#2067](https://github.com/nrwl/nx-console/issues/2067)) ([4478927](https://github.com/nrwl/nx-console/commit/4478927e793187850c5b0e7976f348068a8bdfc4))

# [18.18.0](https://github.com/nrwl/nx-console/compare/vscode-v18.17.0...vscode-v18.18.0) (2024-03-25)


### Bug Fixes

* remove -W and --silent flag for yarn ([#2063](https://github.com/nrwl/nx-console/issues/2063)) ([fd5ab5b](https://github.com/nrwl/nx-console/commit/fd5ab5ba79cf8231aa64c8ddb89b690ac26684b1))


### Features

* add autocomplete to nx.json plugins  ([#2061](https://github.com/nrwl/nx-console/issues/2061)) ([afa9bb5](https://github.com/nrwl/nx-console/commit/afa9bb51de0750fe92c2f8eaea694124131953a3))
* add config file codelenses in intellij ([#2045](https://github.com/nrwl/nx-console/issues/2045)) ([894caab](https://github.com/nrwl/nx-console/commit/894caab9cfc4c816672cf8e27308e40906b76535))

# [18.17.0](https://github.com/nrwl/nx-console/compare/vscode-v18.16.0...vscode-v18.17.0) (2024-03-01)


### Bug Fixes

* add option to reset the daemon from the project detail view ([#2029](https://github.com/nrwl/nx-console/issues/2029)) ([4cec017](https://github.com/nrwl/nx-console/commit/4cec0170e205e083dc09e4c78152e0320aad02fd))
* don't mark generator options with x-prompt set as required anymore ([#2032](https://github.com/nrwl/nx-console/issues/2032)) ([d0a5a63](https://github.com/nrwl/nx-console/commit/d0a5a63ceba3bfc1bfc22e93d3d8bdcd369d3733))
* **intellij:** provide Angular config for Angular support in Nx workspaces ([ec50b72](https://github.com/nrwl/nx-console/commit/ec50b7207d6e999270cad08d2e5946fdc673f637))
* **nxls:** handle directories under a root project in getProjectByPath ([#2038](https://github.com/nrwl/nx-console/issues/2038)) ([3b94e1c](https://github.com/nrwl/nx-console/commit/3b94e1c2d05aa3ed0971285df9747a30fdde32a8))
* **nxls:** handle windows paths better when getting project by path ([#2025](https://github.com/nrwl/nx-console/issues/2025)) ([bf82749](https://github.com/nrwl/nx-console/commit/bf8274972d5ea612d41d4b872be904e04d0eb0aa))
* **nxls:** repair getting project by path for directories ([#2034](https://github.com/nrwl/nx-console/issues/2034)) ([b021549](https://github.com/nrwl/nx-console/commit/b02154983f0a1965a0a5319fcadc20cb83582362))


### Features

* go to executor definition ([#1962](https://github.com/nrwl/nx-console/issues/1962)) ([02c1923](https://github.com/nrwl/nx-console/commit/02c1923f569a3aceeb2f23bcfd639263afcbbc80))
* **vscode:** add all codelens to a settings toggle ([#2021](https://github.com/nrwl/nx-console/issues/2021)) ([b52ab82](https://github.com/nrwl/nx-console/commit/b52ab8250b3238daa22ed593e37cd4b5e9c52e08))

# [18.16.0](https://github.com/nrwl/nx-console/compare/vscode-v18.15.3...vscode-v18.16.0) (2024-02-09)


### Features

* **vscode:** add all codelens to a settings toggle ([#2021](https://github.com/nrwl/nx-console/issues/2021)) ([3bc39d7](https://github.com/nrwl/nx-console/commit/3bc39d7f5ec6142c8fef9d50c06da56300525cd4))

## [18.15.3](https://github.com/nrwl/nx-console/compare/vscode-v18.15.2...vscode-v18.15.3) (2024-02-02)


### Bug Fixes

* handle error states better, especially in intellij ([#2010](https://github.com/nrwl/nx-console/issues/2010)) ([9ca2fb4](https://github.com/nrwl/nx-console/commit/9ca2fb4c304e4e204ba87e1e88f8002b51a2a664))
* **vscode:** reload pdv by navigating with the router ([#2015](https://github.com/nrwl/nx-console/issues/2015)) ([5f43593](https://github.com/nrwl/nx-console/commit/5f43593aeddcb13c86bcf83d5340f41f131ddc22))
* **vscode:** set started to false on failure ([#2014](https://github.com/nrwl/nx-console/issues/2014)) ([ed1dcb1](https://github.com/nrwl/nx-console/commit/ed1dcb141638a2ee1892cd30486f1b07508d33e8))

## [18.15.2](https://github.com/nrwl/nx-console/compare/vscode-v18.15.1...vscode-v18.15.2) (2024-02-02)


### Bug Fixes

* **nxls:** attempt to reconfigure nxls after error with backoff ([094a17c](https://github.com/nrwl/nx-console/commit/094a17c0f07eafc94b84873f63d9dea9fbc0e892))

## [18.15.1](https://github.com/nrwl/nx-console/compare/vscode-v18.15.0...vscode-v18.15.1) (2024-02-01)


### Bug Fixes

* **nxls:** don't cache projectGraph & sourceMaps when recalculating the workspace config ([#2009](https://github.com/nrwl/nx-console/issues/2009)) ([c4da459](https://github.com/nrwl/nx-console/commit/c4da4597c40d352b208fc068b0c62e1e0d471354))

# [18.15.0](https://github.com/nrwl/nx-console/compare/vscode-v18.14.1...vscode-v18.15.0) (2024-02-01)


### Bug Fixes

* improve broken project graph error handling across the board ([#2007](https://github.com/nrwl/nx-console/issues/2007)) ([de6ba8c](https://github.com/nrwl/nx-console/commit/de6ba8c44c62c3fe6286cc1b1b36f0a0dea0c775))
* reset daemon client after all daemon requests are completed only ([#2006](https://github.com/nrwl/nx-console/issues/2006)) ([96d070a](https://github.com/nrwl/nx-console/commit/96d070ac8c7ad20be851dd88da628447d5b9a098))
* **vscode:** improve show nx project config action ([#2002](https://github.com/nrwl/nx-console/issues/2002)) ([c961909](https://github.com/nrwl/nx-console/commit/c96190937db231dc44e0eb1b636788c01fef1024))
* **vscode:** show pdv open to side button on all files that define a project ([#1999](https://github.com/nrwl/nx-console/issues/1999)) ([dafb57f](https://github.com/nrwl/nx-console/commit/dafb57f99d5515dc8fa80ff3b6766ffbd4afbac5))


### Features

* **vscode:** show codelenses in config files that create targets ([#2001](https://github.com/nrwl/nx-console/issues/2001)) ([1a940b9](https://github.com/nrwl/nx-console/commit/1a940b93fd70eaed63a32a4b8fa3d13c99b719fb))

## [18.14.1](https://github.com/nrwl/nx-console/compare/vscode-v18.14.0...vscode-v18.14.1) (2024-01-25)


### Bug Fixes

* **nxls:** enable target autocomplete for pcv3 projects ([#1992](https://github.com/nrwl/nx-console/issues/1992)) ([0b82c7f](https://github.com/nrwl/nx-console/commit/0b82c7f10a6d8728aecc2027d0f52a04c364cbc6))
* **vscode:** fix root package.json codelens without root project ([#1994](https://github.com/nrwl/nx-console/issues/1994)) ([b6dbfc8](https://github.com/nrwl/nx-console/commit/b6dbfc8a0291f348b32657245a7717abe9986110))
* **vscode:** sendRequest error on startup ([#1997](https://github.com/nrwl/nx-console/issues/1997)) ([8232a0a](https://github.com/nrwl/nx-console/commit/8232a0a25519298eeec6e149d591df1fff3038cb))

# [18.14.0](https://github.com/nrwl/nx-console/compare/vscode-v18.13.0...vscode-v18.14.0) (2024-01-22)


### Bug Fixes

* automatically repair graph server when it errors in vscode ([#1985](https://github.com/nrwl/nx-console/issues/1985)) ([5e679f3](https://github.com/nrwl/nx-console/commit/5e679f3f5cbb46d0e9705be05cb02f8ba6935349))
* **nxls:** dynamically import cache dir instead of using nx console version ([#1990](https://github.com/nrwl/nx-console/issues/1990)) ([356856d](https://github.com/nrwl/nx-console/commit/356856d94df0b68efddf115f260def0369f661a0))


### Features

* **vscode:** enable PDV integration by default ([#1991](https://github.com/nrwl/nx-console/issues/1991)) ([54b68a8](https://github.com/nrwl/nx-console/commit/54b68a8a61bd191d2f6e49a578264de13d1b6f13))
* **vscode:** open pdv at target ([#1982](https://github.com/nrwl/nx-console/issues/1982)) ([1b3363f](https://github.com/nrwl/nx-console/commit/1b3363fbb164db90b9ebc989d2882030d5bf00ff))
* **vscode:** Sort target names alphabetically ([#1963](https://github.com/nrwl/nx-console/issues/1963)) ([a12155f](https://github.com/nrwl/nx-console/commit/a12155f16e0d17b77936f656c293a39c57c7c13a))

# [18.13.0](https://github.com/nrwl/nx-console/compare/vscode-v18.12.0...vscode-v18.13.0) (2024-01-18)


### Bug Fixes

* **vscode:** make sure root font size is set correctly ([#1980](https://github.com/nrwl/nx-console/issues/1980)) ([865b19b](https://github.com/nrwl/nx-console/commit/865b19b2c74a791adef97da826fc8c8e707859aa))


### Features

* **vscode:** move project details inline display to codelens ([#1981](https://github.com/nrwl/nx-console/issues/1981)) ([e1aa36c](https://github.com/nrwl/nx-console/commit/e1aa36c6ae78e0ddc51ed616ce1a404bc83fb72f))

# [18.12.0](https://github.com/nrwl/nx-console/compare/vscode-v18.11.1...vscode-v18.12.0) (2024-01-12)


### Features

* add project details preview ([#1957](https://github.com/nrwl/nx-console/issues/1957)) ([0ded9b2](https://github.com/nrwl/nx-console/commit/0ded9b2b36e62465d9d6139e15385002cc06eac4))
* **intellij:** exclude .nx folder from js/ts service ([#1976](https://github.com/nrwl/nx-console/issues/1976)) ([5ddd65e](https://github.com/nrwl/nx-console/commit/5ddd65e068ecc015469efee1fc1ec78e0628ef65))
* modify cwd handling with breadcrumb component ([#1974](https://github.com/nrwl/nx-console/issues/1974)) ([4b6a81f](https://github.com/nrwl/nx-console/commit/4b6a81f1305cd4f3004882e7357b9b99350640b2))

## [18.11.1](https://github.com/nrwl/nx-console/compare/vscode-v18.11.0...vscode-v18.11.1) (2024-01-05)


### Bug Fixes

* **nxls:** trigger reload on tsconfig.base.json change ([#1972](https://github.com/nrwl/nx-console/issues/1972)) ([a6213ed](https://github.com/nrwl/nx-console/commit/a6213eda1650e7bccb453e701086382695e1ff83))
* repair as-provided prefilling ([#1973](https://github.com/nrwl/nx-console/issues/1973)) ([1ba7e05](https://github.com/nrwl/nx-console/commit/1ba7e05ea7a0abb9b5e135c77594bb2c3f622743))

# [18.11.0](https://github.com/nrwl/nx-console/compare/vscode-v18.10.1...vscode-v18.11.0) (2024-01-02)


### Bug Fixes

* distinguish more cases when prefilling ([#1935](https://github.com/nrwl/nx-console/issues/1935)) ([3760f2b](https://github.com/nrwl/nx-console/commit/3760f2b255f5c56619b6bcd6231f937d5ec7d596))
* **generate-ui:** show fewer options instead of show less options ([#1951](https://github.com/nrwl/nx-console/issues/1951)) ([f58de30](https://github.com/nrwl/nx-console/commit/f58de3010ec6a74fc670b88c3327e38f257e6fd0))
* **nxls:** take default options into account when prefilling as-provided options ([#1943](https://github.com/nrwl/nx-console/issues/1943)) ([73662b2](https://github.com/nrwl/nx-console/commit/73662b2f496d1b4e52d9801f54ac0bc8d8cb95e6))
* stringify prompt items to avoid [object Object] ([#1934](https://github.com/nrwl/nx-console/issues/1934)) ([f2be598](https://github.com/nrwl/nx-console/commit/f2be598e98cfa94ad628812e4ed8986167be7e19))


### Features

* use nx native watcher & rework refreshing ([#1949](https://github.com/nrwl/nx-console/issues/1949)) ([8d8887d](https://github.com/nrwl/nx-console/commit/8d8887da03b83263c5962d9fd064a254bee0a545))
* **vscode:** update (re)move commands to use quickpick instead of ui and fix prefilling ([#1931](https://github.com/nrwl/nx-console/issues/1931)) ([2637fc3](https://github.com/nrwl/nx-console/commit/2637fc30e43a396fbb4e366389e7c79a90f7dc25))

## [18.10.1](https://github.com/nrwl/nx-console/compare/vscode-v18.10.0...vscode-v18.10.1) (2023-11-06)


### Bug Fixes

* **repo): Revert "chore(repo:** update nx to 17.0.0-rc.3 ([#1913](https://github.com/nrwl/nx-console/issues/1913))" ([#1926](https://github.com/nrwl/nx-console/issues/1926)) ([4a178b0](https://github.com/nrwl/nx-console/commit/4a178b0fb9a9d1a134ceefe3d1505fd67410437f))

# [18.10.0](https://github.com/nrwl/nx-console/compare/vscode-v18.9.0...vscode-v18.10.0) (2023-11-06)


### Bug Fixes

* **nxls:** hide special case nx-release-publish target until generic handling is available ([#1915](https://github.com/nrwl/nx-console/issues/1915)) ([22b4d85](https://github.com/nrwl/nx-console/commit/22b4d858a3b55896598cdff2ee7e5a2eef0c8bc7))
* revert don't process targets with hidden property ([#1897](https://github.com/nrwl/nx-console/issues/1897)) ([#1916](https://github.com/nrwl/nx-console/issues/1916)) ([7449ecb](https://github.com/nrwl/nx-console/commit/7449ecbc971b76c31fb5a54b2f4ddf5f0619468a))
* **vscode:** handle missing node_module states more gracefully ([#1918](https://github.com/nrwl/nx-console/issues/1918)) ([8351e65](https://github.com/nrwl/nx-console/commit/8351e655684292f7f13d2270c2ad86a7ff6965fb))
* **vscode:** handle new nx cloud access token format in v17 ([#1908](https://github.com/nrwl/nx-console/issues/1908)) ([2aa6da1](https://github.com/nrwl/nx-console/commit/2aa6da1553fb7dc0e805571da6201ae24b6bef7e))
* **vscode:** make sure to forward args to nxls so we can run with debug configuration ([#1910](https://github.com/nrwl/nx-console/issues/1910)) ([f2a5c25](https://github.com/nrwl/nx-console/commit/f2a5c25da4e1b521d8c3530eee38579bc20ed149))


### Features

* disable cloud integration ([#1921](https://github.com/nrwl/nx-console/issues/1921)) ([7728fe2](https://github.com/nrwl/nx-console/commit/7728fe2df5ec577daaf1c4a2a18448feb1ef1aeb))
* **vscode:** show node version loaded by vscode on startup ([#1909](https://github.com/nrwl/nx-console/issues/1909)) ([5f14b7e](https://github.com/nrwl/nx-console/commit/5f14b7ec358a857d9071170e96fbaea8640eec14))

# [18.9.0](https://github.com/nrwl/nx-console/compare/vscode-v18.8.1...vscode-v18.9.0) (2023-10-17)


### Bug Fixes

* normalize windows path ([#1907](https://github.com/nrwl/nx-console/issues/1907)) ([7d3d959](https://github.com/nrwl/nx-console/commit/7d3d95907ed9f27db6a329edf69137e43cfd91d5))


### Features

* **generate-ui:** add cwd handling & prefilling ([#1904](https://github.com/nrwl/nx-console/issues/1904)) ([3fcf304](https://github.com/nrwl/nx-console/commit/3fcf304e862ffafcbcf22ee882d3ff2ebef44394))
* **nxls:** don't process targets with hidden property ([#1897](https://github.com/nrwl/nx-console/issues/1897)) ([e55e3a8](https://github.com/nrwl/nx-console/commit/e55e3a8231eb51858e26eea7c1057b03159592d6))
* **vscode:** add show affected graph action & fix graph zooming ([#1883](https://github.com/nrwl/nx-console/issues/1883)) ([86f06b3](https://github.com/nrwl/nx-console/commit/86f06b3cb6a36eea22403ca516b43d76195752f8))

## [18.8.1](https://github.com/nrwl/nx-console/compare/vscode-v18.8.0...vscode-v18.8.1) (2023-09-12)


### Bug Fixes

* **generate-ui:** adjust generate ui styling for large fonts ([#1878](https://github.com/nrwl/nx-console/issues/1878)) ([fca0e26](https://github.com/nrwl/nx-console/commit/fca0e262882f9c589f72ea16d776d777775db781))
* take nx.json projectNameAndRootFormat config into account in generate ui ([#1880](https://github.com/nrwl/nx-console/issues/1880)) ([9d4a0c1](https://github.com/nrwl/nx-console/commit/9d4a0c14c3d65e37772964f9b5b822d3d0fdffa7))
* **vscode:** fix configuration codelens running the correct config ([#1877](https://github.com/nrwl/nx-console/issues/1877)) ([6463c66](https://github.com/nrwl/nx-console/commit/6463c6661709ee6cf22a6149c529504cc674afe8))

# [18.8.0](https://github.com/nrwl/nx-console/compare/vscode-v18.7.0...vscode-v18.8.0) (2023-09-05)


### Bug Fixes

* move projectNameAndRootFormat message to banner from tooltip ([#1873](https://github.com/nrwl/nx-console/issues/1873)) ([6b328fe](https://github.com/nrwl/nx-console/commit/6b328fe46b01497619f6e3502dde06cb69ec77b8))
* **vscode:** expand root node if project view contains only single project ([#1874](https://github.com/nrwl/nx-console/issues/1874)) ([8e980fb](https://github.com/nrwl/nx-console/commit/8e980fb9163f1833867eec87ab2220df17387036))


### Features

* **generate-ui:** filter deprecated fields & move functionality to plugins ([#1862](https://github.com/nrwl/nx-console/issues/1862)) ([63225f0](https://github.com/nrwl/nx-console/commit/63225f0a8d6674a7fb499e22022202b45ff97d08))
* write internal git clean startup message plugin & display startup messages in intellij ([#1869](https://github.com/nrwl/nx-console/issues/1869)) ([339db9b](https://github.com/nrwl/nx-console/commit/339db9b7c770b527e59c7c742d17c5ab13d95748))

# [18.7.0](https://github.com/nrwl/nx-console/compare/vscode-v18.6.0...vscode-v18.7.0) (2023-08-25)


### Bug Fixes

* **generate-ui:** make sure arguments with spaces or quotes are handled correctly ([#1853](https://github.com/nrwl/nx-console/issues/1853)) ([61e4384](https://github.com/nrwl/nx-console/commit/61e4384c57b7c7ad1ac9871e9d4f7c9deea87c08))
* **intellij:** update deprecated apis ([#1859](https://github.com/nrwl/nx-console/issues/1859)) ([99b8b96](https://github.com/nrwl/nx-console/commit/99b8b962d4e07d4060ddf5a10069aba8443717a9))
* **nxls:** use ignore globs from nx for the file watcher ([#1865](https://github.com/nrwl/nx-console/issues/1865)) ([8b3fa1d](https://github.com/nrwl/nx-console/commit/8b3fa1d65404b4b508d63584959650976208bc73))


### Features

* move plugins to lsp & write internal projectRootAndNameFormat plugin ([#1860](https://github.com/nrwl/nx-console/issues/1860)) ([d0f8852](https://github.com/nrwl/nx-console/commit/d0f8852b12de3c1a64e2c98177925deb280d9c85))
* **vscode:** add more run task context menu to project view ([#1855](https://github.com/nrwl/nx-console/issues/1855)) ([15e2615](https://github.com/nrwl/nx-console/commit/15e261522402a24aee8e037eb0225e111aeca844))

# [18.6.0](https://github.com/nrwl/nx-console/compare/vscode-v18.5.0...vscode-v18.6.0) (2023-08-02)


### Bug Fixes

* add better empty states to project view/toolwindow ([#1833](https://github.com/nrwl/nx-console/issues/1833)) ([de3e03d](https://github.com/nrwl/nx-console/commit/de3e03d8d000a3b1ad2763166e2b867c1bcabed9))
* enable gutter actions in project.json without name & refactor project by path request ([#1822](https://github.com/nrwl/nx-console/issues/1822)) ([43632e2](https://github.com/nrwl/nx-console/commit/43632e2958e0c5ff7852d57320bfdf98550c7132))
* **generate-ui:** add hover tooltip to copy button ([#1836](https://github.com/nrwl/nx-console/issues/1836)) ([aa24925](https://github.com/nrwl/nx-console/commit/aa24925451d82022b9014ac53df177c6ab21dd03))
* **generate-ui:** filter autocomplete options using .includes instead of .startsWith ([#1825](https://github.com/nrwl/nx-console/issues/1825)) ([e34a3f2](https://github.com/nrwl/nx-console/commit/e34a3f258a172397373330e71295422617273482))
* **generate-ui:** refactor field list & show greyed out hidden options ([#1838](https://github.com/nrwl/nx-console/issues/1838)) ([43f51ab](https://github.com/nrwl/nx-console/commit/43f51ab26c68824ffb8aa53bfce4dc00ea336d5b))
* make scrollbar look more native in intellij ([#1837](https://github.com/nrwl/nx-console/issues/1837)) ([102c726](https://github.com/nrwl/nx-console/commit/102c7263d39e17a6a11421029a54c614f308782a))
* **nxls:** increase watcher debounce to avoid daemon timing issues ([#1829](https://github.com/nrwl/nx-console/issues/1829)) ([5d5eae9](https://github.com/nrwl/nx-console/commit/5d5eae9e4cfa0c1a10828fabc6df206aa09ba9eb))
* repair generator context passing in intellij ([#1821](https://github.com/nrwl/nx-console/issues/1821)) ([6e373b9](https://github.com/nrwl/nx-console/commit/6e373b9ec0720692992a971266a9faeb80e83b41))
* sort project tree view / nx toolwindow ([#1830](https://github.com/nrwl/nx-console/issues/1830)) ([e077225](https://github.com/nrwl/nx-console/commit/e0772256bdb3af7240d4dee39928dffc70e0aa72))
* **vscode:** don't register vscode things twice & remove outdated stuff from main.ts ([#1848](https://github.com/nrwl/nx-console/issues/1848)) ([0bd8fa1](https://github.com/nrwl/nx-console/commit/0bd8fa1322ee87612c0b77fa0e0eba2cf4424cbb))
* **vscode:** enhance graph/task focus commands to fallback to manual selection ([#1842](https://github.com/nrwl/nx-console/issues/1842)) ([685bc30](https://github.com/nrwl/nx-console/commit/685bc3001eaee67158723c7bb098dc34ee77edde))


### Features

* consume new graph events to open files in the ide ([#1823](https://github.com/nrwl/nx-console/issues/1823)) ([5049c76](https://github.com/nrwl/nx-console/commit/5049c76359733b162806249b7747449226093b21))
* enable opening project configuration files & running tasks from graph ([#1841](https://github.com/nrwl/nx-console/issues/1841)) ([b2e3785](https://github.com/nrwl/nx-console/commit/b2e378564f8d674b93130b4e9bff958828e7dfa6))
* refactor & add folder view to jetbrains toolwindow ([#1814](https://github.com/nrwl/nx-console/issues/1814)) ([70a9c88](https://github.com/nrwl/nx-console/commit/70a9c88fb60fc1e0dcaf1811463adb60f7151037))
* show keyboard shortcut indicator in generate ui search bar ([#1832](https://github.com/nrwl/nx-console/issues/1832)) ([6e80a69](https://github.com/nrwl/nx-console/commit/6e80a691e1d081a2ba6ad53f012fcfa0c874156c))
* support yarn pnp ([#1850](https://github.com/nrwl/nx-console/issues/1850)) ([f5787a3](https://github.com/nrwl/nx-console/commit/f5787a32b384b4ab19d1c2e6774a92b28e2c7e3b))
* **vscode:** add generate/move/remove to project view context menu ([#1846](https://github.com/nrwl/nx-console/issues/1846)) ([d02492f](https://github.com/nrwl/nx-console/commit/d02492f6f4135902e918bbcd2904a85056b0c8ef))
* **vscode:** refactoring & add synthetic target codelenses ([#1840](https://github.com/nrwl/nx-console/issues/1840)) ([9cd18a9](https://github.com/nrwl/nx-console/commit/9cd18a9aafc61ab9575add4e1abbf40a6c7e2942))

# [18.5.0](https://github.com/nrwl/nx-console/compare/vscode-v18.4.0...vscode-v18.5.0) (2023-07-10)


### Bug Fixes

* **vscode:** use target to determine real list of projects ([#1813](https://github.com/nrwl/nx-console/issues/1813)) ([1b45b0b](https://github.com/nrwl/nx-console/commit/1b45b0b326f0eb8e2d2d7233c6ad49eb1aaa82ce))


### Features

* add autocomplete field and use it for options with many items ([#1807](https://github.com/nrwl/nx-console/issues/1807)) ([777a897](https://github.com/nrwl/nx-console/commit/777a89761c22b98a866bc2ea5c50de57f402e041))

# [18.4.0](https://github.com/nrwl/nx-console/compare/vscode-v18.3.0...vscode-v18.4.0) (2023-07-04)


### Bug Fixes

* adjust generator autofilling ([#1792](https://github.com/nrwl/nx-console/issues/1792)) ([81663df](https://github.com/nrwl/nx-console/commit/81663df9a634c4ce0223bc8dc7be5988583a4f29))
* **generate-ui:** re-open new gen ui when using the command twice ([#1798](https://github.com/nrwl/nx-console/issues/1798)) ([0b53a3a](https://github.com/nrwl/nx-console/commit/0b53a3a8595e1614b13a92e00145a98fb8f2b190))
* make sure nx.run works in all contexts ([#1795](https://github.com/nrwl/nx-console/issues/1795)) ([a3b84e4](https://github.com/nrwl/nx-console/commit/a3b84e4fdde92979ba877a63a40ae1af4a2fcdd0))
* revert ts version because it broke old generate ui ([#1796](https://github.com/nrwl/nx-console/issues/1796)) ([916aa4c](https://github.com/nrwl/nx-console/commit/916aa4ca1634319baae3262437bd2956d6ea0702))
* update @parcel/watcher for more prebuilt binaries ([#1803](https://github.com/nrwl/nx-console/issues/1803)) ([4909b24](https://github.com/nrwl/nx-console/commit/4909b24fa5629cc659afa681e0fbbf0541a73a33))


### Features

* focus field element after scrolling to it from option nav ([#1793](https://github.com/nrwl/nx-console/issues/1793)) ([740fc60](https://github.com/nrwl/nx-console/commit/740fc601dbe97c96d5ce3b1a93f1110ee7dd2f5a))
* **generate-ui:** add copy to clipboard button to generate ui ([#1799](https://github.com/nrwl/nx-console/issues/1799)) ([9b8a20d](https://github.com/nrwl/nx-console/commit/9b8a20ded0c508e9cb79468ad9fced5fc3fb0976))
* **vscode:** rearrange empty state for nx cloud view to make button more prominent ([#1797](https://github.com/nrwl/nx-console/issues/1797)) ([0405aa7](https://github.com/nrwl/nx-console/commit/0405aa7eb7e44fcf2961343b7b9d3b928490ff2c))

# [18.3.0](https://github.com/nrwl/nx-console/compare/vscode-v18.2.1...vscode-v18.3.0) (2023-06-28)


### Bug Fixes

* adjust font size and some spacing ([#1781](https://github.com/nrwl/nx-console/issues/1781)) ([12c9eec](https://github.com/nrwl/nx-console/commit/12c9eec28a550819a8fc882f8b41921574e3370a))
* **nxls:** fix broken version comparison for file map ([#1785](https://github.com/nrwl/nx-console/issues/1785)) ([9af8155](https://github.com/nrwl/nx-console/commit/9af8155aaf3a5fe43ef28f91e4fe85a5136b641e))
* properly catch errors when reading package.json files ([#1786](https://github.com/nrwl/nx-console/issues/1786)) ([578aff9](https://github.com/nrwl/nx-console/commit/578aff9667711b01f5cd65abc8ccd54db3d73da5))
* remove faulty webpack config in old generate ui ([#1780](https://github.com/nrwl/nx-console/issues/1780)) ([34c3b13](https://github.com/nrwl/nx-console/commit/34c3b1322d02d8fdeb6267e776b1854c482e5fa8))
* **vscode:** fix cloud view connecting to staging ([#1784](https://github.com/nrwl/nx-console/issues/1784)) ([eded240](https://github.com/nrwl/nx-console/commit/eded240d9bec23572ccc06c0c32d29c3991c255d))


### Features

* add cypress tests & additional features to new generate ui ([#1770](https://github.com/nrwl/nx-console/issues/1770)) ([866a14a](https://github.com/nrwl/nx-console/commit/866a14a08ff5567ff5986ed19da2c843378fe943))
* add generator context & refactor large parts ([#1776](https://github.com/nrwl/nx-console/issues/1776)) ([5ff6f02](https://github.com/nrwl/nx-console/commit/5ff6f028e56a7d6957aeab52129265f597e0ed0d))
* enable new generate ui in re/move actions ([#1778](https://github.com/nrwl/nx-console/issues/1778)) ([fa56bc4](https://github.com/nrwl/nx-console/commit/fa56bc41c7a2e2abe0da71b954bebde9dd5d1a5b))
* fix styles after review and general fixes/improvements ([#1771](https://github.com/nrwl/nx-console/issues/1771)) ([70b3ded](https://github.com/nrwl/nx-console/commit/70b3ded361f40c33081994868bb15d64b9d1d3e0))
* further style & functionality improvements to new generate ui ([#1764](https://github.com/nrwl/nx-console/issues/1764)) ([a4bf156](https://github.com/nrwl/nx-console/commit/a4bf15610dbe7c303ce65043a190511e5167e45e))
* refactor nx cli commands, throw out deprecated or outdated stuff  & update nx ([#1777](https://github.com/nrwl/nx-console/issues/1777)) ([e9f6149](https://github.com/nrwl/nx-console/commit/e9f6149c084190446518f717f6d1982df386fff3))
* register vscode toolkit webcomponents through code ([#1774](https://github.com/nrwl/nx-console/issues/1774)) ([c18b5b8](https://github.com/nrwl/nx-console/commit/c18b5b863f1ab288d110221cb5e9d2ec58269c32))
* toggle new generate ui to be enabled by default 🎉 ([#1787](https://github.com/nrwl/nx-console/issues/1787)) ([e6f9cc9](https://github.com/nrwl/nx-console/commit/e6f9cc92ff394bccec72af00740816dba1d96be7))
* update generate ui with improved array & multiselect fields ([#1760](https://github.com/nrwl/nx-console/issues/1760)) ([4f95c96](https://github.com/nrwl/nx-console/commit/4f95c96051c643c707df96308aecf48cbf345b47))
* **vscode:** add command to clear nx cloud session storage manually ([#1769](https://github.com/nrwl/nx-console/issues/1769)) ([e390423](https://github.com/nrwl/nx-console/commit/e39042358f246ee8d7d78b636c7c49c5832b8ce7))

## [18.2.1](https://github.com/nrwl/nx-console/compare/vscode-v18.2.0...vscode-v18.2.1) (2023-06-09)


### Bug Fixes

* **nxls:** change projectFileMap loading between 16.3 patch versions ([#1759](https://github.com/nrwl/nx-console/issues/1759)) ([5b0657a](https://github.com/nrwl/nx-console/commit/5b0657a920890604cae9df54e0d69133181e8666))

# [18.2.0](https://github.com/nrwl/nx-console/compare/vscode-v18.1.2...vscode-v18.2.0) (2023-06-08)


### Bug Fixes

* repair task graph bugs caused by faulty navigation ([#1755](https://github.com/nrwl/nx-console/issues/1755)) ([0e6637c](https://github.com/nrwl/nx-console/commit/0e6637c8a808925d6ad92c1f1f2596ddc9af8444))
* **vscode:** repair generate ui docs link ([#1747](https://github.com/nrwl/nx-console/issues/1747)) ([868080e](https://github.com/nrwl/nx-console/commit/868080e5fa7a31ad2c65e3c42e28279b99c5ee9d))


### Features

* **generate-ui:** rewrite generate ui and display it via feature toggle ([#1749](https://github.com/nrwl/nx-console/issues/1749)) ([19d1dd5](https://github.com/nrwl/nx-console/commit/19d1dd5c54e2d0fbefd675e8c1a115aaf13a4f47))
* improve generate ui v2 ([#1756](https://github.com/nrwl/nx-console/issues/1756)) ([67f77bd](https://github.com/nrwl/nx-console/commit/67f77bdf43225e753bff165b49b12ac3598f3ef1))
* support nx 16.3 ([#1752](https://github.com/nrwl/nx-console/issues/1752)) ([19d78fb](https://github.com/nrwl/nx-console/commit/19d78fb9394fe23beb16afae7f02ed6786433041))

## [18.1.2](https://github.com/nrwl/nx-console/compare/vscode-v18.1.1...vscode-v18.1.2) (2023-05-23)


### Bug Fixes

* **vscode:** handle [@nx](https://github.com/nx) and [@nrwl](https://github.com/nrwl) cases in add dependency feature ([#1711](https://github.com/nrwl/nx-console/issues/1711)) ([81b6fd9](https://github.com/nrwl/nx-console/commit/81b6fd9bdcf5d1e0f492027ad1d4645301f8bfce))
* **vscode:** repair automatically detecting and running nx tasks ([#1709](https://github.com/nrwl/nx-console/issues/1709)) ([d16ce48](https://github.com/nrwl/nx-console/commit/d16ce48d0f21911933f99d2bc2473a4602260419))
* **vscode:** repair opening help and feedback links ([#1746](https://github.com/nrwl/nx-console/issues/1746)) ([cc38746](https://github.com/nrwl/nx-console/commit/cc38746fa4bfd90bbfa2ca8e47bd739a61b26359))

## [18.1.1](https://github.com/nrwl/nx-console/compare/vscode-v18.1.0...vscode-v18.1.1) (2023-05-01)


### Bug Fixes

* **vscode:** get projects properly in cli-task-command ([#1715](https://github.com/nrwl/nx-console/issues/1715)) ([a08c751](https://github.com/nrwl/nx-console/commit/a08c751ef0420fb723ca012824ff22a5eafabcf9))

# [18.1.0](https://github.com/nrwl/nx-console/compare/vscode-v18.0.4...vscode-v18.1.0) (2023-04-28)


### Bug Fixes

* **generate-ui:** correctly serialize options with array default values ([#1690](https://github.com/nrwl/nx-console/issues/1690)) ([f21508c](https://github.com/nrwl/nx-console/commit/f21508cd2cd7da43be03881778810736971e13fd))
* **generate-ui:** handle multiple default values for generate ui ([#1684](https://github.com/nrwl/nx-console/issues/1684)) ([2529b56](https://github.com/nrwl/nx-console/commit/2529b563137ae7f732e77a09191d9582463e582f))
* **nxls:** handle the daemon output so that stdout isnt polluted ([#1698](https://github.com/nrwl/nx-console/issues/1698)) ([cf3f93f](https://github.com/nrwl/nx-console/commit/cf3f93f075bb1b654ff991d7b3ec891118126b0e))
* **nxls:** support running under node 14 ([#1679](https://github.com/nrwl/nx-console/issues/1679)) ([a6e91a5](https://github.com/nrwl/nx-console/commit/a6e91a53a0a78a26f555967e8a847606d13ba408))
* **nxls:** use the schema.json for the workspace generator collection path ([#1691](https://github.com/nrwl/nx-console/issues/1691)) ([10574c1](https://github.com/nrwl/nx-console/commit/10574c174742268ebbf755e39b5aec0c381de42e))
* serialize output messages with payloadType ([#1687](https://github.com/nrwl/nx-console/issues/1687)) ([055477f](https://github.com/nrwl/nx-console/commit/055477f00023828ecf410e08848b9e50ffd88dbd))
* **vscode:** enable authorizing with nx cloud in codespaces ([#1697](https://github.com/nrwl/nx-console/issues/1697)) ([2425596](https://github.com/nrwl/nx-console/commit/242559644c0532f582fbae272579336348caa6c2))
* **vscode:** read cloud runner information correctly for v16 ([#1695](https://github.com/nrwl/nx-console/issues/1695)) ([59db061](https://github.com/nrwl/nx-console/commit/59db0615ddcdecfbf76417109b6e5f422c7831e2))
* **vscode:** remove obsolete commands ([#1693](https://github.com/nrwl/nx-console/issues/1693)) ([92bfe1e](https://github.com/nrwl/nx-console/commit/92bfe1e621e92f22a4f2d1c37bfbbbde20e4ce76))
* **vscode:** run target filters projects ([#1692](https://github.com/nrwl/nx-console/issues/1692)) ([c6c4f1e](https://github.com/nrwl/nx-console/commit/c6c4f1e6794771386e733bcf90a27c498730f38f))
* **vscode:** use correct workspace path when adding dependency ([#1689](https://github.com/nrwl/nx-console/issues/1689)) ([6458664](https://github.com/nrwl/nx-console/commit/64586644a2dbaea484e62aa4f3702a0873be2059))
* **vscode:** use more robust project:target syntax for running tasks ([#1694](https://github.com/nrwl/nx-console/issues/1694)) ([1c48cb1](https://github.com/nrwl/nx-console/commit/1c48cb11725786c90adb7b84479f478e35041ba0))


### Features

* add hover with links to nx.dev for executors ([#1708](https://github.com/nrwl/nx-console/issues/1708)) ([eab101c](https://github.com/nrwl/nx-console/commit/eab101c7a8daa2a3309a2072fce76e85cfec5442))
* **nxls:** update dependsOn and namedInputs completion for nx 16 ([#1701](https://github.com/nrwl/nx-console/issues/1701)) ([8eb8b1c](https://github.com/nrwl/nx-console/commit/8eb8b1c5ad962e759fef3428e98222aebe2101ec))
* support nx 16 ([#1686](https://github.com/nrwl/nx-console/issues/1686)) ([0126e58](https://github.com/nrwl/nx-console/commit/0126e58fccf54a765256c86e48e323659b4cb2fa))

## [18.0.4](https://github.com/nrwl/nx-console/compare/vscode-v18.0.3...vscode-v18.0.4) (2023-04-13)


### Bug Fixes

* **vscode:** fix readme, include license ([#1676](https://github.com/nrwl/nx-console/issues/1676)) ([ebbef65](https://github.com/nrwl/nx-console/commit/ebbef65124973527d6669f942087476775a9786c))

## [18.0.3](https://github.com/nrwl/nx-console/compare/vscode-v18.0.2...vscode-v18.0.3) (2023-04-11)


### Bug Fixes

* **vscode:** remove obsolete commands ([#1672](https://github.com/nrwl/nx-console/issues/1672)) ([45af4f7](https://github.com/nrwl/nx-console/commit/45af4f709209636bb35f9c3096b853d1bba14868))
* **vscode:** show select workspace in non-workspaces ([#1671](https://github.com/nrwl/nx-console/issues/1671)) ([b201168](https://github.com/nrwl/nx-console/commit/b201168939801c03e39d600d135685b7a02053f2))

## [18.0.2](https://github.com/nrwl/nx-console/compare/vscode-v18.0.1...vscode-v18.0.2) (2023-04-06)


### Bug Fixes

* **vscode:** add graph directory to local resource roots ([#1664](https://github.com/nrwl/nx-console/issues/1664)) ([85f713e](https://github.com/nrwl/nx-console/commit/85f713eb1a36b7e8f9ae346a52a8cf6122fa1015))
* **vscode:** use extension mode to determine production ([a74744e](https://github.com/nrwl/nx-console/commit/a74744e70dbc15078e235cf4db4d8cd5a7af8ad4))

## [18.0.1](https://github.com/nrwl/nx-console/compare/vscode-v18.0.0...vscode-v18.0.1) (2023-04-06)


### Bug Fixes

* **vscode:** use extension mode to determine production ([fe3ee51](https://github.com/nrwl/nx-console/commit/fe3ee5151e04537a1f01f8691b7ccf76575307d5))

# [18.0.0](https://github.com/nrwl/nx-console/compare/vscode-v17.32.0...vscode-v18.0.0) (2023-04-06)


### Bug Fixes

* **generate-ui:** ensure checkboxes have correctly centered checkmarks ([#1604](https://github.com/nrwl/nx-console/issues/1604)) ([5e4180e](https://github.com/nrwl/nx-console/commit/5e4180e1091391587506263da18b11fdabd23b7b))
* handle nxls startup errors ([#1649](https://github.com/nrwl/nx-console/issues/1649)) ([da9ed6e](https://github.com/nrwl/nx-console/commit/da9ed6e175908c603eb97024f0b5c4a33fe1f0a2))
* **nxls:** debounce @parcel/watcher to avoid race conditions ([#1620](https://github.com/nrwl/nx-console/issues/1620)) ([96f91fa](https://github.com/nrwl/nx-console/commit/96f91faf36ee2b4965e944a7b60333fb38cc175b))
* **nxls:** distinguish projects that are substrings of one another ([#1610](https://github.com/nrwl/nx-console/issues/1610)) ([a404c00](https://github.com/nrwl/nx-console/commit/a404c000ccd6597f3b1a1d6266ea4d8aa73aee48))
* **nxls:** do not output exec to stdio ([#1644](https://github.com/nrwl/nx-console/issues/1644) ([f0f112c](https://github.com/nrwl/nx-console/commit/f0f112c5a5b04fbf659d36655fe17cd02b5c462c))
* **nxls:** handle daemon better ([#1615](https://github.com/nrwl/nx-console/issues/1615)) ([0216d0c](https://github.com/nrwl/nx-console/commit/0216d0cf12c962765a060dee793bcf368eedc87f))
* **nxls:** temporarily disable daemon ([0570f53](https://github.com/nrwl/nx-console/commit/0570f53f698fc138fb854b575841fba289992266))
* **nxls:** use `workspaceFolders` before `rootUri` for better Windows path compatibility ([#1639](https://github.com/nrwl/nx-console/issues/1639)) ([2a5a07e](https://github.com/nrwl/nx-console/commit/2a5a07e07c989e49dc79d915ab17521177859781))
* **vscode:** clarify angular cli deprecation message ([#1627](https://github.com/nrwl/nx-console/issues/1627)) ([078e4b5](https://github.com/nrwl/nx-console/commit/078e4b5f55a3b490d17353a5d556dcc31d97580f))
* **vscode:** handle angular with nx case correctly ([#1628](https://github.com/nrwl/nx-console/issues/1628)) ([5499cb2](https://github.com/nrwl/nx-console/commit/5499cb25b35e0e3bca54b5940be1a17db08b8e65))


### Features

* **nxls:** provide generator aliases via nxls ([#1598](https://github.com/nrwl/nx-console/issues/1598)) ([63f44ce](https://github.com/nrwl/nx-console/commit/63f44ce925613ea132808e81ac775e8a36d0f8a1))
* **nxls:** support executors in and from targetDefaults ([#1621](https://github.com/nrwl/nx-console/issues/1621)) ([1d0c263](https://github.com/nrwl/nx-console/commit/1d0c263da44a2613a36f6a3aa64d0a3d8ff5e9ee))
* remove angular cli compatibility ([#1575](https://github.com/nrwl/nx-console/issues/1575)) ([702e205](https://github.com/nrwl/nx-console/commit/702e205d5629059ad5fb5ca7c5d102d0cca0c4ce))
* **vscode:** add task graph support ([#1656](https://github.com/nrwl/nx-console/issues/1656)) ([66e50fe](https://github.com/nrwl/nx-console/commit/66e50fe89dd129909f898e628ef7807adda3562e))
* **vscode:** breaking change ([c160b5c](https://github.com/nrwl/nx-console/commit/c160b5cf0d6a1833126695ef71cf76420dc42548))
* **vscode:** move analytics to measurement protocol ([#1625](https://github.com/nrwl/nx-console/issues/1625)) ([fd0f64f](https://github.com/nrwl/nx-console/commit/fd0f64fb0dde190683192c9555adb1a55ac3caba))


### BREAKING CHANGES

* **vscode:** we removed angular-cli support

# Breaking Change
# [17.32.0](https://github.com/nrwl/nx-console/compare/vscode-v17.31.0...vscode-v17.32.0) (2023-03-02)


### Bug Fixes

* **generate-ui:** make sure the form is centered correctly on large screens ([#1568](https://github.com/nrwl/nx-console/issues/1568)) ([31b4930](https://github.com/nrwl/nx-console/commit/31b4930022a5699fa0422a60271350b999598af2))
* **generate-ui:** repair dry-run button font color ([#1564](https://github.com/nrwl/nx-console/issues/1564)) ([29f87fe](https://github.com/nrwl/nx-console/commit/29f87fed22a8547715ce8113b9ada2ef3c6af20c))
* **nxls:** also check sourceRoot when getting project by path ([#1554](https://github.com/nrwl/nx-console/issues/1554)) ([65a5b09](https://github.com/nrwl/nx-console/commit/65a5b0928d9a4ff42cf71f0ec4abad156d2970cf))
* **nxls:** do not include workspace layout in directory context for generate calls ([#1577](https://github.com/nrwl/nx-console/issues/1577)) ([340c2a3](https://github.com/nrwl/nx-console/commit/340c2a3ead6f64a3ce34528915af716c543c8dd2))
* **nxls:** don't default appsDir and libsDir ([#1562](https://github.com/nrwl/nx-console/issues/1562)) ([e022c7c](https://github.com/nrwl/nx-console/commit/e022c7cffc9661a576978d9c82f1267b7c581d03))
* **nxls:** make passing generator optional when calculating generator context ([#1551](https://github.com/nrwl/nx-console/issues/1551)) ([3c4ff27](https://github.com/nrwl/nx-console/commit/3c4ff276ec70095156cd46fcccfdc347f95c696f))
* **nxls:** read node_modules from encapsulated nx ([#1566](https://github.com/nrwl/nx-console/issues/1566)) ([7f5cdf2](https://github.com/nrwl/nx-console/commit/7f5cdf2e5e30579599d782b94015b84eb556d0d1))
* update nx-console 16x16 icon ([#1559](https://github.com/nrwl/nx-console/issues/1559)) ([304c441](https://github.com/nrwl/nx-console/commit/304c441adcaa877f6499127d8794f609bce35a2b))
* **vscode:** fix running (re)move from command prompt ([#1546](https://github.com/nrwl/nx-console/issues/1546)) ([28bde8b](https://github.com/nrwl/nx-console/commit/28bde8bbf99f99bf01fea5fa9473ce8d58547fd1))


### Features

* **nxls:** add support for encapsulated nx ([#1556](https://github.com/nrwl/nx-console/issues/1556)) ([0993c8a](https://github.com/nrwl/nx-console/commit/0993c8a1af6590a172dc4da3b55c191495d0516a))
* **vscode:** run commands with encapsulated nx ([#1557](https://github.com/nrwl/nx-console/issues/1557) ([c8e11ec](https://github.com/nrwl/nx-console/commit/c8e11ecd5daafaccdf2ea3cac4f79859df32a478))

# [17.31.0](https://github.com/nrwl/nx-console/compare/vscode-v17.30.1...vscode-v17.31.0) (2023-02-17)


### Bug Fixes

* **generate-ui:** repair scrolling by clicking the sidebar ([#1542](https://github.com/nrwl/nx-console/issues/1542)) ([476a1a8](https://github.com/nrwl/nx-console/commit/476a1a812d3aab94d17f2cd18e67e9f2a55d9a89))
* make sure first positional args are in the right order & fallback to old sorting ([#1541](https://github.com/nrwl/nx-console/issues/1541)) ([9b1a53e](https://github.com/nrwl/nx-console/commit/9b1a53ea9d6fa6a15cea340413662d99438afd81))


### Features

* **vscode:** enable selecting move generator instead of defaulting to @nrwl/angular ([#1536](https://github.com/nrwl/nx-console/issues/1536)) ([9b6b1d9](https://github.com/nrwl/nx-console/commit/9b6b1d9e83b2313ab489233136893252826726b5))

## [17.30.1](https://github.com/nrwl/nx-console/compare/vscode-v17.30.0...vscode-v17.30.1) (2023-02-15)


### Bug Fixes

* **vscode:** copy generate ui to vscode dist ([74a36c7](https://github.com/nrwl/nx-console/commit/74a36c7d5affff9907ad8e52ea3c984daabe9452))

# [17.30.0](https://github.com/nrwl/nx-console/compare/vscode-v17.29.0...vscode-v17.30.0) (2023-02-15)


### Bug Fixes

* add missing package name and version to migrate command ([#1501](https://github.com/nrwl/nx-console/issues/1501)) ([fa370c2](https://github.com/nrwl/nx-console/commit/fa370c25ce0e2bb120481c00d5ffe62a2345c314))
* adjust checkmark color in intellij ([#1511](https://github.com/nrwl/nx-console/issues/1511)) ([e7d5feb](https://github.com/nrwl/nx-console/commit/e7d5febc8e0f971221c279b0904fdaa931ff3a59))
* autofocus first field when opening generate ui ([#1516](https://github.com/nrwl/nx-console/issues/1516)) ([068a78a](https://github.com/nrwl/nx-console/commit/068a78a968f3d096b4b6e14ef7138a50ba1316d8))
* correctly copy nxls files to vscode dist when building ([#1508](https://github.com/nrwl/nx-console/issues/1508)) ([e70ae3d](https://github.com/nrwl/nx-console/commit/e70ae3dff8aa51960400d4e2327933a3c162f485))
* **generate-ui:** fix search bar in intellij ([#1521](https://github.com/nrwl/nx-console/issues/1521)) ([745557f](https://github.com/nrwl/nx-console/commit/745557fbd03824dc485a5328bc082167b4044290))
* **generate-ui:** force unbreakable strings to break instead of overflowing ([#1518](https://github.com/nrwl/nx-console/issues/1518)) ([f85f7ba](https://github.com/nrwl/nx-console/commit/f85f7ba113712dd5804b9323054fe220e1f8d8d3))
* handle schema file refs better for windows ([#1512](https://github.com/nrwl/nx-console/issues/1512)) ([8c639e1](https://github.com/nrwl/nx-console/commit/8c639e134ee563c9925ea9271b4badcf39e0efff))
* **intellij:** properly display dropdown fields in the generate-ui ([#1503](https://github.com/nrwl/nx-console/issues/1503)) ([285ff94](https://github.com/nrwl/nx-console/commit/285ff9436b9bcb009dc923d2c3313cc7879f89fc))
* **intellij:** serialize more generator option properties ([#1506](https://github.com/nrwl/nx-console/issues/1506)) ([2802ebc](https://github.com/nrwl/nx-console/commit/2802ebc5c10835ca5b5963155f4c72171715e7e5))
* **nxls:** update @parcel/watcher ([#1526](https://github.com/nrwl/nx-console/issues/1526)) ([ce1b0ab](https://github.com/nrwl/nx-console/commit/ce1b0ab4642eb369fdf4ee7440277f5949406f36))
* revert back to parcel/watcher@2.0.7 ([076705f](https://github.com/nrwl/nx-console/commit/076705f2749c4cd945faac40dfb516a801fc2704))
* truncate status label text for cloud integration ([#1498](https://github.com/nrwl/nx-console/issues/1498)) ([8d4f50e](https://github.com/nrwl/nx-console/commit/8d4f50edd5378c7657d8f6ed3709b3d978c927dd))
* update styles and fix style-related bugs in generate ui ([#1517](https://github.com/nrwl/nx-console/issues/1517)) ([2f936bf](https://github.com/nrwl/nx-console/commit/2f936bfa02184135e09d01d115aac36f8fefb1a3))


### Features

* add wildcard support to generatorAllowlist and generatorBlocklist ([#1531](https://github.com/nrwl/nx-console/issues/1531)) ([0fc1bc2](https://github.com/nrwl/nx-console/commit/0fc1bc2a0e008a69ed549becdfd0c3ccee57fb06))
* **generate-ui:** split form by x-priority attribute ([#1528](https://github.com/nrwl/nx-console/issues/1528)) ([3520c79](https://github.com/nrwl/nx-console/commit/3520c792791874c0af383e42d3b59afc0e2d4ec7))
* **intellij:** include nxls in the intellij bundle ([#1494](https://github.com/nrwl/nx-console/issues/1494)) ([17cd310](https://github.com/nrwl/nx-console/commit/17cd3108fb021777290cfcb1f9eff7f1d9ab0f5e))
* **intellij:** open generate ui with project right click ([#1513](https://github.com/nrwl/nx-console/issues/1513)) ([43bd083](https://github.com/nrwl/nx-console/commit/43bd083133b165dc07820aedcfa66ba2841d03b9))
* **intellij:** show generate-ui in intellij ([#1497](https://github.com/nrwl/nx-console/issues/1497)) ([eedf023](https://github.com/nrwl/nx-console/commit/eedf0236fc8f8d8f6cc00357c86accd531e733c4))
* sort generator flags by priority ([#1502](https://github.com/nrwl/nx-console/issues/1502)) ([054ff64](https://github.com/nrwl/nx-console/commit/054ff64488bd2070d1a03844899a5ebcf878e1b5))
