## Contributing to Nx Console

We would love for you to contribute to Nx Console! Read this document to see how to do it.

## Got a Question?

We are trying to keep GitHub issues for bug reports and feature requests. Stack Overflow is a much better place to ask general questions about how to use Nx Console.

## Two Platforms

Nx Console runs on two platforms:

- VSCode
- IntelliJ

The two versions of Nx Console share most of the code, but they are bundled differently.

## Building the VSCode Plugin

You can build the vscode extension and run it in development mode by opening up this repo in Visual Studio code and hitting the f5 function key. This will launch `nps prepare.dev.vscode` in the background and spawn an extension development host version of VSCode so that you can try out your code.

When you want to update the extension with a new set of changes, go back to the editor you launched the extension host from and click the refresh button (its green and looks like a browser refresh icon).

### Running Unit Tests

- Run `nps test` to run unit tests.

### Running E2e Tests

- Run `nps prepare.e2e` to build the project and create fixtures. This will create a few projects in the tmp folder you can develop against or run e2e tests against.
- Run `nps e2e.ci` to run e2e tests. This will compile and frontend and the backend, and run cypress tests (The fixtures must be created).
- Run `nps e2e.up` to serve the app and launch cypress. (The fixtures must be created). This is useful for development.
- Run `nps e2e.headless` to serve the app and run cypress from the terminal. (The fixtures must be created). This is also useful for development.

Cypress, which we use to run e2e tests, records the videos of the tests ran on CI. You can access them here: [https://dashboard.cypress.io/#/projects/x2ebye/runs](https://dashboard.cypress.io/#/projects/x2ebye/runs). This is very useful for troubleshooting.

## Building VSCode Plugin

You can build the vscode extension and run it in development mode by opening up this repo in Visual Studio code and hitting the f5 function key. This will launch `nps prepare.dev.vscode` in the background and spawn an extension development host version of VSCode so that you can try out your code.

When you want to update the extension with a new set of changes, go back to the editor you launched the extension host from and click the refresh button (its green and looks like a browser refresh icon).

## Submitting a PR

Please follow the following guidelines:

Run the following commands to make sure the linting and the tests pass.

- `nps format.check`
- `nps lint`
- `nps test`
- `nps e2e.prepare`
- `nps e2e.up`

If `nps format.check` fails, run `nps format`.

### Commit Message Guidelines

Commit message should follow the following format:

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

#### Subject

The subject must contain a description of the change.

#### Example

```
feat: add links to angular.io to the generate screen

The generate screen shows links to docs explaining all command-line options in depth
```
