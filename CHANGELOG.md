# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
