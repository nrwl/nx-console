# [1.7.0](https://github.com/nrwl/nx-console/compare/nxls-v1.6.0...nxls-v1.7.0) (2023-02-14)


### Bug Fixes

* handle schema file refs better for windows ([#1512](https://github.com/nrwl/nx-console/issues/1512)) ([8c639e1](https://github.com/nrwl/nx-console/commit/8c639e134ee563c9925ea9271b4badcf39e0efff))
* **nxls:** update @parcel/watcher ([#1526](https://github.com/nrwl/nx-console/issues/1526)) ([ce1b0ab](https://github.com/nrwl/nx-console/commit/ce1b0ab4642eb369fdf4ee7440277f5949406f36))
* remove the usage of configurationPath ([#1493](https://github.com/nrwl/nx-console/issues/1493)) ([8295def](https://github.com/nrwl/nx-console/commit/8295def416ba59ef1b5e66e0fc1fcd34b7aa4363))
* update styles and fix style-related bugs in generate ui ([#1517](https://github.com/nrwl/nx-console/issues/1517)) ([2f936bf](https://github.com/nrwl/nx-console/commit/2f936bfa02184135e09d01d115aac36f8fefb1a3))


### Features

* **generate-ui:** split form by x-priority attribute ([#1528](https://github.com/nrwl/nx-console/issues/1528)) ([3520c79](https://github.com/nrwl/nx-console/commit/3520c792791874c0af383e42d3b59afc0e2d4ec7))
* **intellij:** include nxls in the intellij bundle ([#1494](https://github.com/nrwl/nx-console/issues/1494)) ([17cd310](https://github.com/nrwl/nx-console/commit/17cd3108fb021777290cfcb1f9eff7f1d9ab0f5e))
* **intellij:** open generate ui with project right click ([#1513](https://github.com/nrwl/nx-console/issues/1513)) ([43bd083](https://github.com/nrwl/nx-console/commit/43bd083133b165dc07820aedcfa66ba2841d03b9))
* **intellij:** show generate-ui in intellij ([#1497](https://github.com/nrwl/nx-console/issues/1497)) ([eedf023](https://github.com/nrwl/nx-console/commit/eedf0236fc8f8d8f6cc00357c86accd531e733c4))
* sort generator flags by priority ([#1502](https://github.com/nrwl/nx-console/issues/1502)) ([054ff64](https://github.com/nrwl/nx-console/commit/054ff64488bd2070d1a03844899a5ebcf878e1b5))

# [1.6.0](https://github.com/nrwl/nx-console/compare/nxls-v1.5.0...nxls-v1.6.0) (2023-01-24)


### Features

* add NxGeneratorOptions request to nxls ([#1486](https://github.com/nrwl/nx-console/issues/1486)) ([92cc757](https://github.com/nrwl/nx-console/commit/92cc757e41a043608fa375f45dd531b676a5b33e))
* hide deprecated generators and executors ([#1489](https://github.com/nrwl/nx-console/issues/1489)) ([e26347b](https://github.com/nrwl/nx-console/commit/e26347b871ffb0e3a21bc405721f2889594d5771))

# [1.5.0](https://github.com/nrwl/nx-console/compare/nxls-v1.4.0...nxls-v1.5.0) (2023-01-18)


### Bug Fixes

* take nx-cloud.env into account for cloud view ([#1475](https://github.com/nrwl/nx-console/issues/1475)) ([fdc376e](https://github.com/nrwl/nx-console/commit/fdc376e1365adfafe04cad3e23d0ef984fef327f))


### Features

* add nx cloud view ([#1441](https://github.com/nrwl/nx-console/issues/1441)) ([fe9a140](https://github.com/nrwl/nx-console/commit/fe9a1403c08b47cd7e4ec95def376a503ea7bbdc))

# [1.4.0](https://github.com/nrwl/nx-console/compare/nxls-v1.3.1...nxls-v1.4.0) (2022-12-05)


### Bug Fixes

* always set `process.env.CI` to false ([9193cef](https://github.com/nrwl/nx-console/commit/9193cef92be30d39cf571b93ad7f6082092398ba))
* check lerna version for nx workspace ([#1382](https://github.com/nrwl/nx-console/issues/1382)) ([034e288](https://github.com/nrwl/nx-console/commit/034e288313306557e9fc34b10f31b5be5b604785))
* use the project graph files to locate a project ([#1430](https://github.com/nrwl/nx-console/issues/1430)) ([e11825e](https://github.com/nrwl/nx-console/commit/e11825e82bb2696cac88614b624a7551dd48f38b))


### Features

* always use the project graph when building the workspace configuration ([#1431](https://github.com/nrwl/nx-console/issues/1431)) ([b43db1d](https://github.com/nrwl/nx-console/commit/b43db1de76a9fe67fa96f69c1a5b364b11f0119b))
* configurable dry runs on change ([#1380](https://github.com/nrwl/nx-console/issues/1380)) ([0d5634d](https://github.com/nrwl/nx-console/commit/0d5634df3f75a6a0cfdbaa57854c580e6138a878))
* move all workspace retrieval to the language server ([#1402](https://github.com/nrwl/nx-console/issues/1402)) ([650a44e](https://github.com/nrwl/nx-console/commit/650a44ea1cc08d5d68d6b9a37315e0c596424a26))
* **nxls:** watch for project.json changes in the language server ([#1429](https://github.com/nrwl/nx-console/issues/1429)) ([d6c0fcc](https://github.com/nrwl/nx-console/commit/d6c0fccbef19da7cb22854e9c2e43794b6fe024f))


### Performance Improvements

* **e2e:** parallelize testworkspace installation ([#1396](https://github.com/nrwl/nx-console/issues/1396)) ([3932b9c](https://github.com/nrwl/nx-console/commit/3932b9ca1f8d1c04fed496d296e480f8f687d015))

## [1.3.1](https://github.com/nrwl/nx-console/compare/nxls-v1.3.0...nxls-v1.3.1) (2022-09-22)


### Bug Fixes

* handle non existent json service ([#1361](https://github.com/nrwl/nx-console/issues/1361)) ([17bfbc6](https://github.com/nrwl/nx-console/commit/17bfbc6e56f953b6838fd29f9e95d0824c699804))

# [1.3.0](https://github.com/nrwl/nx-console/compare/nxls-v1.2.0...nxls-v1.3.0) (2022-09-22)


### Bug Fixes

* **nxls:** filter target dependencies ([cf5c7c3](https://github.com/nrwl/nx-console/commit/cf5c7c3de36fcc353df2da7ee4c546b0a0233d20))
* **nxls:** handle unhandled exceptions ([4d7e982](https://github.com/nrwl/nx-console/commit/4d7e9825d67cd333dcd6a6715db9a9e4c7c69f02))


### Features

* add dependency functionality ([#1339](https://github.com/nrwl/nx-console/issues/1339)) ([0702b0d](https://github.com/nrwl/nx-console/commit/0702b0d4717e90fb6d2fd6a94e1f289f0313773f))
* enable add-dependency version selection ([#1357](https://github.com/nrwl/nx-console/issues/1357)) ([c87da06](https://github.com/nrwl/nx-console/commit/c87da062dd5d3f66ce7cc220f633be3382803125))
* **nxls:**  auto complete for `tags`, `targets`,  `projects`, `inputNames` completion types ([#1343](https://github.com/nrwl/nx-console/issues/1343)) ([4aeb8f9](https://github.com/nrwl/nx-console/commit/4aeb8f928ecfccaabcf59ed7402e91d632f23b5c))
* **nxls:** add support for nx in package.json files ([#1342](https://github.com/nrwl/nx-console/issues/1342)) ([1cb0a4e](https://github.com/nrwl/nx-console/commit/1cb0a4ea7a053bc4a5034f1c97dcd752fecfd0d1))
* **nxls:** add support for nx.json ([#1344](https://github.com/nrwl/nx-console/issues/1344)) ([e2ace3b](https://github.com/nrwl/nx-console/commit/e2ace3b7dddac5e4211d24a7f927e6ce1ddcbdc7))

# [1.2.0](https://github.com/nrwl/nx-console/compare/nxls-v1.1.0...nxls-v1.2.0) (2022-09-12)


### Features

* **nxls:** get project targets for the language server ([#1330](https://github.com/nrwl/nx-console/issues/1330)) ([0e5ca81](https://github.com/nrwl/nx-console/commit/0e5ca812eb143dd827072fffc0ba2016dfcbe7ac))

# [1.1.0](https://github.com/nrwl/nx-console/compare/nxls-v1.0.2...nxls-v1.1.0) (2022-08-29)


### Bug Fixes

* read builder schema for local plugins when running targets ([#1329](https://github.com/nrwl/nx-console/issues/1329)) ([7932691](https://github.com/nrwl/nx-console/commit/7932691e8e3b4cfa2e64f03c9ced2269e9d4b35d))


### Features

* **nxls:** add document links ([#1327](https://github.com/nrwl/nx-console/issues/1327)) ([2693834](https://github.com/nrwl/nx-console/commit/269383426540c17a5783b98192a657c27aaac4c4))
* **nxls:** path completion for files and directories ([#1326](https://github.com/nrwl/nx-console/issues/1326)) ([816a4d8](https://github.com/nrwl/nx-console/commit/816a4d8ccd518ea4227f00a4e3af1cd7d06cc3cd))

## [1.0.2](https://github.com/nrwl/nx-console/compare/nxls-v1.0.1...nxls-v1.0.2) (2022-08-11)


### Bug Fixes

* **nxls:** get the working path from rootUri ([cf56f10](https://github.com/nrwl/nx-console/commit/cf56f10b8df09ecb08dea3fe9ef29b059f74bae2))

## [1.0.1](https://github.com/nrwl/nx-console/compare/nxls-v1.0.0...nxls-v1.0.1) (2022-08-09)


### Bug Fixes

* **nxls:** catch errors if not in a workspace with node_modules ([1da4886](https://github.com/nrwl/nx-console/commit/1da4886a1e8e629b44c2d18a0bc1322b0a6d55d8))

# 1.0.0 (2022-08-09)

### Features
Initial Release
