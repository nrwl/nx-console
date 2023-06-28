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
