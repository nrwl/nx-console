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
