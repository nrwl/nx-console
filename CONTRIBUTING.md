## Contributing to Nx Console

We would love for you to contribute to Nx Console! Read this document to see how to do it.

If you're new to vscode extension development, check out the [Extension API](https://code.visualstudio.com/api) docs.

## Got a Question?

We are trying to keep GitHub issues for bug reports and feature requests. Stack Overflow is a much better place to ask general questions about how to use Nx Console. You can also join the [Nrwl Community Slack](go.nrwl.io/join-slack?utm_source=nxconsole) for help.

## Prerequisites

- Install yarn: https://classic.yarnpkg.com/en/docs/install
- Run yarn install in the root directory

## Running the Extension locally

In order to start Nx console in development mode, the repo needs to be built. Running `yarn watch` via the CLI or using the command prompt to execute `Tasks: Run Task -> Build and watch Nx Console` will automatically generate build artifacts whenever the code changes. </br>
Use the `F5` key or the debug menu option `Launch Client + Server` to start the Extension Development Host.

> :warning: Even though builds will be generated automatically, the Extension Development Host needs to be restarted in order to apply a new set of changes.

### Running Unit Tests

- Run `nps test` to run unit tests.

### Running Storybook

- Run `nps storybook` to launch the storybook instance
- Run `nps storybook-e2e` to run the e2e tests on the storybook instance

## Submitting a PR

Please follow the following guidelines:

Run the following commands to make sure the linting and the tests pass.

- `nps format.check`
- `nps lint`
- `nps test`
- `nps storybook-e2e`

If `nps format.check` fails, run `nps format`.

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
