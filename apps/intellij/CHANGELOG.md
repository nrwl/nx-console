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
