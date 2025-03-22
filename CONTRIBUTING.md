## Contributing to Nx Console

We would love for you to contribute to Nx Console! Read this document to see how to do it.

## Bug Reports & Feature Requests

If you encounter issues, feel free to [open a bug report on GitHub](https://github.com/nrwl/nx-console/issues/new?labels=type%3A+bug&template=1-bug.md). </br> Even better, you can submit a Pull Request to fix the issue!

When submitting an issue, please make sure to include the following:

- A clear description of the issue and the steps required to reproduce it. This can be a screen recording too
- If at all possible, a minimal reproduction of your issue. This will increase the chances and speed of your issue getting fixed manyfold! Often, as you're constructing a minimal reproduction, you learn a lot about the problem space and will either find a solution yourself or be able to articulate it much better.
- The results of `nx report`
- Any logs you can find

### How to find Nx Console logs

Regardless of your IDE, there might be relevant information in the `daemon.log` & `daemon-error.log` files. You can find their location by running `nx daemon --log`. </br>

#### VSCode & Cursor

There are multiple places that might include relevant logs:

- `Output -> Nx Language Server` contains language server logs
- `Output -> Nx Console` contains logs from the main extension process
- The developer console could contain errors or logs from one of the webviews. Open it by running the `Toggle Developer Tools` command

#### JetBrains IDEs (IntelliJ, WebStorm, ...)

Nx Console will write its logs into `idea.log`. To make sure you include all relevant logs for debugging, go to `Help` -> `Diagnostic Tools` -> `Debug Log Settings.`.. and then insert `#dev.nx.console:trace`. Afterwards, reproduce the issue and paste `idea.log` or sections of it in your issue.

You can find `idea.log` under `Help` -> `Open Log in Editor`.

## Got a Question?

We are trying to keep GitHub issues for bug reports and feature requests. For the best place to ask questions and chat with others, join the [official Nx Discord](https://go.nx.dev/community)!

## Prerequisites

- Install Node.js
- Install yarn: https://classic.yarnpkg.com/en/docs/install
- Run yarn install in the root directory
- Install java: https://www.java.com/en/download/help/download_options.html
- Install gradle: https://docs.gradle.org/current/userguide/installation.html

Alternatively, if you are using IntelliJ IDEA to develop Nx Console, it can take care of the java installation for you.

## Running the Extension locally

If you're new to vscode extension development, check out the [Extension API](https://code.visualstudio.com/api) docs.

If you're new to IntelliJ plugin development, check out the [IntelliJ Platform SDK](https://plugins.jetbrains.com/docs/intellij/welcome.html) docs.

### VSCode

In order to start Nx Console in development mode, the VSCode app (which also works for forks like Cursor) needs to be built.

Running `nx watch vscode` via the terminal to automatically generate build artifacts whenever the code changes. This also builds all dependencies and bundles them together in `dist/apps/vscode` </br>
Use the `F5` key or the debug menu option `Launch Extension` to start the Extension Development Host with your changes applied.

> :warning: Even though builds will be generated automatically, the Extension Development Host needs to be restarted in order to apply a new set of changes.

You can also debug the extension this way. Just make sure it's built with the debug configuration (which generates source maps). This is configured automatically if you run `nx watch vscode`.

### IntelliJ

In order to locally develop for IntelliJ, you need a license for `IntelliJ IDEA Ultimate`. Nx Console depends on javascript plugin features that aren't available in the `Community` version.

Run `nx runIde intellij` to build Nx Console and start a development instance of IntelliJ. This also takes care of building all dependencies like the nxls and generate ui. </br>
To make sure your changes work in the latest EAP version of IntelliJ, you can run `nx runIntelliJLatest intellij`. This will spin up a local instance of IntelliJ using the version configured in `build.gradle.kts` under `intellijPlatformTesting {}`.

> :warning: You can debug Nx Console using IntelliJ by running the `:intellij:runIde` gradle task in debug mode. Debugging the nx task via Nx Console will only attach to breakpoints in javascript code, currently. Make sure to run `nx build intellij` first so that all dependencies are correctly built.

When debugging the JCEF-based generate UI, you can attach an instance of Chrome Devtools to the browser. To enable this, make sure to [set the corresponding registry key](https://plugins.jetbrains.com/docs/intellij/jcef.html#debugging).

## Submitting a PR

We're happy to accept contributions and excited to have you improve Nx Console! Please follow the following guidelines:

### Commit Message Guidelines

Commit message have to follow the [conventional commit](https://www.conventionalcommits.org/en/v1.0.0/) format. A basic example is this:

```
type: subject
BLANK LINE
body
```

#### Type

The type must be one of the following:

- build
- feat
- fix
- refactor
- style
- docs
- test
- chore
- ci
- perf
- revert

Refer to [commitizen/conventional-commit-types](https://github.com/commitizen/conventional-commit-types/blob/master/index.json) for a full explanation of each type.

#### Subject

The subject must contain a description of the change.

#### Example

```
feat: add links to angular.io to the generate screen

The generate screen shows links to docs explaining all command-line options in depth
```

#### Precommit Hooks

We have configured [husky](https://typicode.github.io/husky/) to run two things before every commit:

- formatting via `ktfmt` for Kotlin code and `nx format` for everything else
- [nx sync](https://nx.dev/concepts/sync-generators#sync-generators) to make sure configuration files are up-to-date

### CI Checks

We have CI checks that runs the tests, builds, lints and runs e2e tests on each pull request and commit to the default branch. This uses the `affected` commands so it should be quicker than trying to run everything locally.

If you would like to run things locally, you can run the following commands:

- `yarn nx sync:check`
- `yarn nx format:check` (if this fails, run `yarn nx format:write`)
- `yarn nx run-many --target=test`
- `yarn nx run-many --target=lint`
- `yarn nx run-many --target=build`
- `yarn nx run-many --target=e2e`

And of course, you can use Nx Console itself to run individual tasks for whatever project you changed.
