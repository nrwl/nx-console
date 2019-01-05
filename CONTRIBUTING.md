## Contributing to Angular Console

We would love for you to contribute to Angular Console! Read this document to see how to do it.


## Got a Question?

We are trying to keep GitHub issues for bug reports and feature requests. Stack Overflow is a much better place to ask general questions about how to use Angular Console.



## Running Dev

After cloning the project run: `yarn`. 

After that, run `yarn start dev.prepare.electron`. Every time you add or remove dependencies in electron/package.json, you will need to rerun `dev.prepare`. 

After this, run `yarn start dev.up` to start the dev environment. The application will start the process listening on port 4200. 

You can also build the electron app by running `yarn start mac.electron-pack`, `yarn start win.electron-pack` or `yarn start linux.electron-pack` and then run it using `yarn start mac.start-electron`, `yarn start win.start-electron` or `yarn start linux.start-electron`.


## Running Unit Tests

* Run `yarn start test` to run unit tests.

## Running E2e Tests

* Run `yarn start e2e.fixtures` to create fixtures. This will create a few projects in the tmp folder you can develop against or run e2e tests against.
* Run `yarn start e2e.run` to run e2e tests. This will compile and frontend and the backend, and run cypress tests (The fixtures must be created).
* Run `yarn start e2e.up` to server the app and launch cypress. (The fixtures must be created). This is useful for development.

Cypress, which we use to run e2e tests, records the videos of the tests ran on CI. You can access them here: [https://dashboard.cypress.io/#/projects/x2ebye/runs](https://dashboard.cypress.io/#/projects/x2ebye/runs). This is very useful for troubleshooting.


## Submitting a PR

Please follow the following guidelines:

Run the following commands to make sure the linting and the tests pass.

* `yarn start format.check`
* `yarn start lint`
* `yarn start test`
* `yarn start e2e.fixtures`
* `yarn start e2e.up`

If `yarn start format.check` fails, run `yarn start format`.


### Commit Message Guidelines

Commit message should follow the following format:

```
type: subject
BLANK LINE
body
```

#### Type

The type must be one of the following:

* build
* feat
* fix
* refactor
* style
* docs
* test

#### Subject

The subject must contain a description of the change.

#### Example

```
feat: add links to angular.io to the generate screen

The generate screen shows links to docs explaining all command-line options in depth
```
