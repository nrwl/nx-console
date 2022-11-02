# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [17.24.1](https://github.com/nrwl/nx-console/compare/v17.24.0...v17.24.1) (2022-11-02)


### Bug Fixes

* do not show nx daemon message ([7bfaabc](https://github.com/nrwl/nx-console/commits/7bfaabc83cc8f288d1eba41e7b0cfa3f49e496f7))

## [17.24.0](https://github.com/nrwl/nx-console/compare/v17.23.3...v17.24.0) (2022-11-02)


### Features

* add connect-to-nx-cloud command ([#1375](https://github.com/nrwl/nx-console/issues/1375)) ([22af88c](https://github.com/nrwl/nx-console/commits/22af88c749e37267fabdb0764a6bd6d882757c57))
* change execute dryrun on change to true ([4aa810a](https://github.com/nrwl/nx-console/commits/4aa810acbb3a665bcb50dd80605d18f5fda0696c))
* check if nx daemon is enabled ([#1397](https://github.com/nrwl/nx-console/issues/1397)) ([a4888eb](https://github.com/nrwl/nx-console/commits/a4888ebb22dcdf7e5d97be7c940045d435b6e0b2))
* configurable dry runs on change ([#1380](https://github.com/nrwl/nx-console/issues/1380)) ([0d5634d](https://github.com/nrwl/nx-console/commits/0d5634df3f75a6a0cfdbaa57854c580e6138a878))
* project tree view ([#1390](https://github.com/nrwl/nx-console/issues/1390)) ([ea9445d](https://github.com/nrwl/nx-console/commits/ea9445d0275eabc81c678bd3ba7c656ceb0eb968))


### Bug Fixes

* add argument flags for positional arguments greater than 0 ([#1389](https://github.com/nrwl/nx-console/issues/1389)) ([d30d166](https://github.com/nrwl/nx-console/commits/d30d1663c4cf9c069de148152c59791589b5fcd0))
* handle more nx daemon cases ([#1399](https://github.com/nrwl/nx-console/issues/1399)) ([123101c](https://github.com/nrwl/nx-console/commits/123101cf8a0e0ae067b44fb6c06389063a88945a))
* stop daemon on extension deactivation ([#1394](https://github.com/nrwl/nx-console/issues/1394)) ([0f862de](https://github.com/nrwl/nx-console/commits/0f862de039cd7239ba8e4b91d349654bfdb0591c))

### [17.23.3](https://github.com/nrwl/nx-console/compare/v17.23.2...v17.23.3) (2022-10-12)


### Bug Fixes

* check lerna version for nx workspace ([#1382](https://github.com/nrwl/nx-console/issues/1382)) ([034e288](https://github.com/nrwl/nx-console/commits/034e288313306557e9fc34b10f31b5be5b604785))
* wait for nx console viewcontrol ([#1368](https://github.com/nrwl/nx-console/issues/1368)) ([f029c23](https://github.com/nrwl/nx-console/commits/f029c23fad651d28c1ef4d3f5302975311f25851))

### [17.23.2](https://github.com/nrwl/nx-console/compare/v17.23.1...v17.23.2) (2022-09-23)


### Bug Fixes

* reset the daemon client when getting the project graph ([#1363](https://github.com/nrwl/nx-console/issues/1363)) ([59d4928](https://github.com/nrwl/nx-console/commits/59d4928c054a1ff809866fd72bd3df8ca07cd0f6))

### [17.23.1](https://github.com/nrwl/nx-console/compare/v17.23.0...v17.23.1) (2022-09-22)


### Bug Fixes

* handle non existent json service ([#1361](https://github.com/nrwl/nx-console/issues/1361)) ([17bfbc6](https://github.com/nrwl/nx-console/commits/17bfbc6e56f953b6838fd29f9e95d0824c699804))

## [17.23.0](https://github.com/nrwl/nx-console/compare/v17.22.0...v17.23.0) (2022-09-22)


### Features

* enable add-dependency version selection ([#1357](https://github.com/nrwl/nx-console/issues/1357)) ([c87da06](https://github.com/nrwl/nx-console/commits/c87da062dd5d3f66ce7cc220f633be3382803125))
* **nxls:** add support for nx.json ([#1344](https://github.com/nrwl/nx-console/issues/1344)) ([e2ace3b](https://github.com/nrwl/nx-console/commits/e2ace3b7dddac5e4211d24a7f927e6ce1ddcbdc7))
* add dependency functionality ([#1339](https://github.com/nrwl/nx-console/issues/1339)) ([0702b0d](https://github.com/nrwl/nx-console/commits/0702b0d4717e90fb6d2fd6a94e1f289f0313773f))
* **nxls:**  auto complete for `tags`, `targets`,  `projects`, `inputNames` completion types ([#1343](https://github.com/nrwl/nx-console/issues/1343)) ([4aeb8f9](https://github.com/nrwl/nx-console/commits/4aeb8f928ecfccaabcf59ed7402e91d632f23b5c))
* **nxls:** add support for nx in package.json files ([#1342](https://github.com/nrwl/nx-console/issues/1342)) ([1cb0a4e](https://github.com/nrwl/nx-console/commits/1cb0a4ea7a053bc4a5034f1c97dcd752fecfd0d1))


### Bug Fixes

* always send "GET_CONTENT" for graph actions ([#1350](https://github.com/nrwl/nx-console/issues/1350)) ([c9f2f6a](https://github.com/nrwl/nx-console/commits/c9f2f6a7bbcd3a7af52fdd73b5deb54c7bce717e))
* always start the graph service on graph commands ([#1349](https://github.com/nrwl/nx-console/issues/1349)) ([a820fef](https://github.com/nrwl/nx-console/commits/a820fefc5cdb72de870aef4cc539bd60596975fa))
* get the package name if it comes with a version when adding a dependency ([#1353](https://github.com/nrwl/nx-console/issues/1353)) ([1d7827f](https://github.com/nrwl/nx-console/commits/1d7827f4f7636b3e7defae10f27a17bf9e866e6a))
* trigger  GET_CONTENT on all states for the graph ([#1358](https://github.com/nrwl/nx-console/issues/1358)) ([92ecb61](https://github.com/nrwl/nx-console/commits/92ecb61cc9051ffd317b93b89a0c3be133bc2ffb))
* **nxls:** filter target dependencies ([cf5c7c3](https://github.com/nrwl/nx-console/commits/cf5c7c3de36fcc353df2da7ee4c546b0a0233d20))
* **nxls:** handle unhandled exceptions ([4d7e982](https://github.com/nrwl/nx-console/commits/4d7e9825d67cd333dcd6a6715db9a9e4c7c69f02))

## [17.22.0](https://github.com/nrwl/nx-console/compare/v17.21.0...v17.22.0) (2022-09-12)


### Features

* **nxls:** get project targets for the language server ([#1330](https://github.com/nrwl/nx-console/issues/1330)) ([0e5ca81](https://github.com/nrwl/nx-console/commits/0e5ca812eb143dd827072fffc0ba2016dfcbe7ac))
* add help & feedback view ([#1331](https://github.com/nrwl/nx-console/issues/1331)) ([abf9cbe](https://github.com/nrwl/nx-console/commits/abf9cbe178027fca0b656767b1279232762fefc0))


### Bug Fixes

* remove broken commands from command palette ([#1335](https://github.com/nrwl/nx-console/issues/1335)) ([3f7fc6c](https://github.com/nrwl/nx-console/commits/3f7fc6c6039a6f0ef3ef848fa32a0ad5d033ed29))

## [17.21.0](https://github.com/nrwl/nx-console/compare/v17.20.0...v17.21.0) (2022-08-29)


### Features

* **nxls:** add document links ([#1327](https://github.com/nrwl/nx-console/issues/1327)) ([2693834](https://github.com/nrwl/nx-console/commits/269383426540c17a5783b98192a657c27aaac4c4))
* **nxls:** path completion for files and directories ([#1326](https://github.com/nrwl/nx-console/issues/1326)) ([816a4d8](https://github.com/nrwl/nx-console/commits/816a4d8ccd518ea4227f00a4e3af1cd7d06cc3cd))


### Bug Fixes

* read builder schema for local plugins when running targets ([#1329](https://github.com/nrwl/nx-console/issues/1329)) ([7932691](https://github.com/nrwl/nx-console/commits/7932691e8e3b4cfa2e64f03c9ced2269e9d4b35d))
* **nxls:** get the working path from rootUri ([cf56f10](https://github.com/nrwl/nx-console/commits/cf56f10b8df09ecb08dea3fe9ef29b059f74bae2))

## [17.20.0](https://github.com/nrwl/nx-console/compare/v17.19.1...v17.20.0) (2022-08-10)


### Features

* nx lsp ([#1316](https://github.com/nrwl/nx-console/issues/1316)) ([ab8031c](https://github.com/nrwl/nx-console/commits/ab8031c0711ce18cfb8d91c82321b9ca2f3d7f94))


### Bug Fixes

* do not include workspace deps in project view ([#1321](https://github.com/nrwl/nx-console/issues/1321)) ([09c97b8](https://github.com/nrwl/nx-console/commits/09c97b88a6f3e83206151fc4c0423bc481af05a5))
* x-dropdown options populate projects properly ([#1322](https://github.com/nrwl/nx-console/issues/1322)) ([9164f09](https://github.com/nrwl/nx-console/commits/9164f09f2d17a51bb6b5c232abd373e3b46becfc))
* **nxls:** catch errors if not in a workspace with node_modules ([1da4886](https://github.com/nrwl/nx-console/commits/1da4886a1e8e629b44c2d18a0bc1322b0a6d55d8))

### [17.19.1](https://github.com/nrwl/nx-console/compare/v17.19.0...v17.19.1) (2022-08-02)


### Bug Fixes

* handle hyphenation when looking for generator defaults ([#1315](https://github.com/nrwl/nx-console/issues/1315)) ([60bdadf](https://github.com/nrwl/nx-console/commits/60bdadf35102bc6f2327cffaf7e01f395f2c7858)), closes [#1313](https://github.com/nrwl/nx-console/issues/1313)
* provide better error messages and recovery for invalid graph states ([#1314](https://github.com/nrwl/nx-console/issues/1314)) ([9efb7bf](https://github.com/nrwl/nx-console/commits/9efb7bfd55b6624ebd9f6017bedf8774a5e90366))

## [17.19.0](https://github.com/nrwl/nx-console/compare/v17.18.8...v17.19.0) (2022-07-22)


### Features

* add an allowlist and a blocklist for generators ([#1309](https://github.com/nrwl/nx-console/issues/1309)) ([86d0c35](https://github.com/nrwl/nx-console/commits/86d0c355627145fc77f5ad72e13a9b176d177f0b))
* project graph integration ([#1305](https://github.com/nrwl/nx-console/issues/1305)) ([ebcd217](https://github.com/nrwl/nx-console/commits/ebcd21767e2eaab1cf2cd216303d2578b22890ac))

### [17.18.8](https://github.com/nrwl/nx-console/compare/v17.18.7...v17.18.8) (2022-07-13)


### Bug Fixes

* allow project graph loading with angular + nx workspaces ([#1306](https://github.com/nrwl/nx-console/issues/1306)) ([d89ff6d](https://github.com/nrwl/nx-console/commits/d89ff6d0c33a4a96a5fb2b27ad46586de21d4a49))

### [17.18.7](https://github.com/nrwl/nx-console/compare/v17.18.6...v17.18.7) (2022-07-04)


### Bug Fixes

* hyphenate arguments for ng workspaces ([#1304](https://github.com/nrwl/nx-console/issues/1304)) ([9ef6bf4](https://github.com/nrwl/nx-console/commits/9ef6bf456246bdab4f6c5399c24225105c74ebae))
* optimize file watches ([#1303](https://github.com/nrwl/nx-console/issues/1303)) ([8caaaaf](https://github.com/nrwl/nx-console/commits/8caaaafbab7e87d3de953d266e041ce4795d9edc))

### [17.18.6](https://github.com/nrwl/nx-console/compare/v17.18.5...v17.18.6) (2022-06-28)


### Bug Fixes

* debounce refresh workspace to prevent thrashing ([45fae41](https://github.com/nrwl/nx-console/commits/45fae414169433cfa734d53306bd0c5bdff5eb0c))

### [17.18.5](https://github.com/nrwl/nx-console/compare/v17.18.4...v17.18.5) (2022-06-22)


### Bug Fixes

* package external extension dependencies ([#1299](https://github.com/nrwl/nx-console/issues/1299)) ([03e1421](https://github.com/nrwl/nx-console/commits/03e142178cae2baff545b71bbdd658e89e1f0e28))

### [17.18.4](https://github.com/nrwl/nx-console/compare/v17.18.3...v17.18.4) (2022-06-20)


### Bug Fixes

* await workspace reset ([2e9d880](https://github.com/nrwl/nx-console/commits/2e9d880afde6173be776d7d01cd6ec46904ca6b2))

### [17.18.3](https://github.com/nrwl/nx-console/compare/v17.18.2...v17.18.3) (2022-06-20)


### Bug Fixes

* camel case targets not working in generate & run target pane ([#1293](https://github.com/nrwl/nx-console/issues/1293)) ([e0f1025](https://github.com/nrwl/nx-console/commits/e0f10256a6b424d04c7db25e613a410447692ecb))
* clear angular.json/workspace.json cache for older workspaces ([0b717cd](https://github.com/nrwl/nx-console/commits/0b717cd0b1ee371f945bc325225ac4815b7c6e3c))
* improve performance for retrieving workspace details ([#1295](https://github.com/nrwl/nx-console/issues/1295)) ([f8d32ca](https://github.com/nrwl/nx-console/commits/f8d32caf3224125228b6d677cd0271b80074e190))

### [17.18.2](https://github.com/nrwl/nx-console/compare/v17.18.1...v17.18.2) (2022-06-10)


### Bug Fixes

* check if projectGraph is out of sync ([#1292](https://github.com/nrwl/nx-console/issues/1292)) ([189c238](https://github.com/nrwl/nx-console/commits/189c238a642ec17569a80eff8475df4c74370ea3))

### [17.18.1](https://github.com/nrwl/nx-console/compare/v17.18.0...v17.18.1) (2022-06-06)


### Bug Fixes

* await promise for project code lens ([769732f](https://github.com/nrwl/nx-console/commits/769732f6f5375d7cb9d29e4f4107acf5c26dfadb))

## [17.18.0](https://github.com/nrwl/nx-console/compare/v17.17.0...v17.18.0) (2022-06-03)


### Features

* support package.json projects ([#1287](https://github.com/nrwl/nx-console/issues/1287)) ([6838052](https://github.com/nrwl/nx-console/commits/6838052abaadaf1e5d18bf2ab6b577fc2e8b9056))

## [17.17.0](https://github.com/nrwl/nx-console/compare/v17.16.0...v17.17.0) (2022-05-20)


### Bug Fixes

* always use full `--configuration` flag ([#1283](https://github.com/nrwl/nx-console/issues/1283)) ([86f0d30](https://github.com/nrwl/nx-console/commits/86f0d30a17cf625ef91dbeae9ee7188800c7f5e9))
* remove check for generate, and allow all commads for prompts ([eecc7f5](https://github.com/nrwl/nx-console/commits/eecc7f59a8ae8f96f7d417a4667ec8dc0c17753c))

## [17.16.0](https://github.com/nrwl/nx-console/compare/v17.15.0...v17.16.0) (2022-04-29)


### Features

* list local plugins ([#1274](https://github.com/nrwl/nx-console/issues/1274)) ([2e6fe76](https://github.com/nrwl/nx-console/commits/2e6fe76e9063516ad0b887da6a92598d0dd3c74a))
* Nx Move and Remove Project in Context Menu ([#1256](https://github.com/nrwl/nx-console/issues/1256)) ([ebc2a9c](https://github.com/nrwl/nx-console/commits/ebc2a9c4836c83bbf6bfe52b5fd164f82164b094))


### Bug Fixes

* check if dependency path type is directory with bit flag ([#1267](https://github.com/nrwl/nx-console/issues/1267)) ([e75daac](https://github.com/nrwl/nx-console/commits/e75daac604364b22d0891a1ea141c8abc115f2c6))
* fall back to sourceRoot when determining target projects from the context menu ([4b6ed11](https://github.com/nrwl/nx-console/commits/4b6ed11cae922809c4ba6411452c2bad525ccf43))
* fixing missing key for remove.fileexplorer ([#1275](https://github.com/nrwl/nx-console/issues/1275)) ([53ce4e2](https://github.com/nrwl/nx-console/commits/53ce4e2737349bb6e9394d0e9bc0fbb13165d4ef))
* properly check positional argument for generating with UI ([#1268](https://github.com/nrwl/nx-console/issues/1268)) ([764b95f](https://github.com/nrwl/nx-console/commits/764b95f8cc7cdc2e17c5741af1374eeb98d758bc))
* sort properties by required ([#1269](https://github.com/nrwl/nx-console/issues/1269)) ([5f58cd5](https://github.com/nrwl/nx-console/commits/5f58cd514ae087562d74ef71fb3a4de785731908))

## [17.15.0](https://github.com/nrwl/nx-console/compare/v17.14.1...v17.15.0) (2022-04-06)


### Features

* add prompts to add nx to angular cli ([#1254](https://github.com/nrwl/nx-console/issues/1254)) ([a669307](https://github.com/nrwl/nx-console/commits/a6693076d8987f370207ed965d3e5a91bde11f54))
* adding run target to the commands ([#1249](https://github.com/nrwl/nx-console/issues/1249)) ([c4a0cbe](https://github.com/nrwl/nx-console/commits/c4a0cbe4887fc9a49638c8a456e5f6ee284ea191))
* making the contents of the run target view match the workspace ([#1250](https://github.com/nrwl/nx-console/issues/1250)) ([11a8f60](https://github.com/nrwl/nx-console/commits/11a8f60b8efac21808032c75b7922a3508868751))


### Bug Fixes

* make sure that arguments are unique for the UI form ([#1248](https://github.com/nrwl/nx-console/issues/1248)) ([10fd881](https://github.com/nrwl/nx-console/commits/10fd881649c2f04bf487e60f1ac343c7f2d10a8c))
* make sure to read schemas from both builders and executors for builder ([#1252](https://github.com/nrwl/nx-console/issues/1252)) ([f20cce9](https://github.com/nrwl/nx-console/commits/f20cce917043f69733e27766755dbc4a254d28a8))

### [17.14.1](https://github.com/nrwl/nx-console/compare/v17.14.0...v17.14.1) (2022-02-07)


### Bug Fixes

* affected commands no longer clear flags first time through ([#1242](https://github.com/nrwl/nx-console/issues/1242)) ([0a0faca](https://github.com/nrwl/nx-console/commits/0a0facacc107e03d4cbad34b45b039c3cc9f1843))
* remove `file:\\` when trying to read files with yarn's crossFs ([#1244](https://github.com/nrwl/nx-console/issues/1244)) ([35fe970](https://github.com/nrwl/nx-console/commits/35fe970b8d69335b6943ccf4ad7dd28d4f4ada38))

## [17.14.0](https://github.com/nrwl/nx-console/compare/v17.13.7...v17.14.0) (2022-02-04)


### Features

* add support for yarn pnp ([#1213](https://github.com/nrwl/nx-console/issues/1213)) ([b6cfdbf](https://github.com/nrwl/nx-console/commits/b6cfdbffad948c87f6eb67a5b18395daa06154e3))
* use cmd/ctrl+enter to execute generator while in the UI form ([#1229](https://github.com/nrwl/nx-console/issues/1229)) ([0e2e427](https://github.com/nrwl/nx-console/commits/0e2e427c3fd7e60aaa63f5e63bd7d7621956aee7))


### Bug Fixes

* check for duplicate collections based on type ([#1241](https://github.com/nrwl/nx-console/issues/1241)) ([079bbb0](https://github.com/nrwl/nx-console/commits/079bbb0a8e726f3cc047c5f822acebc025f8187a))
* inline copy-to-clipboard icon ([#1220](https://github.com/nrwl/nx-console/issues/1220)) ([5e113df](https://github.com/nrwl/nx-console/commits/5e113dfefe9fc3318965d043e37128e6b7cdce42))
* run executors that are local to the workspace (ie local executors) ([#1230](https://github.com/nrwl/nx-console/issues/1230)) ([a7f2362](https://github.com/nrwl/nx-console/commits/a7f236278167eb777ff7fc5b81010e5dc4312a37))
* show description when running workspace generators/schematics ([#1225](https://github.com/nrwl/nx-console/issues/1225)) ([776d2a4](https://github.com/nrwl/nx-console/commits/776d2a47f10bd3e287de49021dbc9c16daabf121))
* update default branch text to "main" ([#1143](https://github.com/nrwl/nx-console/issues/1143)) ([a15f2b4](https://github.com/nrwl/nx-console/commits/a15f2b4d7f0f3939226c705f79825b18a22ec378))

### [17.13.7](https://github.com/nrwl/nx-console/compare/v17.13.6...v17.13.7) (2022-01-14)


### Bug Fixes

* handle absence of "properties" in schema ([#1208](https://github.com/nrwl/nx-console/issues/1208)) ([7d69dc7](https://github.com/nrwl/nx-console/commits/7d69dc70fad5961a37e27a568f2f4865ef264b0d))
* support workspace-generators and workspace-schematics ([#1209](https://github.com/nrwl/nx-console/issues/1209)) ([8a2c48f](https://github.com/nrwl/nx-console/commits/8a2c48f4b31909115b56620f56d92a04d8184e58))

### [17.13.6](https://github.com/nrwl/nx-console/compare/v17.13.5...v17.13.6) (2021-12-23)


### Bug Fixes

* read configurations manually if Nx is lower than 12 ([#1205](https://github.com/nrwl/nx-console/issues/1205)) ([1f31f23](https://github.com/nrwl/nx-console/commits/1f31f237db66b83e3d215d197ae908bf52b695cb))

### [17.13.5](https://github.com/nrwl/nx-console/compare/v17.13.4...v17.13.5) (2021-12-22)


### Bug Fixes

* support workspaces lower than nx 13 ([#1204](https://github.com/nrwl/nx-console/issues/1204)) ([16e3155](https://github.com/nrwl/nx-console/commits/16e315521dbd90de3040abc71c28826fba44af8e))

### [17.13.4](https://github.com/nrwl/nx-console/compare/v17.13.3...v17.13.4) (2021-12-21)


### Bug Fixes

* fallback to built in nx utils if required function doesnt exist ([#1203](https://github.com/nrwl/nx-console/issues/1203)) ([7e8d9b6](https://github.com/nrwl/nx-console/commits/7e8d9b6ee94302afd53a66bd60a88bf16d9ea3d9))

### [17.13.3](https://github.com/nrwl/nx-console/compare/v17.13.2...v17.13.3) (2021-12-17)


### Bug Fixes

* revert activationEvents to `onStartupFinished` ([#1201](https://github.com/nrwl/nx-console/issues/1201)) ([6cbd631](https://github.com/nrwl/nx-console/commits/6cbd631f3a9e80c9550d4f1c053247c3df3adbe7))

### [17.13.2](https://github.com/nrwl/nx-console/compare/v17.13.1...v17.13.2) (2021-12-16)


### Bug Fixes

* revert to old logic for scanning workspaces, also fix checking for paths of undefined ([#1199](https://github.com/nrwl/nx-console/issues/1199)) ([039c24e](https://github.com/nrwl/nx-console/commits/039c24e6d3730d23b73244eaa210a28bccf2d97c))
* use proper workspace path to load generators ([#1200](https://github.com/nrwl/nx-console/issues/1200)) ([6a3358e](https://github.com/nrwl/nx-console/commits/6a3358e0508092496006d1b754435af94cce71e7))

### [17.13.1](https://github.com/nrwl/nx-console/compare/v17.12.4...v17.13.1) (2021-12-11)
### Bug Fixes

* make the `path` option always visible when using generate ([#1192](https://github.com/nrwl/nx-console/issues/1192)) ([ff991e8](https://github.com/nrwl/nx-console/commits/ff991e8d851a77f48be95a9bd2142c909b32f7b7))

## [17.13.0](https://github.com/nrwl/nx-console/compare/v17.12.4...v17.13.0) (2021-12-10)


### Features

* Go to project.json file from workspace file with codelens ([#1176](https://github.com/nrwl/nx-console/issues/1176)) ([ad3578a](https://github.com/nrwl/nx-console/commits/ad3578a1a21ab3c9a5010754c7082ae6822339c1))
* include typescript plugin for imports ([#1177](https://github.com/nrwl/nx-console/issues/1177)) ([9c330ce](https://github.com/nrwl/nx-console/commits/9c330ce65ee683e82de8eb11801d9a3cf1e9c875))
  * This can be disabled by setting `Enable Library Imports` to false in VSCode settings. ([#1183](https://github.com/nrwl/nx-console/issues/1183)) ([53b09eb](https://github.com/nrwl/nx-console/commits/53b09eb361845498234a6556bc296ae302660b02))
* provide json schema for nx.json ([#1186](https://github.com/nrwl/nx-console/issues/1186)) ([70e2bbb](https://github.com/nrwl/nx-console/commits/70e2bbbcb26bd7e568535b1076bd6223d7f254ed))
* use nx utils to read all configuration files ([#1184](https://github.com/nrwl/nx-console/issues/1184)) ([630ac6e](https://github.com/nrwl/nx-console/commits/630ac6ec0929184f98f7526a354bd7ba25bb4e68))

### [17.12.4](https://github.com/nrwl/nx-console/compare/v17.12.3...v17.12.4) (2021-11-19)


### Bug Fixes

* resolve schema paths rather than joining ([#1175](https://github.com/nrwl/nx-console/issues/1175)) ([3ed7119](https://github.com/nrwl/nx-console/commits/3ed7119ee86b33987d580641f5c9c4369e53cbe9))

### [17.12.3](https://github.com/nrwl/nx-console/compare/v17.12.2...v17.12.3) (2021-11-12)


### Bug Fixes

* handle non existant nx.json file better. Fixes pure angular workspaces. ([#1172](https://github.com/nrwl/nx-console/issues/1172)) ([b1705f1](https://github.com/nrwl/nx-console/commits/b1705f140d8ec53ab8e4c9501ff0809484ed9d4e))
* handle non-existing files better and return an empty object ([#1171](https://github.com/nrwl/nx-console/issues/1171)) ([8971434](https://github.com/nrwl/nx-console/commits/89714349f822963d1e12a4f9656ff1dd878a5b98))

### [17.12.2](https://github.com/nrwl/nx-console/compare/v17.12.1...v17.12.2) (2021-10-25)


### Bug Fixes

* make sure that executors/builders and generator/schematics are combined respectively ([#1167](https://github.com/nrwl/nx-console/issues/1167)) ([8b2cd53](https://github.com/nrwl/nx-console/commits/8b2cd5327e30f43e06eb6e7dd66c023785b8ed50))

### [17.12.1](https://github.com/nrwl/nx-console/compare/v17.12.0...v17.12.1) (2021-10-23)


### Bug Fixes

* use require instead of import for loading workspace dependency ([#1165](https://github.com/nrwl/nx-console/issues/1165)) ([254d8e3](https://github.com/nrwl/nx-console/commits/254d8e3666ba41456ec45bb251d836b78351a422))

## [17.12.0](https://github.com/nrwl/nx-console/compare/v17.11.2...v17.12.0) (2021-10-23)


### Performance Improvements

* asynchronously retrieve all collection info (schematics, generators, builders and executors) ([#1160](https://github.com/nrwl/nx-console/issues/1160)) ([e193eb8](https://github.com/nrwl/nx-console/commits/e193eb8b4f3869f81ecb8587975f4cab13b9549c))

### [17.11.2](https://github.com/nrwl/nx-console/compare/v17.11.1...v17.11.2) (2021-09-27)


### Bug Fixes

* use proper file schema for importing on windows ([#1149](https://github.com/nrwl/nx-console/issues/1149)) ([0470a33](https://github.com/nrwl/nx-console/commits/0470a33f7c69e24d4327616593497d08ca76373d))

### [17.11.1](https://github.com/nrwl/nx-console/compare/v17.11.0...v17.11.1) (2021-09-27)


### Bug Fixes

* ensure that projects are properly resolved during async calls ([#1145](https://github.com/nrwl/nx-console/issues/1145)) ([35c40b5](https://github.com/nrwl/nx-console/commits/35c40b50a316c7ce905316af36e789cdf03d7cd1))

## [17.11.0](https://github.com/nrwl/nx-console/compare/v17.10.0...v17.11.0) (2021-09-24)


### Features

* sort projects in project view ([#1137](https://github.com/nrwl/nx-console/issues/1137)) ([7cc9ebe](https://github.com/nrwl/nx-console/commits/7cc9ebe257999d39cea9cffee0d925e6a693d83a))
* use vscode settings for shell execution ([#1134](https://github.com/nrwl/nx-console/issues/1134)) ([fc4caea](https://github.com/nrwl/nx-console/commits/fc4caeaf3c17c95f1f305d13f6dd062acff5f47c))


### Performance Improvements

* decrease activation time ([#1131](https://github.com/nrwl/nx-console/issues/1131)) ([6a23cea](https://github.com/nrwl/nx-console/commits/6a23ceaff7c4211e36c591892a8510a067f07d4f))

## [17.10.0](https://github.com/nrwl/nx-console/compare/v17.9.0...v17.10.0) (2021-09-03)


### Features

* Add commands to add applications and libraries directly ([#1128](https://github.com/nrwl/nx-console/issues/1128)) ([b908c11](https://github.com/nrwl/nx-console/commits/b908c11aa3b2de1fd35ec52ba243803d2cdaeb34))


### Bug Fixes

* remove loading item from projects view ([#1129](https://github.com/nrwl/nx-console/issues/1129)) ([7ad5f60](https://github.com/nrwl/nx-console/commits/7ad5f60cdba5a0f766592aed5b718ba82c3e0881))
* use proper workspace json path when verifying workspaces ([#1130](https://github.com/nrwl/nx-console/issues/1130)) ([f2365be](https://github.com/nrwl/nx-console/commits/f2365bed33a10e6734fe96e35df01552763905a1))

## [17.9.0](https://github.com/nrwl/nx-console/compare/v17.8.0...v17.9.0) (2021-08-27)


### Features

* support nx.json extends property ([#1124](https://github.com/nrwl/nx-console/issues/1124)) ([507ce24](https://github.com/nrwl/nx-console/commits/507ce24ce3085b933c9da1aa92b35d0c34b0b0c2))


### Performance Improvements

* add onview activation event ([7ac82c0](https://github.com/nrwl/nx-console/commits/7ac82c0106877c01167cc1a20bb740c6feec7c5f))
* use `onStartupFinished` and target es2020 ([0cef34a](https://github.com/nrwl/nx-console/commits/0cef34aab5d57796f69c5e1a0ddfd4ab9bb74265))

## [17.8.0](https://github.com/nrwl/nx-console/compare/v17.7.0...v17.8.0) (2021-08-06)


### Features

* welcome view and getting started walkthrough ([#1069](https://github.com/nrwl/nx-console/issues/1069)) ([7281905](https://github.com/nrwl/nx-console/commits/7281905c7c4625426c291dd6618fb9043cf829f0))


### Bug Fixes

* configurations tabs overflow ([#1118](https://github.com/nrwl/nx-console/issues/1118)) ([2c8bd85](https://github.com/nrwl/nx-console/commits/2c8bd85487e03c75aa8afc377eff909ee1c39032))
* menu scroll hides Run and Search bar header ([#1117](https://github.com/nrwl/nx-console/issues/1117)) ([1f1f888](https://github.com/nrwl/nx-console/commits/1f1f8889650fe2eddfc756888a56eadacbff5279))

## [17.7.0](https://github.com/nrwl/nx-console/compare/v17.6.1...v17.7.0) (2021-07-30)


### Features

* support dep-graph watch option ([#1106](https://github.com/nrwl/nx-console/issues/1106)) ([5e78c4d](https://github.com/nrwl/nx-console/commits/5e78c4d3f98c6c567cc5584d39cd54562f102135))


### Bug Fixes

* add min-height to scroll container so at least 100vh ([#1110](https://github.com/nrwl/nx-console/issues/1110)) ([2ce72a8](https://github.com/nrwl/nx-console/commits/2ce72a811765e8866091ed45b8f2a67a137a0731))
* ensure project path is not just a partial match ([#1108](https://github.com/nrwl/nx-console/issues/1108)) ([7e7705a](https://github.com/nrwl/nx-console/commits/7e7705a17307405af61f81fc70566df7d50aec70))
* include path with project but not directory ([#1112](https://github.com/nrwl/nx-console/issues/1112)) ([6cb987d](https://github.com/nrwl/nx-console/commits/6cb987da18bb4bf4a3953fc3937a6d2d405d583d))
* json schema update for $id ([#1107](https://github.com/nrwl/nx-console/issues/1107)) ([d97db50](https://github.com/nrwl/nx-console/commits/d97db50e2e3efc35e9bc77845dc9742b44b6b30c))
* load workspace file utils directly ([#1113](https://github.com/nrwl/nx-console/issues/1113)) ([a351990](https://github.com/nrwl/nx-console/commits/a35199082992b4bfc081abde169092d51e3924a1))
* support angular.json (v2) having split project.json files ([#1105](https://github.com/nrwl/nx-console/issues/1105)) ([22b685c](https://github.com/nrwl/nx-console/commits/22b685c5c931b1efc60b0f97aa46fe42d052c078))

### [17.6.1](https://github.com/nrwl/nx-console/compare/v17.6.0...v17.6.1) (2021-06-28)


### Bug Fixes

* read and combine both schematics and generators ([#1103](https://github.com/nrwl/nx-console/issues/1103)) ([b275bdc](https://github.com/nrwl/nx-console/commits/b275bdcefb19319d61d0f9e611d9367391103f5c))

## [17.6.0](https://github.com/nrwl/nx-console/compare/v17.5.2...v17.6.0) (2021-06-25)


### Features

* support for project.json schema ([#1101](https://github.com/nrwl/nx-console/issues/1101)) ([6341a77](https://github.com/nrwl/nx-console/commits/6341a775a0fa342d52b4ff8c5458d7a01e37ca9d))
* support split nx projects ([#1102](https://github.com/nrwl/nx-console/issues/1102)) ([2f58b00](https://github.com/nrwl/nx-console/commits/2f58b0028c8e0b1bb685618fd1a61644da4cffc9))

### [17.5.2](https://github.com/nrwl/nx-console/compare/v17.5.1...v17.5.2) (2021-06-22)


### Bug Fixes

* read package.json dependencies when getting builders/executors ([#1100](https://github.com/nrwl/nx-console/issues/1100)) ([187f1f2](https://github.com/nrwl/nx-console/commits/187f1f2f4b6c9bdd3f2026516289fbfb7c75535d))

### [17.5.1](https://github.com/nrwl/nx-console/compare/v17.5.0...v17.5.1) (2021-06-16)


### Bug Fixes

* use proper file paths for schemas within windows ([#1085](https://github.com/nrwl/nx-console/issues/1085)) ([ed9d0c7](https://github.com/nrwl/nx-console/commits/ed9d0c7dd259c86bc9310417577098f97ae25b5f))

## [17.5.0](https://github.com/nrwl/nx-console/compare/v17.4.1...v17.5.0) (2021-06-14)


### Features

* add json schema support for configurations, and also provide descriptions ([#1078](https://github.com/nrwl/nx-console/issues/1078)) ([e9e1d15](https://github.com/nrwl/nx-console/commits/e9e1d15f6773e811d1de3ef0e6036cd68f2faf1b))
* provide json schema for workspace.json ([#1077](https://github.com/nrwl/nx-console/issues/1077)) ([ae35ec5](https://github.com/nrwl/nx-console/commits/ae35ec5dd85a38ce44de2797911dffe7806e2a3b))


### Bug Fixes

* nx generator schemas form ([#1081](https://github.com/nrwl/nx-console/issues/1081)) ([c43f9cc](https://github.com/nrwl/nx-console/commits/c43f9cc0fbfacb43a6fe170aa9faaedd88dbf046))
* strip appsDir and libsDir from path if app|application or lib|library ([#1082](https://github.com/nrwl/nx-console/issues/1082)) ([7db8b08](https://github.com/nrwl/nx-console/commits/7db8b084e2842cd39b17e393066cb0377c0944d9))

### [17.4.1](https://github.com/nrwl/nx-console/compare/v17.4.0...v17.4.1) (2021-05-28)


### Bug Fixes

* don't show ng menus for nx workspaces ([#1076](https://github.com/nrwl/nx-console/issues/1076)) ([152fc20](https://github.com/nrwl/nx-console/commits/152fc20430444c6d65a4e1ce6fc3e465d582aaa4))

## [17.4.0](https://github.com/nrwl/nx-console/compare/v17.3.1...v17.4.0) (2021-05-28)


### Features

* workspace codelens ([#1075](https://github.com/nrwl/nx-console/issues/1075)) ([3e18e99](https://github.com/nrwl/nx-console/commits/3e18e994f489708e86c4dacd8a618322390da728))


### Bug Fixes

* only reads and normalizes selected schematic options ([#1074](https://github.com/nrwl/nx-console/issues/1074)) ([d2c4bd4](https://github.com/nrwl/nx-console/commits/d2c4bd42d290d934920c445cac6481abd28e09fc))

### [17.3.1](https://github.com/nrwl/nx-console/compare/v17.3.0...v17.3.1) (2021-05-14)


### Features

* load workspace defaults into Run executor form ([#1068](https://github.com/nrwl/nx-console/issues/1068)) ([3bb13fe](https://github.com/nrwl/nx-console/commits/3bb13fe299d39a4c4c4cdf698c3b0e9bd9732562))


### Bug Fixes

* add positional to taskDefinitions, fixes task already active ([#1071](https://github.com/nrwl/nx-console/issues/1071)) ([a1afd23](https://github.com/nrwl/nx-console/commits/a1afd23ef23c7bf6f40115661aa3d0800c639740))

## [17.3.0](https://github.com/nrwl/nx-console/compare/v17.2.0...v17.3.0) (2021-05-06)


### Features

* nx run in command palette and context menu ([#1065](https://github.com/nrwl/nx-console/issues/1065)) ([9b5fd5c](https://github.com/nrwl/nx-console/commits/9b5fd5c39d3fde32bb996fe1e4180cdb19955f9c))
* Populates form with workspace defaults for build, e2e, lint, serve, and test targets ([#1067](https://github.com/nrwl/nx-console/issues/1067)) ([fc68c64](https://github.com/nrwl/nx-console/commits/fc68c644767912c9f97be771dd4a059d994b3098))
* run-many prompts for projects ([#1064](https://github.com/nrwl/nx-console/issues/1064)) ([977bdf2](https://github.com/nrwl/nx-console/commits/977bdf261316be44e421cfcf088d710693e71a2a))
* shows argument list and highlights changed and invalid fields in menu ([#1059](https://github.com/nrwl/nx-console/issues/1059)) ([7d8e8e1](https://github.com/nrwl/nx-console/commits/7d8e8e1c91968792cd67d0564375b74c48af31f2))


### Bug Fixes

* enable generate from context menu setting take effect immediately ([#1066](https://github.com/nrwl/nx-console/issues/1066)) ([c3f2b92](https://github.com/nrwl/nx-console/commits/c3f2b923b64d5f5b502c018d368f4c551f57e47a))

## [17.2.0](https://github.com/nrwl/nx-console/compare/v17.1.0...v17.2.0) (2021-04-16)


### Features

* updates form components to support long form items plus specs  ([#1062](https://github.com/nrwl/nx-console/issues/1062)) ([0373a56](https://github.com/nrwl/nx-console/commits/0373a56df680764b6ed34850c8e5eebeae02ed8b)), closes [#984](https://github.com/nrwl/nx-console/issues/984)


### Bug Fixes

* refresh projects view clears cache ([#1058](https://github.com/nrwl/nx-console/issues/1058)) ([4741999](https://github.com/nrwl/nx-console/commits/474199904a5982928343bbeb73bdd256658b4dda))
* replace \ with / in path in workspace before remove leading / ([#1063](https://github.com/nrwl/nx-console/issues/1063)) ([a4f96ca](https://github.com/nrwl/nx-console/commits/a4f96ca7ba9da58c4d488043092ac110170a6a6f))

## [17.1.0](https://github.com/nrwl/nx-console/compare/v17.0.3...v17.1.0) (2021-03-27)


### Features

* allow filtering in the nx project tree view ([#1050](https://github.com/nrwl/nx-console/issues/1050)) ([cfcc306](https://github.com/nrwl/nx-console/commits/cfcc3065b9149a977d1747b1322f8a94bf69d2d3))
* light and dark mode icons ([#1046](https://github.com/nrwl/nx-console/issues/1046)) ([7613fa0](https://github.com/nrwl/nx-console/commits/7613fa05c44263f5c7dee24daf0b219f2e6db382))
* load custom workspace path on extension load ([#1052](https://github.com/nrwl/nx-console/issues/1052)) ([51d5a7a](https://github.com/nrwl/nx-console/commits/51d5a7a4c87f992c551fe26c90936a0af7f9ee38))
* only execute dry run if Generate form is valid ([#1053](https://github.com/nrwl/nx-console/issues/1053)) ([82d561b](https://github.com/nrwl/nx-console/commits/82d561b76f95702212eccf0fbd2871e5235ed3b0))


### Bug Fixes

* remove leading / from path parsed out of the workspace path ([#1054](https://github.com/nrwl/nx-console/issues/1054)) ([2e6449b](https://github.com/nrwl/nx-console/commits/2e6449bc23d5a4c52a5bede26d5c41ab52c47817))

## [17.0.3](https://github.com/nrwl/nx-console/compare/v17.0.0...v17.0.3) (2021-03-13)

### Bug Fixes

* unit tests on vscode-ui libs ([#1035](https://github.com/nrwl/nx-console/issues/1035)) ([715b6e3](https://github.com/nrwl/nx-console/commits/715b6e39c3a538d9962e0eef9ac0b6bb5bfa0ede))
* support directory as path alias from context menu ([#1036](https://github.com/nrwl/nx-console/issues/1036)) ([945ed7b](https://github.com/nrwl/nx-console/commits/945ed7bb1cd6c5daabdf172443f78e44918b9cac))

### Performance Improvements

* increase performance of nx console ([#1038](https://github.com/nrwl/nx-console/issues/1038)) ([e8f3258](https://github.com/nrwl/nx-console/commits/e8f32583a7be03e7d6557e38a3e4123e2cf370b1))
