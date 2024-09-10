## 1.31.0 (2024-09-10)

### Bug Fixes

* **intellij:** add refresh notification for better feedback when refreshing workspace ([#2252](https://github.com/nrwl/nx-console/issues/2252)) ([6c97180](https://github.com/nrwl/nx-console/commit/6c97180f97a5375cd90eb8ab874bbf7824443700))
* **intellij:** show notification instead of error when no (re)move generators are found ([#2250](https://github.com/nrwl/nx-console/issues/2250)) ([841d9d6](https://github.com/nrwl/nx-console/commit/841d9d683e5f8dfeb7cc6163e48996a6c1af88dc))
* **vscode:** only show banner message until nx 17 & don't show project dropdown if no projects ([#2249](https://github.com/nrwl/nx-console/issues/2249)) ([5839d82](https://github.com/nrwl/nx-console/commit/5839d8289132cd8da3413b48d8476dd5ceb8106f))


### Features

* **vscode:** create nx cloud onboarding view  ([#2229](https://github.com/nrwl/nx-console/issues/2229)) ([3d75f0f](https://github.com/nrwl/nx-console/commit/3d75f0fc0d5e1e02653726ae0e76c95f3765776e))

## <small>1.30.1 (2024-08-28)</small>

### Bug Fixes

* **intellij:** catch more errors during completion ([#2245](https://github.com/nrwl/nx-console/issues/2245)) ([25db991](https://github.com/nrwl/nx-console/commit/25db9910a86a23ad36229ccb5666f154dbeceef0))
* **intellij:** fix compatibility issues ([#2244](https://github.com/nrwl/nx-console/issues/2244)) ([7e6c140](https://github.com/nrwl/nx-console/commit/7e6c14046bfff041e5d260a47b938a84ae2afa24))
* **intellij:** use generate ui button in toolbar instead of run anything ([#2239](https://github.com/nrwl/nx-console/issues/2239)) ([29235e4](https://github.com/nrwl/nx-console/commit/29235e4d00ce496bc268737715ff21c706147a20))

## 1.30.0 (2024-08-27)

### Bug Fixes

* **intellij:** avoid slow operations on EDT when loading graph ([#2241](https://github.com/nrwl/nx-console/issues/2241)) ([40f96d0](https://github.com/nrwl/nx-console/commit/40f96d01956fea6b7eb4ef415b0650656ac72461))


### Features

* **intellij:** collect opt-in telemetry on exceptions ([#2240](https://github.com/nrwl/nx-console/issues/2240)) ([a073956](https://github.com/nrwl/nx-console/commit/a073956e8b50c904455935323da029c058a9dbe7))

## 1.29.0 (2024-08-22)

### Bug Fixes

* **intellij:** add telemetry to open & refresh PDV actions ([#2234](https://github.com/nrwl/nx-console/issues/2234)) ([5d417c0](https://github.com/nrwl/nx-console/commit/5d417c00b9857ac6355e126d14ec94e1c3978b1a))


### Features

* **intellij:** enable error report submissions via jetbrains exception analyzer ([#2237](https://github.com/nrwl/nx-console/issues/2237)) ([b817174](https://github.com/nrwl/nx-console/commit/b817174fdc7c8751a6038992c90954bc60e3abd8))
* **intellij:** make (re)move project actions available in toolwindow context menu ([#2238](https://github.com/nrwl/nx-console/issues/2238)) ([443ff4c](https://github.com/nrwl/nx-console/commit/443ff4c965735c31d8c1cc9db468cd2d196fe2e5))
* restructure telemetry and record errors ([#2236](https://github.com/nrwl/nx-console/issues/2236)) ([4dd6761](https://github.com/nrwl/nx-console/commit/4dd67616195cb3b12fc5fe7de3cf3dcd6fe879f0))

## <small>1.28.3 (2024-08-12)</small>

### Bug Fixes

* enable telemetry for workspace refreshes ([#2226](https://github.com/nrwl/nx-console/issues/2226)) ([b2eb5cd](https://github.com/nrwl/nx-console/commit/b2eb5cd133871f15d6d9a1cd31316334c416174b))
* **intellij:** fix various plugin devkit inspections ([#2232](https://github.com/nrwl/nx-console/issues/2232)) ([cecaa09](https://github.com/nrwl/nx-console/commit/cecaa09c3e8b2a22e57e7ad08a411c9682be3029))
* **nxls:** dynamically read nx.json schema during schema setup ([#2221](https://github.com/nrwl/nx-console/issues/2221)) ([913e1ce](https://github.com/nrwl/nx-console/commit/913e1ce2e32e74c05c4ee3d5b1d8ee346a4831cf))
* pass expanded externalFiles to ts plugin for wildcard pattern paths ([#2224](https://github.com/nrwl/nx-console/issues/2224)) ([f0010fc](https://github.com/nrwl/nx-console/commit/f0010fc12b4a664d883ef027cde2ef9b2072cf86))

## <small>1.28.2 (2024-07-22)</small>

### Bug Fixes

* **intellij:** remove old genui option & catch error ([#2172](https://github.com/nrwl/nx-console/issues/2172)) ([7ca5aab](https://github.com/nrwl/nx-console/commit/7ca5aab0e5412451a7edef72491ae5d83a9c4980))

## <small>1.28.1 (2024-07-18)</small>

### Bug Fixes

* **intellij:** misc toolwindow fixes ([#2215](https://github.com/nrwl/nx-console/issues/2215)) ([e98b03b](https://github.com/nrwl/nx-console/commit/e98b03b0527b43cc9d157030e37d77495b2b9cb8))

## 1.28.0 (2024-07-18)

### Bug Fixes

* **intellij:** don't start nxls in angular.json workspaces ([#2212](https://github.com/nrwl/nx-console/issues/2212)) ([40c40e6](https://github.com/nrwl/nx-console/commit/40c40e66685ccf8d66a07fe2c110f43132b9411c))
* **intellij:** only add description for short generators ([#2210](https://github.com/nrwl/nx-console/issues/2210)) ([9fa2862](https://github.com/nrwl/nx-console/commit/9fa286215a02264ed09f269653f0fb0aa8a819a3))
* **nxls:** add project folder tree e2e test & only track children by dir ([#2199](https://github.com/nrwl/nx-console/issues/2199)) ([cdadda6](https://github.com/nrwl/nx-console/commit/cdadda67293ac3f87ca7d9cf762d433d01dcafb2))
* **nxls:** handle comments when parsing nx.json ([#2201](https://github.com/nrwl/nx-console/issues/2201)) ([261f208](https://github.com/nrwl/nx-console/commit/261f20897b66a99f74e49580ee52db0a9b3f7bfa))
* **nxls:** ignore .nx/workspace-data paths as a precaution ([#2190](https://github.com/nrwl/nx-console/issues/2190)) ([60c91ff](https://github.com/nrwl/nx-console/commit/60c91ff525807f992c53d036057fcd93996f0aa5))
* repair workspace-18 e2e & make sure .env is in sharedGlobals ([#2204](https://github.com/nrwl/nx-console/issues/2204)) ([a883e25](https://github.com/nrwl/nx-console/commit/a883e25af190bfb46b100a85b2980e154d50b940))
* use command cwd when running help command rather than project root ([#2200](https://github.com/nrwl/nx-console/issues/2200)) ([44b3c02](https://github.com/nrwl/nx-console/commit/44b3c024b0ccc70136d90ddacac9f1c3180cd45b))


### Features

* add @nx/gradle ([#2154](https://github.com/nrwl/nx-console/issues/2154)) ([bbbc0bc](https://github.com/nrwl/nx-console/commit/bbbc0bcd927312ff6ee03dab893035b86f579891))
* group targets by target group in sidebar ([#2198](https://github.com/nrwl/nx-console/issues/2198)) ([c681f21](https://github.com/nrwl/nx-console/commit/c681f2128838f6fd131dd5cf801d96c9a750a8f8))
* **intellij:** add atomizer label to toolwindow ([#2203](https://github.com/nrwl/nx-console/issues/2203)) ([f6a5616](https://github.com/nrwl/nx-console/commit/f6a56162ce18f593451a90a00f8750d6887329d7))
* **intellij:** add cloud view & add project graph errors to problems pane  ([#2175](https://github.com/nrwl/nx-console/issues/2175)) ([088f51b](https://github.com/nrwl/nx-console/commit/088f51b2e19cd26b4cc6492122a09bb48f93754c))

## 1.27.0 (2024-06-25)

### Features

* add nx connect action & vscode cloud pane ([#2186](https://github.com/nrwl/nx-console/issues/2186)) ([2326197](https://github.com/nrwl/nx-console/commit/232619729b1e4fa9c767fa7404449352f1fcff7d))
* **misc:** add support for run-help event ([#2183](https://github.com/nrwl/nx-console/issues/2183)) ([7beb868](https://github.com/nrwl/nx-console/commit/7beb868b043c9fc6552e5b6505d6e99afcafba8a))

## <small>1.26.1 (2024-06-24)</small>

### Bug Fixes

* **intellij:** check that ./nx is not a folder before assuming it as binary ([#2176](https://github.com/nrwl/nx-console/issues/2176)) ([92a3373](https://github.com/nrwl/nx-console/commit/92a33733471201e89616fc592d888f0ccb1c6f85))

## 1.26.0 (2024-06-17)

### Bug Fixes

* `npmDependencies` returns dependencies from `.nx/installation/node_modules` if `node_modules` is a file ([#2152](https://github.com/nrwl/nx-console/issues/2152)) ([7eb76f9](https://github.com/nrwl/nx-console/commit/7eb76f9f24c5be9d1a49eff9edc043fba21e4c0a))
* **intellij:** handle undefined generator description ([#2165](https://github.com/nrwl/nx-console/issues/2165)) ([ba89cd3](https://github.com/nrwl/nx-console/commit/ba89cd32201ecaeabf3b7ebe4b93fc82c3bd2152))
* **nxls:** load .env files in language server to make sure daemon client has access to them ([#2158](https://github.com/nrwl/nx-console/issues/2158)) ([3bb1514](https://github.com/nrwl/nx-console/commit/3bb151443bb46355f8cceca8fac5ef5624b8ab36))


### Features

* **vscode:** add nx errors to problems view & update empty view in error state ([#2143](https://github.com/nrwl/nx-console/issues/2143)) ([cf389ed](https://github.com/nrwl/nx-console/commit/cf389edaf77bce5c6b4249df6331c4ab853f6330))
* **vscode:** merge run target & common commands views, refactorings and remove old generate ui ([#2166](https://github.com/nrwl/nx-console/issues/2166)) ([82d36fe](https://github.com/nrwl/nx-console/commit/82d36fee7c4f296e6fb52bc33f46329bb4bfb28e))

## 1.25.0 (2024-05-27)

### Bug Fixes

* **intellij:** repair telemetry/log check when running configurations ([#2151](https://github.com/nrwl/nx-console/issues/2151)) ([00b7ecc](https://github.com/nrwl/nx-console/commit/00b7ecc79e2ea8d58bcdc2643252ca2ad2877a08))
* **nxls:** lazily import @parcel/watcher to avoid issues ([#2140](https://github.com/nrwl/nx-console/issues/2140)) ([8d68e8e](https://github.com/nrwl/nx-console/commit/8d68e8eba7f2aba4aa6e2832b028f251ec7f1c73))
* **nxls:** resolve delegated executor defintions correctly ([#2150](https://github.com/nrwl/nx-console/issues/2150)) ([609f5a4](https://github.com/nrwl/nx-console/commit/609f5a436dae2ac1d8fb7620cbab90398c4b128f))
* rework graph with reloading & errors & update nx ([#2123](https://github.com/nrwl/nx-console/issues/2123)) ([e39e8e5](https://github.com/nrwl/nx-console/commit/e39e8e5f19cfd258f955caf75505749a56443323))


### Features

* **intellij:** show information message when running a debug configuration ([#2141](https://github.com/nrwl/nx-console/issues/2141)) ([39a7284](https://github.com/nrwl/nx-console/commit/39a7284f7b7cc91e98630d7d89b59cd6824ba6ad))

## 1.24.0 (2024-05-10)

### Bug Fixes

* **intellij:** enable loading nx packages from .nx/installation ([#2132](https://github.com/nrwl/nx-console/issues/2132)) ([5b1a05b](https://github.com/nrwl/nx-console/commit/5b1a05b9badeca99480cfc144b6ae83f7b87e4f4))
* **nxls:** filter all paths that include a cache folder ([#2128](https://github.com/nrwl/nx-console/issues/2128)) ([7acb20f](https://github.com/nrwl/nx-console/commit/7acb20fa5ad6e84944262de9b32c93cf4f009adc))


### Features

* **intellij:** autofocus first empty text field in re/move dialog ([#2131](https://github.com/nrwl/nx-console/issues/2131)) ([ac804b0](https://github.com/nrwl/nx-console/commit/ac804b01af8438d60b57c743a9169eed4993b47f))

## <small>1.23.1 (2024-05-06)</small>

### Bug Fixes

* **intellij:** set re/move dialog input field width to fill ([#2121](https://github.com/nrwl/nx-console/issues/2121)) ([40bc6b5](https://github.com/nrwl/nx-console/commit/40bc6b504954af6dc4d88102f4f3ab3dc5671f23))
* **nxls:** catch error while resetting daemon ([#2120](https://github.com/nrwl/nx-console/issues/2120)) ([8a179d7](https://github.com/nrwl/nx-console/commit/8a179d7a5b46d48e1c04a6ac1dfcd1d05a30d257))
* refactor graph integration to use partial graphs & handle errors ([#2117](https://github.com/nrwl/nx-console/issues/2117)) ([b2e4d6d](https://github.com/nrwl/nx-console/commit/b2e4d6de596d34215335a8aacaa4523e088ad39d))

## 1.23.0 (2024-05-02)

### Features

* enable partial graphs in nx console & fix bugs ([#2115](https://github.com/nrwl/nx-console/issues/2115)) ([72a544e](https://github.com/nrwl/nx-console/commit/72a544ed8fd900243b2b20448415fef357241b1e))

## 1.22.0 (2024-04-24)

### Bug Fixes

* **intellij:** set color theme when starting PDV, not just on changes ([#2096](https://github.com/nrwl/nx-console/issues/2096)) ([2abb801](https://github.com/nrwl/nx-console/commit/2abb801c74e3c897e411f92c8a2ea57027e9b486))


### Features

* nx reset & restart nxls on manual refresh ([#2097](https://github.com/nrwl/nx-console/issues/2097)) ([f34afd2](https://github.com/nrwl/nx-console/commit/f34afd24c66ca2d5790fd5d75c4938a1510450bb))


### Reverts

* add @nx/gradle ([#2100](https://github.com/nrwl/nx-console/issues/2100)) ([84d5100](https://github.com/nrwl/nx-console/commit/84d51003e33cd4e3c984a6359b6c2c68fd4dc4ce))

## 1.21.0 (2024-04-10)

### Bug Fixes

* correctly load graph html without assuming node_modules ([#2083](https://github.com/nrwl/nx-console/issues/2083)) ([84b5fb7](https://github.com/nrwl/nx-console/commit/84b5fb7ed5f493a731a052fbaa323a38f4b9c329))
* **intellij:** catch invalid path error & check project disposal more ([#2076](https://github.com/nrwl/nx-console/issues/2076)) ([5ed5b56](https://github.com/nrwl/nx-console/commit/5ed5b56e9cc4feb851e56595d2cc82e841278d9d))
* **intellij:** get correct executable path under yarn pnp ([#2070](https://github.com/nrwl/nx-console/issues/2070)) ([3b5718a](https://github.com/nrwl/nx-console/commit/3b5718a0ebb35459e7ae1174ffc3c77c20c13ced))
* **nxls:** ignore nx.json when processing source maps for now ([#2087](https://github.com/nrwl/nx-console/issues/2087)) ([5f70a55](https://github.com/nrwl/nx-console/commit/5f70a554dc6505ee7a70bf1be0940a7a924fee13))
* **nxls:** repair for nx 13 & write nx/workspace tests for all supported versions ([#2084](https://github.com/nrwl/nx-console/issues/2084)) ([cdc9ecd](https://github.com/nrwl/nx-console/commit/cdc9ecde05da52d145a4fcc903976b79fe6a18dd))
* **nxls:** respect nx.json generator defaults when showing generate ui ([#2077](https://github.com/nrwl/nx-console/issues/2077)) ([d5dc4f9](https://github.com/nrwl/nx-console/commit/d5dc4f9bd9febf2ab775c14bec8384259b2bc470))


### Features

* add @nx/gradle ([#2078](https://github.com/nrwl/nx-console/issues/2078)) ([1198bda](https://github.com/nrwl/nx-console/commit/1198bda628e0661e81d92fa045c4580c0d1b2096))
* **nxls:** use daemon to watch files ([#2067](https://github.com/nrwl/nx-console/issues/2067)) ([4478927](https://github.com/nrwl/nx-console/commit/4478927e793187850c5b0e7976f348068a8bdfc4))

## 1.20.0 (2024-03-25)

### Bug Fixes

* **intellij:** fix freeze ([#2036](https://github.com/nrwl/nx-console/issues/2036)) ([c6b94bc](https://github.com/nrwl/nx-console/commit/c6b94bcfe8d8dd8c6a1c229b45400f6af1f84e18))
* remove -W and --silent flag for yarn ([#2063](https://github.com/nrwl/nx-console/issues/2063)) ([fd5ab5b](https://github.com/nrwl/nx-console/commit/fd5ab5ba79cf8231aa64c8ddb89b690ac26684b1))


### Features

* add autocomplete to nx.json plugins  ([#2061](https://github.com/nrwl/nx-console/issues/2061)) ([afa9bb5](https://github.com/nrwl/nx-console/commit/afa9bb51de0750fe92c2f8eaea694124131953a3))
* add config file codelenses in intellij ([#2045](https://github.com/nrwl/nx-console/issues/2045)) ([894caab](https://github.com/nrwl/nx-console/commit/894caab9cfc4c816672cf8e27308e40906b76535))

## 1.19.0 (2024-03-01)

### Bug Fixes

* add option to reset the daemon from the project detail view ([#2029](https://github.com/nrwl/nx-console/issues/2029)) ([4cec017](https://github.com/nrwl/nx-console/commit/4cec0170e205e083dc09e4c78152e0320aad02fd))
* don't mark generator options with x-prompt set as required anymore ([#2032](https://github.com/nrwl/nx-console/issues/2032)) ([d0a5a63](https://github.com/nrwl/nx-console/commit/d0a5a63ceba3bfc1bfc22e93d3d8bdcd369d3733))
* **intellij:** correctly normalize paths when getting pdv preview ([#2039](https://github.com/nrwl/nx-console/issues/2039)) ([65e1250](https://github.com/nrwl/nx-console/commit/65e1250e08f4bf5b6e54d12949c5da64d56771a3))
* **intellij:** fix generate ui ([#2030](https://github.com/nrwl/nx-console/issues/2030)) ([a6d6ecb](https://github.com/nrwl/nx-console/commit/a6d6ecb08aebdd6625efaba292706fd0b9b76ba4))
* **intellij:** fix issue with NxAngularConfigService state not being stored ([#2037](https://github.com/nrwl/nx-console/issues/2037)) ([9e523e8](https://github.com/nrwl/nx-console/commit/9e523e814b16441057714a4b847d3e3d3fe47996))
* **intellij:** provide Angular config for Angular support in Nx workspaces ([ec50b72](https://github.com/nrwl/nx-console/commit/ec50b7207d6e999270cad08d2e5946fdc673f637))
* **nxls:** handle directories under a root project in getProjectByPath ([#2038](https://github.com/nrwl/nx-console/issues/2038)) ([3b94e1c](https://github.com/nrwl/nx-console/commit/3b94e1c2d05aa3ed0971285df9747a30fdde32a8))
* **nxls:** handle windows paths better when getting project by path ([#2025](https://github.com/nrwl/nx-console/issues/2025)) ([bf82749](https://github.com/nrwl/nx-console/commit/bf8274972d5ea612d41d4b872be904e04d0eb0aa))
* **nxls:** repair getting project by path for directories ([#2034](https://github.com/nrwl/nx-console/issues/2034)) ([b021549](https://github.com/nrwl/nx-console/commit/b02154983f0a1965a0a5319fcadc20cb83582362))


### Features

* go to executor definition ([#1962](https://github.com/nrwl/nx-console/issues/1962)) ([02c1923](https://github.com/nrwl/nx-console/commit/02c1923f569a3aceeb2f23bcfd639263afcbbc80))
* **intellij:** show PDV in config files ([#2035](https://github.com/nrwl/nx-console/issues/2035)) ([ca6a922](https://github.com/nrwl/nx-console/commit/ca6a9225afb3e5129eb2aaa52487a19c9ff6b951))

## 1.18.0 (2024-02-02)

### Bug Fixes

* automatically repair graph server when it errors in vscode ([#1985](https://github.com/nrwl/nx-console/issues/1985)) ([5e679f3](https://github.com/nrwl/nx-console/commit/5e679f3f5cbb46d0e9705be05cb02f8ba6935349))
* handle error states better, especially in intellij ([#2010](https://github.com/nrwl/nx-console/issues/2010)) ([9ca2fb4](https://github.com/nrwl/nx-console/commit/9ca2fb4c304e4e204ba87e1e88f8002b51a2a664))
* improve broken project graph error handling across the board ([#2007](https://github.com/nrwl/nx-console/issues/2007)) ([de6ba8c](https://github.com/nrwl/nx-console/commit/de6ba8c44c62c3fe6286cc1b1b36f0a0dea0c775))
* **intellij:** fix PDV integration bugs ([#2004](https://github.com/nrwl/nx-console/issues/2004)) ([d33deda](https://github.com/nrwl/nx-console/commit/d33deda7c4df3f31ab689118e7145fcbe2c18492))
* **intellij:** specify actionUpdateThread = EDT in intellij actions ([#2008](https://github.com/nrwl/nx-console/issues/2008)) ([3679f93](https://github.com/nrwl/nx-console/commit/3679f9398726294f5a343365460daacbee14a588))
* **nxls:** attempt to reconfigure nxls after error with backoff ([094a17c](https://github.com/nrwl/nx-console/commit/094a17c0f07eafc94b84873f63d9dea9fbc0e892))
* **nxls:** don't cache projectGraph & sourceMaps when recalculating the workspace config ([#2009](https://github.com/nrwl/nx-console/issues/2009)) ([c4da459](https://github.com/nrwl/nx-console/commit/c4da4597c40d352b208fc068b0c62e1e0d471354))
* **nxls:** dynamically import cache dir instead of using nx console version ([#1990](https://github.com/nrwl/nx-console/issues/1990)) ([356856d](https://github.com/nrwl/nx-console/commit/356856d94df0b68efddf115f260def0369f661a0))
* **nxls:** enable target autocomplete for pcv3 projects ([#1992](https://github.com/nrwl/nx-console/issues/1992)) ([0b82c7f](https://github.com/nrwl/nx-console/commit/0b82c7f10a6d8728aecc2027d0f52a04c364cbc6))
* reset daemon client after all daemon requests are completed only ([#2006](https://github.com/nrwl/nx-console/issues/2006)) ([96d070a](https://github.com/nrwl/nx-console/commit/96d070ac8c7ad20be851dd88da628447d5b9a098))
* **vscode:** show pdv open to side button on all files that define a project ([#1999](https://github.com/nrwl/nx-console/issues/1999)) ([dafb57f](https://github.com/nrwl/nx-console/commit/dafb57f99d5515dc8fa80ff3b6766ffbd4afbac5))


### Features

* **vscode:** move project details inline display to codelens ([#1981](https://github.com/nrwl/nx-console/issues/1981)) ([e1aa36c](https://github.com/nrwl/nx-console/commit/e1aa36c6ae78e0ddc51ed616ce1a404bc83fb72f))
* **vscode:** show codelenses in config files that create targets ([#2001](https://github.com/nrwl/nx-console/issues/2001)) ([1a940b9](https://github.com/nrwl/nx-console/commit/1a940b93fd70eaed63a32a4b8fa3d13c99b719fb))

## 1.17.0 (2024-01-12)

### Features

* add project details preview ([#1957](https://github.com/nrwl/nx-console/issues/1957)) ([0ded9b2](https://github.com/nrwl/nx-console/commit/0ded9b2b36e62465d9d6139e15385002cc06eac4))
* **intellij:** exclude .nx folder from js/ts service ([#1976](https://github.com/nrwl/nx-console/issues/1976)) ([5ddd65e](https://github.com/nrwl/nx-console/commit/5ddd65e068ecc015469efee1fc1ec78e0628ef65))
* modify cwd handling with breadcrumb component ([#1974](https://github.com/nrwl/nx-console/issues/1974)) ([4b6a81f](https://github.com/nrwl/nx-console/commit/4b6a81f1305cd4f3004882e7357b9b99350640b2))

## <small>1.16.1 (2024-01-05)</small>

### Bug Fixes

* **nxls:** trigger reload on tsconfig.base.json change ([#1972](https://github.com/nrwl/nx-console/issues/1972)) ([a6213ed](https://github.com/nrwl/nx-console/commit/a6213eda1650e7bccb453e701086382695e1ff83))
* repair as-provided prefilling ([#1973](https://github.com/nrwl/nx-console/issues/1973)) ([1ba7e05](https://github.com/nrwl/nx-console/commit/1ba7e05ea7a0abb9b5e135c77594bb2c3f622743))

## 1.16.0 (2024-01-02)

### Bug Fixes

* distinguish more cases when prefilling ([#1935](https://github.com/nrwl/nx-console/issues/1935)) ([3760f2b](https://github.com/nrwl/nx-console/commit/3760f2b255f5c56619b6bcd6231f937d5ec7d596))
* **intellij:** don't try to remove document listener twice ([#1960](https://github.com/nrwl/nx-console/issues/1960)) ([d1b2abe](https://github.com/nrwl/nx-console/commit/d1b2abee7dbf06ba554ceac8a4562d7cd9e4965f))
* **nxls:** take default options into account when prefilling as-provided options ([#1943](https://github.com/nrwl/nx-console/issues/1943)) ([73662b2](https://github.com/nrwl/nx-console/commit/73662b2f496d1b4e52d9801f54ac0bc8d8cb95e6))
* stringify prompt items to avoid [object Object] ([#1934](https://github.com/nrwl/nx-console/issues/1934)) ([f2be598](https://github.com/nrwl/nx-console/commit/f2be598e98cfa94ad628812e4ed8986167be7e19))


### Features

* use nx native watcher & rework refreshing ([#1949](https://github.com/nrwl/nx-console/issues/1949)) ([8d8887d](https://github.com/nrwl/nx-console/commit/8d8887da03b83263c5962d9fd064a254bee0a545))

## <small>1.15.1 (2023-11-06)</small>

### Bug Fixes

* **repo): Revert "chore(repo:** update nx to 17.0.0-rc.3 ([#1913](https://github.com/nrwl/nx-console/issues/1913))" ([#1926](https://github.com/nrwl/nx-console/issues/1926)) ([4a178b0](https://github.com/nrwl/nx-console/commit/4a178b0fb9a9d1a134ceefe3d1505fd67410437f))

## 1.15.0 (2023-11-06)

### Bug Fixes

* **intellij:** make sure jcef is supported before opening ([#1911](https://github.com/nrwl/nx-console/issues/1911)) ([e7aa1ba](https://github.com/nrwl/nx-console/commit/e7aa1bab2e71c739a801b21a32e0449df3eef9d8))
* **nxls:** hide special case nx-release-publish target until generic handling is available ([#1915](https://github.com/nrwl/nx-console/issues/1915)) ([22b4d85](https://github.com/nrwl/nx-console/commit/22b4d858a3b55896598cdff2ee7e5a2eef0c8bc7))
* revert don't process targets with hidden property ([#1897](https://github.com/nrwl/nx-console/issues/1897)) ([#1916](https://github.com/nrwl/nx-console/issues/1916)) ([7449ecb](https://github.com/nrwl/nx-console/commit/7449ecbc971b76c31fb5a54b2f4ddf5f0619468a))


### Features

* **intellij:** add extension point to use different generate ui ([#1831](https://github.com/nrwl/nx-console/issues/1831)) ([2964e11](https://github.com/nrwl/nx-console/commit/2964e117c17449e18d0f4de2c85af3cc0337241f))

## 1.14.0 (2023-10-17)

### Bug Fixes

* **intellij:** allow multiple open generate ui windows ([#1879](https://github.com/nrwl/nx-console/issues/1879)) ([ae88ddd](https://github.com/nrwl/nx-console/commit/ae88ddd09c68890ef8f5c9d77701fe060f457f94))
* **intellij:** make sure affected feature doesnt break intellij graph ([#1905](https://github.com/nrwl/nx-console/issues/1905)) ([f55cd09](https://github.com/nrwl/nx-console/commit/f55cd09bddc937f59afc5766105a96a76bb81cdf))
* **intellij:** reload tree model on main thread ([#1885](https://github.com/nrwl/nx-console/issues/1885)) ([accb2d0](https://github.com/nrwl/nx-console/commit/accb2d0e10159800b0c1498c25c7d69002a74633))
* **intellij:** scan for nx workspace before starting nxls ([#1899](https://github.com/nrwl/nx-console/issues/1899)) ([c2b76df](https://github.com/nrwl/nx-console/commit/c2b76df6c81b15f3e90223a1ac2ef2e6288c353a))
* normalize windows path ([#1907](https://github.com/nrwl/nx-console/issues/1907)) ([7d3d959](https://github.com/nrwl/nx-console/commit/7d3d95907ed9f27db6a329edf69137e43cfd91d5))


### Features

* **generate-ui:** add cwd handling & prefilling ([#1904](https://github.com/nrwl/nx-console/issues/1904)) ([3fcf304](https://github.com/nrwl/nx-console/commit/3fcf304e862ffafcbcf22ee882d3ff2ebef44394))
* **nxls:** don't process targets with hidden property ([#1897](https://github.com/nrwl/nx-console/issues/1897)) ([e55e3a8](https://github.com/nrwl/nx-console/commit/e55e3a8231eb51858e26eea7c1057b03159592d6))
* **vscode:** add show affected graph action & fix graph zooming ([#1883](https://github.com/nrwl/nx-console/issues/1883)) ([86f06b3](https://github.com/nrwl/nx-console/commit/86f06b3cb6a36eea22403ca516b43d76195752f8))

## <small>1.13.2 (2023-09-12)</small>

### Bug Fixes

* **intellij:** fix running nx targets in wsl ([#1881](https://github.com/nrwl/nx-console/issues/1881)) ([3d80124](https://github.com/nrwl/nx-console/commit/3d801243b6103fd65390a78449caa7aafe6312a3))

## <small>1.13.1 (2023-09-12)</small>

### Bug Fixes

* **generate-ui:** adjust generate ui styling for large fonts ([#1878](https://github.com/nrwl/nx-console/issues/1878)) ([fca0e26](https://github.com/nrwl/nx-console/commit/fca0e262882f9c589f72ea16d776d777775db781))
* take nx.json projectNameAndRootFormat config into account in generate ui ([#1880](https://github.com/nrwl/nx-console/issues/1880)) ([9d4a0c1](https://github.com/nrwl/nx-console/commit/9d4a0c14c3d65e37772964f9b5b822d3d0fdffa7))

## 1.13.0 (2023-09-05)

### Bug Fixes

* **intellij:** add shortcut to focus task action ([#1866](https://github.com/nrwl/nx-console/issues/1866)) ([eb2c9b6](https://github.com/nrwl/nx-console/commit/eb2c9b62eb3d93e7a3d9449bad330d9d9cea7b52))
* move projectNameAndRootFormat message to banner from tooltip ([#1873](https://github.com/nrwl/nx-console/issues/1873)) ([6b328fe](https://github.com/nrwl/nx-console/commit/6b328fe46b01497619f6e3502dde06cb69ec77b8))


### Features

* **generate-ui:** filter deprecated fields & move functionality to plugins ([#1862](https://github.com/nrwl/nx-console/issues/1862)) ([63225f0](https://github.com/nrwl/nx-console/commit/63225f0a8d6674a7fb499e22022202b45ff97d08))
* **intellij:** add debug mode to run configurations ([#1870](https://github.com/nrwl/nx-console/issues/1870)) ([d053726](https://github.com/nrwl/nx-console/commit/d053726c1fd731d4c516abbf9d213baf10c2f6a4))
* write internal git clean startup message plugin & display startup messages in intellij ([#1869](https://github.com/nrwl/nx-console/issues/1869)) ([339db9b](https://github.com/nrwl/nx-console/commit/339db9b7c770b527e59c7c742d17c5ab13d95748))

## 1.12.0 (2023-08-25)

### Bug Fixes

* **nxls:** use ignore globs from nx for the file watcher ([#1865](https://github.com/nrwl/nx-console/issues/1865)) ([8b3fa1d](https://github.com/nrwl/nx-console/commit/8b3fa1d65404b4b508d63584959650976208bc73))


### Features

* move plugins to lsp & write internal projectRootAndNameFormat plugin ([#1860](https://github.com/nrwl/nx-console/issues/1860)) ([d0f8852](https://github.com/nrwl/nx-console/commit/d0f8852b12de3c1a64e2c98177925deb280d9c85))

## <small>1.11.1 (2023-08-14)</small>

### Bug Fixes

* **intellij:** register schema handler after the cefBrowser is created ([#1858](https://github.com/nrwl/nx-console/issues/1858)) ([f43f927](https://github.com/nrwl/nx-console/commit/f43f9277e52d55a6dbf6869d00b29d96f7bd0dbc))
* **intellij:** update deprecated apis ([#1859](https://github.com/nrwl/nx-console/issues/1859)) ([99b8b96](https://github.com/nrwl/nx-console/commit/99b8b962d4e07d4060ddf5a10069aba8443717a9))

## 1.11.0 (2023-08-02)

### Bug Fixes

* add better empty states to project view/toolwindow ([#1833](https://github.com/nrwl/nx-console/issues/1833)) ([de3e03d](https://github.com/nrwl/nx-console/commit/de3e03d8d000a3b1ad2763166e2b867c1bcabed9))
* enable gutter actions in project.json without name & refactor project by path request ([#1822](https://github.com/nrwl/nx-console/issues/1822)) ([43632e2](https://github.com/nrwl/nx-console/commit/43632e2958e0c5ff7852d57320bfdf98550c7132))
* **intellij:** make workspace path setting relative to project base path ([#1835](https://github.com/nrwl/nx-console/issues/1835)) ([a894d3b](https://github.com/nrwl/nx-console/commit/a894d3bdccbf93deb11c0e69494014c9b8c4b2b8))
* make scrollbar look more native in intellij ([#1837](https://github.com/nrwl/nx-console/issues/1837)) ([102c726](https://github.com/nrwl/nx-console/commit/102c7263d39e17a6a11421029a54c614f308782a))
* **nxls:** increase watcher debounce to avoid daemon timing issues ([#1829](https://github.com/nrwl/nx-console/issues/1829)) ([5d5eae9](https://github.com/nrwl/nx-console/commit/5d5eae9e4cfa0c1a10828fabc6df206aa09ba9eb))
* repair generator context passing in intellij ([#1821](https://github.com/nrwl/nx-console/issues/1821)) ([6e373b9](https://github.com/nrwl/nx-console/commit/6e373b9ec0720692992a971266a9faeb80e83b41))
* sort project tree view / nx toolwindow ([#1830](https://github.com/nrwl/nx-console/issues/1830)) ([e077225](https://github.com/nrwl/nx-console/commit/e0772256bdb3af7240d4dee39928dffc70e0aa72))
* **vscode:** don't register vscode things twice & remove outdated stuff from main.ts ([#1848](https://github.com/nrwl/nx-console/issues/1848)) ([0bd8fa1](https://github.com/nrwl/nx-console/commit/0bd8fa1322ee87612c0b77fa0e0eba2cf4424cbb))


### Features

* consume new graph events to open files in the ide ([#1823](https://github.com/nrwl/nx-console/issues/1823)) ([5049c76](https://github.com/nrwl/nx-console/commit/5049c76359733b162806249b7747449226093b21))
* enable opening project configuration files & running tasks from graph ([#1841](https://github.com/nrwl/nx-console/issues/1841)) ([b2e3785](https://github.com/nrwl/nx-console/commit/b2e378564f8d674b93130b4e9bff958828e7dfa6))
* **intellij:** add action to highlight project.json schema errors ([#1828](https://github.com/nrwl/nx-console/issues/1828)) ([8c694ba](https://github.com/nrwl/nx-console/commit/8c694baf771cab075c551ec26cf56fcc64181909))
* support yarn pnp ([#1850](https://github.com/nrwl/nx-console/issues/1850)) ([f5787a3](https://github.com/nrwl/nx-console/commit/f5787a32b384b4ab19d1c2e6774a92b28e2c7e3b))

## 1.10.0 (2023-07-12)

### Bug Fixes

* **intellij:** remove usage of runBlocking from generate ui actions ([#1816](https://github.com/nrwl/nx-console/issues/1816)) ([76a3473](https://github.com/nrwl/nx-console/commit/76a34738067e1e6bf8c637036339087f0ea4e12e))
* **intellij:** repair focus nx project from context menu ([#1817](https://github.com/nrwl/nx-console/issues/1817)) ([d278e50](https://github.com/nrwl/nx-console/commit/d278e50842281d6cdf08ec28aa516ede922cbb8a))


### Features

* **intellij:** show notification when there is a parsing error ([#1819](https://github.com/nrwl/nx-console/issues/1819)) ([514075b](https://github.com/nrwl/nx-console/commit/514075bebdbfaf3199201d44246b7e7991db8ef0))

## 1.9.0 (2023-07-10)

### Bug Fixes

* **intellij:** handle nxls shutdown without blocking ([#1804](https://github.com/nrwl/nx-console/issues/1804)) ([3e4fa1b](https://github.com/nrwl/nx-console/commit/3e4fa1bbcdb1a94afdba6915033c915c3c08dcbf))
* **intellij:** rework actions to remove runBlocking & improve UX ([#1809](https://github.com/nrwl/nx-console/issues/1809)) ([0adee2e](https://github.com/nrwl/nx-console/commit/0adee2ef8c444327e5e293c38752484f1e1680a4))
* **intellij:** save and load run configurations that have a nx target configuration set ([#1811](https://github.com/nrwl/nx-console/issues/1811)) ([e0d03d9](https://github.com/nrwl/nx-console/commit/e0d03d9c4cfcddd5bd42648346a58e4b040ae663))


### Features

* add autocomplete field and use it for options with many items ([#1807](https://github.com/nrwl/nx-console/issues/1807)) ([777a897](https://github.com/nrwl/nx-console/commit/777a89761c22b98a866bc2ea5c50de57f402e041))
* refactor & add folder view to jetbrains toolwindow ([#1814](https://github.com/nrwl/nx-console/issues/1814)) ([70a9c88](https://github.com/nrwl/nx-console/commit/70a9c88fb60fc1e0dcaf1811463adb60f7151037))

## 1.8.0 (2023-07-04)

### Bug Fixes

* adjust generator autofilling ([#1792](https://github.com/nrwl/nx-console/issues/1792)) ([81663df](https://github.com/nrwl/nx-console/commit/81663df9a634c4ce0223bc8dc7be5988583a4f29))
* make sure nx.run works in all contexts ([#1795](https://github.com/nrwl/nx-console/issues/1795)) ([a3b84e4](https://github.com/nrwl/nx-console/commit/a3b84e4fdde92979ba877a63a40ae1af4a2fcdd0))
* revert ts version because it broke old generate ui ([#1796](https://github.com/nrwl/nx-console/issues/1796)) ([916aa4c](https://github.com/nrwl/nx-console/commit/916aa4ca1634319baae3262437bd2956d6ea0702))
* update @parcel/watcher for more prebuilt binaries ([#1803](https://github.com/nrwl/nx-console/issues/1803)) ([4909b24](https://github.com/nrwl/nx-console/commit/4909b24fa5629cc659afa681e0fbbf0541a73a33))


### Features

* **generate-ui:** add copy to clipboard button to generate ui ([#1799](https://github.com/nrwl/nx-console/issues/1799)) ([9b8a20d](https://github.com/nrwl/nx-console/commit/9b8a20ded0c508e9cb79468ad9fced5fc3fb0976))

## 1.7.0 (2023-06-28)

### Bug Fixes

* adjust font size and some spacing ([#1781](https://github.com/nrwl/nx-console/issues/1781)) ([12c9eec](https://github.com/nrwl/nx-console/commit/12c9eec28a550819a8fc882f8b41921574e3370a))
* **intellij:** do not use `runBlocking` for SearchEverywhereContributor ([#1783](https://github.com/nrwl/nx-console/issues/1783)) ([5dd0595](https://github.com/nrwl/nx-console/commit/5dd05952cb5713bde82fea71bacaca0f94114128))
* **intellij:** do not use `runBlocking` when getting the nx workspace ([#1788](https://github.com/nrwl/nx-console/issues/1788)) ([1a03616](https://github.com/nrwl/nx-console/commit/1a036163fcb7f82b671c24cda7d82b03fb7b33f3))
* **intellij:** update icons to match spec - fixes wrong color when selected ([#1790](https://github.com/nrwl/nx-console/issues/1790)) ([e649a20](https://github.com/nrwl/nx-console/commit/e649a20e54eb64f0201020f5443e025389563437))
* **nxls:** fix broken version comparison for file map ([#1785](https://github.com/nrwl/nx-console/issues/1785)) ([9af8155](https://github.com/nrwl/nx-console/commit/9af8155aaf3a5fe43ef28f91e4fe85a5136b641e))
* properly catch errors when reading package.json files ([#1786](https://github.com/nrwl/nx-console/issues/1786)) ([578aff9](https://github.com/nrwl/nx-console/commit/578aff9667711b01f5cd65abc8ccd54db3d73da5))
* remove faulty webpack config in old generate ui ([#1780](https://github.com/nrwl/nx-console/issues/1780)) ([34c3b13](https://github.com/nrwl/nx-console/commit/34c3b1322d02d8fdeb6267e776b1854c482e5fa8))


### Features

* add cypress tests & additional features to new generate ui ([#1770](https://github.com/nrwl/nx-console/issues/1770)) ([866a14a](https://github.com/nrwl/nx-console/commit/866a14a08ff5567ff5986ed19da2c843378fe943))
* add generator context & refactor large parts ([#1776](https://github.com/nrwl/nx-console/issues/1776)) ([5ff6f02](https://github.com/nrwl/nx-console/commit/5ff6f028e56a7d6957aeab52129265f597e0ed0d))
* fix styles after review and general fixes/improvements ([#1771](https://github.com/nrwl/nx-console/issues/1771)) ([70b3ded](https://github.com/nrwl/nx-console/commit/70b3ded361f40c33081994868bb15d64b9d1d3e0))
* further style & functionality improvements to new generate ui ([#1764](https://github.com/nrwl/nx-console/issues/1764)) ([a4bf156](https://github.com/nrwl/nx-console/commit/a4bf15610dbe7c303ce65043a190511e5167e45e))
* refactor nx cli commands, throw out deprecated or outdated stuff  & update nx ([#1777](https://github.com/nrwl/nx-console/issues/1777)) ([e9f6149](https://github.com/nrwl/nx-console/commit/e9f6149c084190446518f717f6d1982df386fff3))
* toggle new generate ui to be enabled by default 🎉 ([#1787](https://github.com/nrwl/nx-console/issues/1787)) ([e6f9cc9](https://github.com/nrwl/nx-console/commit/e6f9cc92ff394bccec72af00740816dba1d96be7))
* update generate ui with improved array & multiselect fields ([#1760](https://github.com/nrwl/nx-console/issues/1760)) ([4f95c96](https://github.com/nrwl/nx-console/commit/4f95c96051c643c707df96308aecf48cbf345b47))

## <small>1.6.1 (2023-06-09)</small>

### Bug Fixes

* **intellij:** replace usage of deprecated color var ([#1757](https://github.com/nrwl/nx-console/issues/1757)) ([13b2ebf](https://github.com/nrwl/nx-console/commit/13b2ebf2f41b6777c0a307c8a006f6b428834505))
* **nxls:** change projectFileMap loading between 16.3 patch versions ([#1759](https://github.com/nrwl/nx-console/issues/1759)) ([5b0657a](https://github.com/nrwl/nx-console/commit/5b0657a920890604cae9df54e0d69133181e8666))
* repair task graph bugs caused by faulty navigation ([#1755](https://github.com/nrwl/nx-console/issues/1755)) ([0e6637c](https://github.com/nrwl/nx-console/commit/0e6637c8a808925d6ad92c1f1f2596ddc9af8444))

### Features

* **generate-ui:** rewrite generate ui and display it via feature toggle ([#1749](https://github.com/nrwl/nx-console/issues/1749)) ([19d1dd5](https://github.com/nrwl/nx-console/commit/19d1dd5c54e2d0fbefd675e8c1a115aaf13a4f47))
* improve generate ui v2 ([#1756](https://github.com/nrwl/nx-console/issues/1756)) ([67f77bd](https://github.com/nrwl/nx-console/commit/67f77bdf43225e753bff165b49b12ac3598f3ef1))
* support nx 16.3 ([#1752](https://github.com/nrwl/nx-console/issues/1752)) ([19d78fb](https://github.com/nrwl/nx-console/commit/19d78fb9394fe23beb16afae7f02ed6786433041))

## 1.6.0 (2023-06-08)

### Bug Fixes

* repair task graph bugs caused by faulty navigation ([#1755](https://github.com/nrwl/nx-console/issues/1755)) ([0e6637c](https://github.com/nrwl/nx-console/commit/0e6637c8a808925d6ad92c1f1f2596ddc9af8444))
* **vscode:** repair generate ui docs link ([#1747](https://github.com/nrwl/nx-console/issues/1747)) ([868080e](https://github.com/nrwl/nx-console/commit/868080e5fa7a31ad2c65e3c42e28279b99c5ee9d))


### Features

* **generate-ui:** rewrite generate ui and display it via feature toggle ([#1749](https://github.com/nrwl/nx-console/issues/1749)) ([19d1dd5](https://github.com/nrwl/nx-console/commit/19d1dd5c54e2d0fbefd675e8c1a115aaf13a4f47))
* improve generate ui v2 ([#1756](https://github.com/nrwl/nx-console/issues/1756)) ([67f77bd](https://github.com/nrwl/nx-console/commit/67f77bdf43225e753bff165b49b12ac3598f3ef1))
* support nx 16.3 ([#1752](https://github.com/nrwl/nx-console/issues/1752)) ([19d78fb](https://github.com/nrwl/nx-console/commit/19d78fb9394fe23beb16afae7f02ed6786433041))

## 1.5.0 (2023-05-23)

### Bug Fixes

* **intellij:** correctly display & run workspace generators via the UI ([#1740](https://github.com/nrwl/nx-console/issues/1740)) ([ba293c0](https://github.com/nrwl/nx-console/commit/ba293c03978b1032e4b93a4f89d2553b23e55a49))
* **intellij:** display project dropdown for project fields ([#1741](https://github.com/nrwl/nx-console/issues/1741)) ([7c0fffa](https://github.com/nrwl/nx-console/commit/7c0fffa47e61eda30014cad1bccf44110bc5657e))
* **intellij:** fix default values in webview by passing correct name to nxls ([#1743](https://github.com/nrwl/nx-console/issues/1743)) ([38f200f](https://github.com/nrwl/nx-console/commit/38f200fa6ff6130cfc84fc3eb8213e4966073359))


### Features

* **intellij:** add generator filter setting ([#1716](https://github.com/nrwl/nx-console/issues/1716)) ([e99f8c1](https://github.com/nrwl/nx-console/commit/e99f8c1f81e7422aabf133bc024c103bb0e5fdd2))
* **intellij:** add gutter actions for target configurations ([#1735](https://github.com/nrwl/nx-console/issues/1735)) ([04262a6](https://github.com/nrwl/nx-console/commit/04262a6be10783066a5bb56ec084a858b9099978))
* **intellij:** add toolwindow button to view full project graph ([#1734](https://github.com/nrwl/nx-console/issues/1734)) ([56b3c21](https://github.com/nrwl/nx-console/commit/56b3c2189c0bef530ae2587beeeed2e391f673bd))
* **intellij:** allow nx graph download ([#1730](https://github.com/nrwl/nx-console/issues/1730)) ([c05814d](https://github.com/nrwl/nx-console/commit/c05814dcdbb3f7b2ca54d9b9addc26afe5413b17))
* **intellij:** display target configurations in the toolwindow & run configuration editor ([#1717](https://github.com/nrwl/nx-console/issues/1717)) ([d638dec](https://github.com/nrwl/nx-console/commit/d638decb45dcccd2bed8bb587d8fe005afc46003))
* **intellij:** enable jumping to target & configuration from toolwindow ([#1736](https://github.com/nrwl/nx-console/issues/1736)) ([e00ee32](https://github.com/nrwl/nx-console/commit/e00ee32bcb6e567aaa062c4371c6d5d2b0e15daa))
* **intellij:** rework target running & improve project selection ([#1733](https://github.com/nrwl/nx-console/issues/1733)) ([8c3a119](https://github.com/nrwl/nx-console/commit/8c3a119abd05f8b147ab4b1c16a0ef0b6889f4dd))

## 1.4.0 (2023-04-28)

### Bug Fixes

* **generate-ui:** correctly serialize options with array default values ([#1690](https://github.com/nrwl/nx-console/issues/1690)) ([f21508c](https://github.com/nrwl/nx-console/commit/f21508cd2cd7da43be03881778810736971e13fd))
* **generate-ui:** handle multiple default values for generate ui ([#1684](https://github.com/nrwl/nx-console/issues/1684)) ([2529b56](https://github.com/nrwl/nx-console/commit/2529b563137ae7f732e77a09191d9582463e582f))
* **intellij:** catch throwable in measurement protocol ([28f2f38](https://github.com/nrwl/nx-console/commit/28f2f38ca99c33a315f18b3e6a94428e6a2d4bad))
* **intellij:** correctly pick up options in the generate run anything provider when using = ([#1696](https://github.com/nrwl/nx-console/issues/1696)) ([b610bad](https://github.com/nrwl/nx-console/commit/b610badc04535a93fac5bdd39d62402643c2d055))
* **intellij:** find the proper run configuration settings for nx targets ([#1661](https://github.com/nrwl/nx-console/issues/1661)) ([22f8486](https://github.com/nrwl/nx-console/commit/22f8486b64149c318e8b84e7614d035445a98f64))
* **intellij:** fix graph loading in intellij ([#1710](https://github.com/nrwl/nx-console/issues/1710)) ([df3d024](https://github.com/nrwl/nx-console/commit/df3d0249d7fa917c33142ce750af325c9fa2c708))
* **intellij:** include configured env variables when running targets ([#1705](https://github.com/nrwl/nx-console/issues/1705)) ([e2c5ee4](https://github.com/nrwl/nx-console/commit/e2c5ee4a0dffd221364e08f95883b4a9a50737c2))
* **intellij:** include package.json for nx file types ([#1706](https://github.com/nrwl/nx-console/issues/1706)) ([b011cc3](https://github.com/nrwl/nx-console/commit/b011cc354e5b76b1bee0205ea95b5dc395d744d3))
* **intellij:** run generate ui in `application.readAction` ([2e94883](https://github.com/nrwl/nx-console/commit/2e94883350e86832b0290c5fc6fff7fa5cc7a219))
* **intellij:** use warn instead of error for caught exceptions ([#1680](https://github.com/nrwl/nx-console/issues/1680)) ([a2f1fdc](https://github.com/nrwl/nx-console/commit/a2f1fdc5665843739a90b5c20dbe44b22557d6f6))
* **nxls:** handle the daemon output so that stdout isnt polluted ([#1698](https://github.com/nrwl/nx-console/issues/1698)) ([cf3f93f](https://github.com/nrwl/nx-console/commit/cf3f93f075bb1b654ff991d7b3ec891118126b0e))
* **nxls:** support running under node 14 ([#1679](https://github.com/nrwl/nx-console/issues/1679)) ([a6e91a5](https://github.com/nrwl/nx-console/commit/a6e91a53a0a78a26f555967e8a847606d13ba408))
* **nxls:** temporarily disable daemon ([0570f53](https://github.com/nrwl/nx-console/commit/0570f53f698fc138fb854b575841fba289992266))
* **nxls:** use the schema.json for the workspace generator collection path ([#1691](https://github.com/nrwl/nx-console/issues/1691)) ([10574c1](https://github.com/nrwl/nx-console/commit/10574c174742268ebbf755e39b5aec0c381de42e))
* serialize output messages with payloadType ([#1687](https://github.com/nrwl/nx-console/issues/1687)) ([055477f](https://github.com/nrwl/nx-console/commit/055477f00023828ecf410e08848b9e50ffd88dbd))


### Features

* add hover with links to nx.dev for executors ([#1708](https://github.com/nrwl/nx-console/issues/1708)) ([eab101c](https://github.com/nrwl/nx-console/commit/eab101c7a8daa2a3309a2072fce76e85cfec5442))
* **intellij:** add console folding ([#1662](https://github.com/nrwl/nx-console/issues/1662)) ([c99371f](https://github.com/nrwl/nx-console/commit/c99371f1ea8720aae1c83eb206924ac82195856d))
* **intellij:** add edit project configuration to nx console tool window ([#1700](https://github.com/nrwl/nx-console/issues/1700)) ([6ec2cd6](https://github.com/nrwl/nx-console/commit/6ec2cd647198e1830f2a72c6f51fa409b7b18fdc))
* **intellij:** improve project graph loading experience ([#1683](https://github.com/nrwl/nx-console/issues/1683)) ([1978371](https://github.com/nrwl/nx-console/commit/1978371a6e910e600f1d637cc403c9614d65a01b))
* **nxls:** update dependsOn and namedInputs completion for nx 16 ([#1701](https://github.com/nrwl/nx-console/issues/1701)) ([8eb8b1c](https://github.com/nrwl/nx-console/commit/8eb8b1c5ad962e759fef3428e98222aebe2101ec))
* support nx 16 ([#1686](https://github.com/nrwl/nx-console/issues/1686)) ([0126e58](https://github.com/nrwl/nx-console/commit/0126e58fccf54a765256c86e48e323659b4cb2fa))

## 1.3.0 (2023-04-04)

### Bug Fixes

* **generate-ui:** ensure checkboxes have correctly centered checkmarks ([#1604](https://github.com/nrwl/nx-console/issues/1604)) ([5e4180e](https://github.com/nrwl/nx-console/commit/5e4180e1091391587506263da18b11fdabd23b7b))
* handle nxls startup errors ([#1649](https://github.com/nrwl/nx-console/issues/1649)) ([da9ed6e](https://github.com/nrwl/nx-console/commit/da9ed6e175908c603eb97024f0b5c4a33fe1f0a2))
* **intellij:** add missing NxCommandRunAnythingProvider ([#1600](https://github.com/nrwl/nx-console/issues/1600)) ([fc45ef9](https://github.com/nrwl/nx-console/commit/fc45ef94418c19221adf9599f9c47f2a50b8ae26))
* **intellij:** add the configured node interpreter to the path when running nx commands ([#1635](https://github.com/nrwl/nx-console/issues/1635)) ([00e0dad](https://github.com/nrwl/nx-console/commit/00e0dad161009c6e50858f90de2bd9cbab2c360b))
* **intellij:** change default task name ([#1636](https://github.com/nrwl/nx-console/issues/1636)) ([64925f1](https://github.com/nrwl/nx-console/commit/64925f1a4d6c6e6361db811fd729b00d98b35941))
* **intellij:** correctly display workspace-generator name ([#1605](https://github.com/nrwl/nx-console/issues/1605)) ([2c2bb4b](https://github.com/nrwl/nx-console/commit/2c2bb4b34671d322311c370a128c537c3748a7c9))
* **intellij:** do not add or remove document listeners on editors that are not connected to the language server ([#1640](https://github.com/nrwl/nx-console/issues/1640)) ([1bb74e9](https://github.com/nrwl/nx-console/commit/1bb74e969c9fdbc42353403e1c89882d3bbbbb07))
* **intellij:** don't apply empty workspace path setting ([#1611](https://github.com/nrwl/nx-console/issues/1611)) ([1dab266](https://github.com/nrwl/nx-console/commit/1dab26675b79d14a8bfb9d370d95d0f85c82341d))
* **intellij:** refresh file system after running generator ([#1589](https://github.com/nrwl/nx-console/issues/1589)) ([4bed233](https://github.com/nrwl/nx-console/commit/4bed233c3b36241789a82c32317c3c149507948a))
* **intellij:** remove the 404 page that shows up when opening the project graph ([#1654](https://github.com/nrwl/nx-console/issues/1654)) ([609dcb5](https://github.com/nrwl/nx-console/commit/609dcb5fdf3de644cefb3b6d7668e645aa68b419))
* **intellij:** rework generate run anything provider with aliases ([#1599](https://github.com/nrwl/nx-console/issues/1599)) ([0e7c67b](https://github.com/nrwl/nx-console/commit/0e7c67b083315c0e4332f87d2f142354eb79f54e))
* **intellij:** slightly reduce generate-ui white flicker ([#1591](https://github.com/nrwl/nx-console/issues/1591)) ([d3e9618](https://github.com/nrwl/nx-console/commit/d3e96188c6e3206ffe843f379bd1523ed2e5646b))
* **intellij:** update configuration name for the run anything command ([#1653](https://github.com/nrwl/nx-console/issues/1653)) ([3fcebcd](https://github.com/nrwl/nx-console/commit/3fcebcd1c75f58bb61a982824b23d21c859570c9))
* **intellij:** use latest by default when creating a new workspace ([#1612](https://github.com/nrwl/nx-console/issues/1612)) ([6a9342d](https://github.com/nrwl/nx-console/commit/6a9342d173a93e4b184edbbfd8198db635e15132))
* **nxls:** debounce @parcel/watcher to avoid race conditions ([#1620](https://github.com/nrwl/nx-console/issues/1620)) ([96f91fa](https://github.com/nrwl/nx-console/commit/96f91faf36ee2b4965e944a7b60333fb38cc175b))
* **nxls:** distinguish projects that are substrings of one another ([#1610](https://github.com/nrwl/nx-console/issues/1610)) ([a404c00](https://github.com/nrwl/nx-console/commit/a404c000ccd6597f3b1a1d6266ea4d8aa73aee48))
* **nxls:** do not output exec to stdio ([#1644](https://github.com/nrwl/nx-console/issues/1644) ([f0f112c](https://github.com/nrwl/nx-console/commit/f0f112c5a5b04fbf659d36655fe17cd02b5c462c))
* **nxls:** handle daemon better ([#1615](https://github.com/nrwl/nx-console/issues/1615)) ([0216d0c](https://github.com/nrwl/nx-console/commit/0216d0cf12c962765a060dee793bcf368eedc87f))
* **nxls:** use `workspaceFolders` before `rootUri` for better Windows path compatibility ([#1639](https://github.com/nrwl/nx-console/issues/1639)) ([2a5a07e](https://github.com/nrwl/nx-console/commit/2a5a07e07c989e49dc79d915ab17521177859781))


### Features

* **intellij:** add action for running targets ([#1607](https://github.com/nrwl/nx-console/issues/1607)) ([001dc91](https://github.com/nrwl/nx-console/commit/001dc91ecb31dc6c7807a078e9c4f9fe216a47c4))
* **intellij:** add nx console project toolwindow ([#1613](https://github.com/nrwl/nx-console/issues/1613)) ([df501b9](https://github.com/nrwl/nx-console/commit/df501b9a74ab1dd89808f9f659ef5c42f2a9c388))
* **intellij:** add nx generator search evrywhere contributor ([#1623](https://github.com/nrwl/nx-console/issues/1623)) ([7f4ea6a](https://github.com/nrwl/nx-console/commit/7f4ea6a1c46b3a28e247bc958c2016be75f0395e))
* **intellij:** add nx run line marker contributor for project.json ([#1584](https://github.com/nrwl/nx-console/issues/1584)) ([ee2e808](https://github.com/nrwl/nx-console/commit/ee2e808a11bc4950f09bb58f2f4e895beb53c66e))
* **intellij:** add task graph integration ([#1630](https://github.com/nrwl/nx-console/issues/1630)) ([5b5e2e0](https://github.com/nrwl/nx-console/commit/5b5e2e0b02b2ef612fffafb6872bef8a105a2b87))
* **intellij:** add telemetry ([#1634](https://github.com/nrwl/nx-console/issues/1634) ([c80ebdf](https://github.com/nrwl/nx-console/commit/c80ebdfe37a56fdd7c4049ac8105d8516a3ee7ae))
* **intellij:** integrate project graph webview ([#1603](https://github.com/nrwl/nx-console/issues/1603)) ([1468f07](https://github.com/nrwl/nx-console/commit/1468f0762f4a602b689112107baf5a66e6c02c81))
* **intellij:** run with wsl ([#1641](https://github.com/nrwl/nx-console/issues/1641)) ([460d286](https://github.com/nrwl/nx-console/commit/460d286e08c1ca1be2db9c23574ba75f76a0bf91))
* **intellij:** show console running indicator ([#1593](https://github.com/nrwl/nx-console/issues/1593)) ([b7ec0fd](https://github.com/nrwl/nx-console/commit/b7ec0fd58162174f18b87c5618f6c3e1164d0b7c))
* **intellij:** suggest installing plugin by dependency support ([#1592](https://github.com/nrwl/nx-console/issues/1592)) ([2d5890b](https://github.com/nrwl/nx-console/commit/2d5890bf9145bcc67b755c24a5e2cc10eac11f62))
* **nxls:** provide generator aliases via nxls ([#1598](https://github.com/nrwl/nx-console/issues/1598)) ([63f44ce](https://github.com/nrwl/nx-console/commit/63f44ce925613ea132808e81ac775e8a36d0f8a1))
* **nxls:** support executors in and from targetDefaults ([#1621](https://github.com/nrwl/nx-console/issues/1621)) ([1d0c263](https://github.com/nrwl/nx-console/commit/1d0c263da44a2613a36f6a3aa64d0a3d8ff5e9ee))
* remove angular cli compatibility ([#1575](https://github.com/nrwl/nx-console/issues/1575)) ([702e205](https://github.com/nrwl/nx-console/commit/702e205d5629059ad5fb5ca7c5d102d0cca0c4ce))

## 1.2.0 (2023-03-02)

### Bug Fixes

* **generate-ui:** make sure the form is centered correctly on large screens ([#1568](https://github.com/nrwl/nx-console/issues/1568)) ([31b4930](https://github.com/nrwl/nx-console/commit/31b4930022a5699fa0422a60271350b999598af2))
* **generate-ui:** repair dry-run button font color ([#1564](https://github.com/nrwl/nx-console/issues/1564)) ([29f87fe](https://github.com/nrwl/nx-console/commit/29f87fed22a8547715ce8113b9ada2ef3c6af20c))
* **intellij:** move generate ui context menu to the new group ([#1576](https://github.com/nrwl/nx-console/issues/1576)) ([5b33f05](https://github.com/nrwl/nx-console/commit/5b33f054e4eea1be10f4dcc6e0faa4969f255d15))
* **intellij:** open nx generate ui file on same window ([#1548](https://github.com/nrwl/nx-console/issues/1548)) ([b2c7ac7](https://github.com/nrwl/nx-console/commit/b2c7ac7b98985feaa32037d0495ec27291039084))
* **intellij:** throw explicit error when trying to (re)move and no generators exist ([#1573](https://github.com/nrwl/nx-console/issues/1573)) ([7a3bf70](https://github.com/nrwl/nx-console/commit/7a3bf70827b176e98c18ce64d3e3be2442066b40))
* **intellij:** use the local binary for nx generate instead of package managers ([#1549](https://github.com/nrwl/nx-console/issues/1549)) ([97cb994](https://github.com/nrwl/nx-console/commit/97cb99486a46e55094aae9f35e80ed9314a7a062))
* **nxls:** also check sourceRoot when getting project by path ([#1554](https://github.com/nrwl/nx-console/issues/1554)) ([65a5b09](https://github.com/nrwl/nx-console/commit/65a5b0928d9a4ff42cf71f0ec4abad156d2970cf))
* **nxls:** do not include workspace layout in directory context for generate calls ([#1577](https://github.com/nrwl/nx-console/issues/1577)) ([340c2a3](https://github.com/nrwl/nx-console/commit/340c2a3ead6f64a3ce34528915af716c543c8dd2))
* **nxls:** don't default appsDir and libsDir ([#1562](https://github.com/nrwl/nx-console/issues/1562)) ([e022c7c](https://github.com/nrwl/nx-console/commit/e022c7cffc9661a576978d9c82f1267b7c581d03))
* **nxls:** make passing generator optional when calculating generator context ([#1551](https://github.com/nrwl/nx-console/issues/1551)) ([3c4ff27](https://github.com/nrwl/nx-console/commit/3c4ff276ec70095156cd46fcccfdc347f95c696f))
* **nxls:** read node_modules from encapsulated nx ([#1566](https://github.com/nrwl/nx-console/issues/1566)) ([7f5cdf2](https://github.com/nrwl/nx-console/commit/7f5cdf2e5e30579599d782b94015b84eb556d0d1))
* update nx-console 16x16 icon ([#1559](https://github.com/nrwl/nx-console/issues/1559)) ([304c441](https://github.com/nrwl/nx-console/commit/304c441adcaa877f6499127d8794f609bce35a2b))


### Features

* **intellij:** add (re)move project action ([#1552](https://github.com/nrwl/nx-console/issues/1552)) ([98286a0](https://github.com/nrwl/nx-console/commit/98286a032691a7d809c1ab08e08586f8ca1b5630))
* **intellij:** add application-wide nx-console settings ([#1565](https://github.com/nrwl/nx-console/issues/1565)) ([0ce5890](https://github.com/nrwl/nx-console/commit/0ce5890916fc1ebe0bd9aa4ad489678e28876322))
* **intellij:** add nx create workspace project generator ([#1544](https://github.com/nrwl/nx-console/issues/1544)) ([5dd9afd](https://github.com/nrwl/nx-console/commit/5dd9afd397dedb877a321d933dd90f14785485f4))
* **intellij:** add nx generate run anything command line provider ([#1570](https://github.com/nrwl/nx-console/issues/1570)) ([6c9f1a0](https://github.com/nrwl/nx-console/commit/6c9f1a065757e8d6f8377bb53e3ad597765f18ee))
* **intellij:** add nx run configuration ([#1572](https://github.com/nrwl/nx-console/issues/1572)) ([0ffe568](https://github.com/nrwl/nx-console/commit/0ffe56842f310b517993ffa8d45b969f9c4a44b2))
* **intellij:** add setting to specify non-root nx workspace path ([#1569](https://github.com/nrwl/nx-console/issues/1569)) ([961a7fc](https://github.com/nrwl/nx-console/commit/961a7fc1c0f52d70f7fc0f27ea17002fb3bedc96))
* **intellij:** set custom renderer for nx generate ui popup ([#1555](https://github.com/nrwl/nx-console/issues/1555)) ([756fdfb](https://github.com/nrwl/nx-console/commit/756fdfb545de413436193227d273d078628d7829))
* **nxls:** add support for encapsulated nx ([#1556](https://github.com/nrwl/nx-console/issues/1556)) ([0993c8a](https://github.com/nrwl/nx-console/commit/0993c8a1af6590a172dc4da3b55c191495d0516a))

## 1.1.0 (2023-02-17)

### Bug Fixes

* **generate-ui:** repair scrolling by clicking the sidebar ([#1542](https://github.com/nrwl/nx-console/issues/1542)) ([476a1a8](https://github.com/nrwl/nx-console/commit/476a1a812d3aab94d17f2cd18e67e9f2a55d9a89))
* **intellij:** fix running generators with pnpm ([#1539](https://github.com/nrwl/nx-console/issues/1539)) ([fb7b416](https://github.com/nrwl/nx-console/commit/fb7b41654fb55d78ccf87c671a2c227e35f62d9b))
* **intellij:** require ide restart after installing ([#1543](https://github.com/nrwl/nx-console/issues/1543)) ([deab100](https://github.com/nrwl/nx-console/commit/deab1004adc6a0f95ac56914e480253eb6a8e286))
* make sure first positional args are in the right order & fallback to old sorting ([#1541](https://github.com/nrwl/nx-console/issues/1541)) ([9b1a53e](https://github.com/nrwl/nx-console/commit/9b1a53ea9d6fa6a15cea340413662d99438afd81))


### Features

* **intellij:** provide file links for created/updated files ([#1537](https://github.com/nrwl/nx-console/issues/1537)) ([589c310](https://github.com/nrwl/nx-console/commit/589c31049f987ef18b1913f7766ec75a6bd64a6b))

## <small>1.0.1 (2023-02-14)</small>

### Bug Fixes

* revert back to parcel/watcher@2.0.7 ([076705f](https://github.com/nrwl/nx-console/commit/076705f2749c4cd945faac40dfb516a801fc2704))

## 1.0.0 (2023-02-14)

### Bug Fixes

* adjust checkmark color in
  intellij ([#1511](https://github.com/nrwl/nx-console/issues/1511)) ([e7d5feb](https://github.com/nrwl/nx-console/commit/e7d5febc8e0f971221c279b0904fdaa931ff3a59))
* autofocus first field when opening generate
  ui ([#1516](https://github.com/nrwl/nx-console/issues/1516)) ([068a78a](https://github.com/nrwl/nx-console/commit/068a78a968f3d096b4b6e14ef7138a50ba1316d8))
* **generate-ui:** fix search bar in
  intellij ([#1521](https://github.com/nrwl/nx-console/issues/1521)) ([745557f](https://github.com/nrwl/nx-console/commit/745557fbd03824dc485a5328bc082167b4044290))
* **generate-ui:** force unbreakable strings to break instead of
  overflowing ([#1518](https://github.com/nrwl/nx-console/issues/1518)) ([f85f7ba](https://github.com/nrwl/nx-console/commit/f85f7ba113712dd5804b9323054fe220e1f8d8d3))
* handle schema file refs better for
  windows ([#1512](https://github.com/nrwl/nx-console/issues/1512)) ([8c639e1](https://github.com/nrwl/nx-console/commit/8c639e134ee563c9925ea9271b4badcf39e0efff))
* **intellij:** add more logging for lsp messages and handle document listener
  exceptions ([#1491](https://github.com/nrwl/nx-console/issues/1491)) ([7339bc4](https://github.com/nrwl/nx-console/commit/7339bc4e0252c33775f4456edd860b0cd9c1d56e))
* **intellij:** only prefill generate ui context from context
  menu ([#1520](https://github.com/nrwl/nx-console/issues/1520)) ([141c9ee](https://github.com/nrwl/nx-console/commit/141c9eedab5a3f2478e3bff63c2286c9f72ffad5))
* **intellij:** properly display dropdown fields in the
  generate-ui ([#1503](https://github.com/nrwl/nx-console/issues/1503)) ([285ff94](https://github.com/nrwl/nx-console/commit/285ff9436b9bcb009dc923d2c3313cc7879f89fc))
* **intellij:** serialize more generator option
  properties ([#1506](https://github.com/nrwl/nx-console/issues/1506)) ([2802ebc](https://github.com/nrwl/nx-console/commit/2802ebc5c10835ca5b5963155f4c72171715e7e5))
* **nxls:** update
  @parcel/watcher ([#1526](https://github.com/nrwl/nx-console/issues/1526)) ([ce1b0ab](https://github.com/nrwl/nx-console/commit/ce1b0ab4642eb369fdf4ee7440277f5949406f36))
* remove the usage of
  configurationPath ([#1493](https://github.com/nrwl/nx-console/issues/1493)) ([8295def](https://github.com/nrwl/nx-console/commit/8295def416ba59ef1b5e66e0fc1fcd34b7aa4363))
* take nx-cloud.env into account for cloud
  view ([#1475](https://github.com/nrwl/nx-console/issues/1475)) ([fdc376e](https://github.com/nrwl/nx-console/commit/fdc376e1365adfafe04cad3e23d0ef984fef327f))
* update styles and fix style-related bugs in generate
  ui ([#1517](https://github.com/nrwl/nx-console/issues/1517)) ([2f936bf](https://github.com/nrwl/nx-console/commit/2f936bfa02184135e09d01d115aac36f8fefb1a3))

### Features

* add first draft of generate ui to
  intellij ([#1487](https://github.com/nrwl/nx-console/issues/1487)) ([3f6b2f6](https://github.com/nrwl/nx-console/commit/3f6b2f6c06c4065a6054b8ffe898b4f5cfed9863))
* add NxGeneratorOptions request to
  nxls ([#1486](https://github.com/nrwl/nx-console/issues/1486)) ([92cc757](https://github.com/nrwl/nx-console/commit/92cc757e41a043608fa375f45dd531b676a5b33e))
* **generate-ui:** split form by x-priority
  attribute ([#1528](https://github.com/nrwl/nx-console/issues/1528)) ([3520c79](https://github.com/nrwl/nx-console/commit/3520c792791874c0af383e42d3b59afc0e2d4ec7))
* hide deprecated generators and
  executors ([#1489](https://github.com/nrwl/nx-console/issues/1489)) ([e26347b](https://github.com/nrwl/nx-console/commit/e26347b871ffb0e3a21bc405721f2889594d5771))
* **intellij:** add hover support from
  lsp ([#1514](https://github.com/nrwl/nx-console/issues/1514)) ([681ef59](https://github.com/nrwl/nx-console/commit/681ef59df7282299d2d6bd275515b3f394180f30))
* **intellij:** add icons for
  intellij ([#1499](https://github.com/nrwl/nx-console/issues/1499)) ([8b8a7df](https://github.com/nrwl/nx-console/commit/8b8a7df77718f7bee073264972505cab76b93eac))
* **intellij:** include nxls in the intellij
  bundle ([#1494](https://github.com/nrwl/nx-console/issues/1494)) ([17cd310](https://github.com/nrwl/nx-console/commit/17cd3108fb021777290cfcb1f9eff7f1d9ab0f5e))
* **intellij:** open generate ui with project right
  click ([#1513](https://github.com/nrwl/nx-console/issues/1513)) ([43bd083](https://github.com/nrwl/nx-console/commit/43bd083133b165dc07820aedcfa66ba2841d03b9))
* **intellij:** show generate-ui in
  intellij ([#1497](https://github.com/nrwl/nx-console/issues/1497)) ([eedf023](https://github.com/nrwl/nx-console/commit/eedf0236fc8f8d8f6cc00357c86accd531e733c4))
* **intellij:** show generate-ui output in run
  toolwindow ([#1523](https://github.com/nrwl/nx-console/issues/1523)) ([10ce340](https://github.com/nrwl/nx-console/commit/10ce34055a551b88d9a153eeb9c181c88dee4987))
* sort generator flags by
  priority ([#1502](https://github.com/nrwl/nx-console/issues/1502)) ([054ff64](https://github.com/nrwl/nx-console/commit/054ff64488bd2070d1a03844899a5ebcf878e1b5))

<!-- Keep a Changelog guide -> https://keepachangelog.com -->

# nx-console Changelog

## [0.0.1]

### Added

- Initial scaffold created
  from [IntelliJ Platform Plugin Template](https://github.com/JetBrains/intellij-platform-plugin-template)
