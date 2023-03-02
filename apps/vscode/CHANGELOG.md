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
