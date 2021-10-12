# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [17.11.2](https://github.com/nrwl/nx-console/compare/v17.11.1...v17.11.2) (2021-09-27)

### Bug Fixes

- use proper file schema for importing on windows ([#1149](https://github.com/nrwl/nx-console/issues/1149)) ([0470a33](https://github.com/nrwl/nx-console/commits/0470a33f7c69e24d4327616593497d08ca76373d))

### [17.11.1](https://github.com/nrwl/nx-console/compare/v17.11.0...v17.11.1) (2021-09-27)

### Bug Fixes

- ensure that projects are properly resolved during async calls ([#1145](https://github.com/nrwl/nx-console/issues/1145)) ([35c40b5](https://github.com/nrwl/nx-console/commits/35c40b50a316c7ce905316af36e789cdf03d7cd1))

## [17.11.0](https://github.com/nrwl/nx-console/compare/v17.10.0...v17.11.0) (2021-09-24)

### Features

- sort projects in project view ([#1137](https://github.com/nrwl/nx-console/issues/1137)) ([7cc9ebe](https://github.com/nrwl/nx-console/commits/7cc9ebe257999d39cea9cffee0d925e6a693d83a))
- use vscode settings for shell execution ([#1134](https://github.com/nrwl/nx-console/issues/1134)) ([fc4caea](https://github.com/nrwl/nx-console/commits/fc4caeaf3c17c95f1f305d13f6dd062acff5f47c))

### Performance Improvements

- decrease activation time ([#1131](https://github.com/nrwl/nx-console/issues/1131)) ([6a23cea](https://github.com/nrwl/nx-console/commits/6a23ceaff7c4211e36c591892a8510a067f07d4f))

## [17.10.0](https://github.com/nrwl/nx-console/compare/v17.9.0...v17.10.0) (2021-09-03)

### Features

- Add commands to add applications and libraries directly ([#1128](https://github.com/nrwl/nx-console/issues/1128)) ([b908c11](https://github.com/nrwl/nx-console/commits/b908c11aa3b2de1fd35ec52ba243803d2cdaeb34))

### Bug Fixes

- remove loading item from projects view ([#1129](https://github.com/nrwl/nx-console/issues/1129)) ([7ad5f60](https://github.com/nrwl/nx-console/commits/7ad5f60cdba5a0f766592aed5b718ba82c3e0881))
- use proper workspace json path when verifying workspaces ([#1130](https://github.com/nrwl/nx-console/issues/1130)) ([f2365be](https://github.com/nrwl/nx-console/commits/f2365bed33a10e6734fe96e35df01552763905a1))

## [17.9.0](https://github.com/nrwl/nx-console/compare/v17.8.0...v17.9.0) (2021-08-27)

### Features

- support nx.json extends property ([#1124](https://github.com/nrwl/nx-console/issues/1124)) ([507ce24](https://github.com/nrwl/nx-console/commits/507ce24ce3085b933c9da1aa92b35d0c34b0b0c2))

### Performance Improvements

- add onview activation event ([7ac82c0](https://github.com/nrwl/nx-console/commits/7ac82c0106877c01167cc1a20bb740c6feec7c5f))
- use `onStartupFinished` and target es2020 ([0cef34a](https://github.com/nrwl/nx-console/commits/0cef34aab5d57796f69c5e1a0ddfd4ab9bb74265))

## [17.8.0](https://github.com/nrwl/nx-console/compare/v17.7.0...v17.8.0) (2021-08-06)

### Features

- welcome view and getting started walkthrough ([#1069](https://github.com/nrwl/nx-console/issues/1069)) ([7281905](https://github.com/nrwl/nx-console/commits/7281905c7c4625426c291dd6618fb9043cf829f0))

### Bug Fixes

- configurations tabs overflow ([#1118](https://github.com/nrwl/nx-console/issues/1118)) ([2c8bd85](https://github.com/nrwl/nx-console/commits/2c8bd85487e03c75aa8afc377eff909ee1c39032))
- menu scroll hides Run and Search bar header ([#1117](https://github.com/nrwl/nx-console/issues/1117)) ([1f1f888](https://github.com/nrwl/nx-console/commits/1f1f8889650fe2eddfc756888a56eadacbff5279))

## [17.7.0](https://github.com/nrwl/nx-console/compare/v17.6.1...v17.7.0) (2021-07-30)

### Features

- support dep-graph watch option ([#1106](https://github.com/nrwl/nx-console/issues/1106)) ([5e78c4d](https://github.com/nrwl/nx-console/commits/5e78c4d3f98c6c567cc5584d39cd54562f102135))

### Bug Fixes

- add min-height to scroll container so at least 100vh ([#1110](https://github.com/nrwl/nx-console/issues/1110)) ([2ce72a8](https://github.com/nrwl/nx-console/commits/2ce72a811765e8866091ed45b8f2a67a137a0731))
- ensure project path is not just a partial match ([#1108](https://github.com/nrwl/nx-console/issues/1108)) ([7e7705a](https://github.com/nrwl/nx-console/commits/7e7705a17307405af61f81fc70566df7d50aec70))
- include path with project but not directory ([#1112](https://github.com/nrwl/nx-console/issues/1112)) ([6cb987d](https://github.com/nrwl/nx-console/commits/6cb987da18bb4bf4a3953fc3937a6d2d405d583d))
- json schema update for $id ([#1107](https://github.com/nrwl/nx-console/issues/1107)) ([d97db50](https://github.com/nrwl/nx-console/commits/d97db50e2e3efc35e9bc77845dc9742b44b6b30c))
- load workspace file utils directly ([#1113](https://github.com/nrwl/nx-console/issues/1113)) ([a351990](https://github.com/nrwl/nx-console/commits/a35199082992b4bfc081abde169092d51e3924a1))
- support angular.json (v2) having split project.json files ([#1105](https://github.com/nrwl/nx-console/issues/1105)) ([22b685c](https://github.com/nrwl/nx-console/commits/22b685c5c931b1efc60b0f97aa46fe42d052c078))

### [17.6.1](https://github.com/nrwl/nx-console/compare/v17.6.0...v17.6.1) (2021-06-28)

### Bug Fixes

- read and combine both schematics and generators ([#1103](https://github.com/nrwl/nx-console/issues/1103)) ([b275bdc](https://github.com/nrwl/nx-console/commits/b275bdcefb19319d61d0f9e611d9367391103f5c))

## [17.6.0](https://github.com/nrwl/nx-console/compare/v17.5.2...v17.6.0) (2021-06-25)

### Features

- support for project.json schema ([#1101](https://github.com/nrwl/nx-console/issues/1101)) ([6341a77](https://github.com/nrwl/nx-console/commits/6341a775a0fa342d52b4ff8c5458d7a01e37ca9d))
- support split nx projects ([#1102](https://github.com/nrwl/nx-console/issues/1102)) ([2f58b00](https://github.com/nrwl/nx-console/commits/2f58b0028c8e0b1bb685618fd1a61644da4cffc9))

### [17.5.2](https://github.com/nrwl/nx-console/compare/v17.5.1...v17.5.2) (2021-06-22)

### Bug Fixes

- read package.json dependencies when getting builders/executors ([#1100](https://github.com/nrwl/nx-console/issues/1100)) ([187f1f2](https://github.com/nrwl/nx-console/commits/187f1f2f4b6c9bdd3f2026516289fbfb7c75535d))

### [17.5.1](https://github.com/nrwl/nx-console/compare/v17.5.0...v17.5.1) (2021-06-16)

### Bug Fixes

- use proper file paths for schemas within windows ([#1085](https://github.com/nrwl/nx-console/issues/1085)) ([ed9d0c7](https://github.com/nrwl/nx-console/commits/ed9d0c7dd259c86bc9310417577098f97ae25b5f))

## [17.5.0](https://github.com/nrwl/nx-console/compare/v17.4.1...v17.5.0) (2021-06-14)

### Features

- add json schema support for configurations, and also provide descriptions ([#1078](https://github.com/nrwl/nx-console/issues/1078)) ([e9e1d15](https://github.com/nrwl/nx-console/commits/e9e1d15f6773e811d1de3ef0e6036cd68f2faf1b))
- provide json schema for workspace.json ([#1077](https://github.com/nrwl/nx-console/issues/1077)) ([ae35ec5](https://github.com/nrwl/nx-console/commits/ae35ec5dd85a38ce44de2797911dffe7806e2a3b))

### Bug Fixes

- nx generator schemas form ([#1081](https://github.com/nrwl/nx-console/issues/1081)) ([c43f9cc](https://github.com/nrwl/nx-console/commits/c43f9cc0fbfacb43a6fe170aa9faaedd88dbf046))
- strip appsDir and libsDir from path if app|application or lib|library ([#1082](https://github.com/nrwl/nx-console/issues/1082)) ([7db8b08](https://github.com/nrwl/nx-console/commits/7db8b084e2842cd39b17e393066cb0377c0944d9))

### [17.4.1](https://github.com/nrwl/nx-console/compare/v17.4.0...v17.4.1) (2021-05-28)

### Bug Fixes

- don't show ng menus for nx workspaces ([#1076](https://github.com/nrwl/nx-console/issues/1076)) ([152fc20](https://github.com/nrwl/nx-console/commits/152fc20430444c6d65a4e1ce6fc3e465d582aaa4))

## [17.4.0](https://github.com/nrwl/nx-console/compare/v17.3.1...v17.4.0) (2021-05-28)

### Features

- workspace codelens ([#1075](https://github.com/nrwl/nx-console/issues/1075)) ([3e18e99](https://github.com/nrwl/nx-console/commits/3e18e994f489708e86c4dacd8a618322390da728))

### Bug Fixes

- only reads and normalizes selected schematic options ([#1074](https://github.com/nrwl/nx-console/issues/1074)) ([d2c4bd4](https://github.com/nrwl/nx-console/commits/d2c4bd42d290d934920c445cac6481abd28e09fc))

### [17.3.1](https://github.com/nrwl/nx-console/compare/v17.3.0...v17.3.1) (2021-05-14)

### Features

- load workspace defaults into Run executor form ([#1068](https://github.com/nrwl/nx-console/issues/1068)) ([3bb13fe](https://github.com/nrwl/nx-console/commits/3bb13fe299d39a4c4c4cdf698c3b0e9bd9732562))

### Bug Fixes

- add positional to taskDefinitions, fixes task already active ([#1071](https://github.com/nrwl/nx-console/issues/1071)) ([a1afd23](https://github.com/nrwl/nx-console/commits/a1afd23ef23c7bf6f40115661aa3d0800c639740))

## [17.3.0](https://github.com/nrwl/nx-console/compare/v17.2.0...v17.3.0) (2021-05-06)

### Features

- nx run in command palette and context menu ([#1065](https://github.com/nrwl/nx-console/issues/1065)) ([9b5fd5c](https://github.com/nrwl/nx-console/commits/9b5fd5c39d3fde32bb996fe1e4180cdb19955f9c))
- Populates form with workspace defaults for build, e2e, lint, serve, and test targets ([#1067](https://github.com/nrwl/nx-console/issues/1067)) ([fc68c64](https://github.com/nrwl/nx-console/commits/fc68c644767912c9f97be771dd4a059d994b3098))
- run-many prompts for projects ([#1064](https://github.com/nrwl/nx-console/issues/1064)) ([977bdf2](https://github.com/nrwl/nx-console/commits/977bdf261316be44e421cfcf088d710693e71a2a))
- shows argument list and highlights changed and invalid fields in menu ([#1059](https://github.com/nrwl/nx-console/issues/1059)) ([7d8e8e1](https://github.com/nrwl/nx-console/commits/7d8e8e1c91968792cd67d0564375b74c48af31f2))

### Bug Fixes

- enable generate from context menu setting take effect immediately ([#1066](https://github.com/nrwl/nx-console/issues/1066)) ([c3f2b92](https://github.com/nrwl/nx-console/commits/c3f2b923b64d5f5b502c018d368f4c551f57e47a))

## [17.2.0](https://github.com/nrwl/nx-console/compare/v17.1.0...v17.2.0) (2021-04-16)

### Features

- updates form components to support long form items plus specs ([#1062](https://github.com/nrwl/nx-console/issues/1062)) ([0373a56](https://github.com/nrwl/nx-console/commits/0373a56df680764b6ed34850c8e5eebeae02ed8b)), closes [#984](https://github.com/nrwl/nx-console/issues/984)

### Bug Fixes

- refresh projects view clears cache ([#1058](https://github.com/nrwl/nx-console/issues/1058)) ([4741999](https://github.com/nrwl/nx-console/commits/474199904a5982928343bbeb73bdd256658b4dda))
- replace \ with / in path in workspace before remove leading / ([#1063](https://github.com/nrwl/nx-console/issues/1063)) ([a4f96ca](https://github.com/nrwl/nx-console/commits/a4f96ca7ba9da58c4d488043092ac110170a6a6f))

## [17.1.0](https://github.com/nrwl/nx-console/compare/v17.0.3...v17.1.0) (2021-03-27)

### Features

- allow filtering in the nx project tree view ([#1050](https://github.com/nrwl/nx-console/issues/1050)) ([cfcc306](https://github.com/nrwl/nx-console/commits/cfcc3065b9149a977d1747b1322f8a94bf69d2d3))
- light and dark mode icons ([#1046](https://github.com/nrwl/nx-console/issues/1046)) ([7613fa0](https://github.com/nrwl/nx-console/commits/7613fa05c44263f5c7dee24daf0b219f2e6db382))
- load custom workspace path on extension load ([#1052](https://github.com/nrwl/nx-console/issues/1052)) ([51d5a7a](https://github.com/nrwl/nx-console/commits/51d5a7a4c87f992c551fe26c90936a0af7f9ee38))
- only execute dry run if Generate form is valid ([#1053](https://github.com/nrwl/nx-console/issues/1053)) ([82d561b](https://github.com/nrwl/nx-console/commits/82d561b76f95702212eccf0fbd2871e5235ed3b0))

### Bug Fixes

- remove leading / from path parsed out of the workspace path ([#1054](https://github.com/nrwl/nx-console/issues/1054)) ([2e6449b](https://github.com/nrwl/nx-console/commits/2e6449bc23d5a4c52a5bede26d5c41ab52c47817))

## [17.0.3](https://github.com/nrwl/nx-console/compare/v17.0.0...v17.0.3) (2021-03-13)

### Bug Fixes

- unit tests on vscode-ui libs ([#1035](https://github.com/nrwl/nx-console/issues/1035)) ([715b6e3](https://github.com/nrwl/nx-console/commits/715b6e39c3a538d9962e0eef9ac0b6bb5bfa0ede))
- support directory as path alias from context menu ([#1036](https://github.com/nrwl/nx-console/issues/1036)) ([945ed7b](https://github.com/nrwl/nx-console/commits/945ed7bb1cd6c5daabdf172443f78e44918b9cac))

### Performance Improvements

- increase performance of nx console ([#1038](https://github.com/nrwl/nx-console/issues/1038)) ([e8f3258](https://github.com/nrwl/nx-console/commits/e8f32583a7be03e7d6557e38a3e4123e2cf370b1))
