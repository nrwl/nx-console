## Contributing to Angular Console

We would love for you to contribute to Angular Console! Read this document to see how to do it.


## Got a Question?

We are trying to keep GitHub issues for bug reports and feature requests. Stack Overflow is a much better place to ask general questions about how to use Angular Console.



## Running Dev

After cloning the project run: `yarn`.

After that, run `yarn start dev.up` to start the dev environment. The application will start the process listening on port 4200. To test electron specific features, run `yarn start electron.up`.


## Running Tests

* Run `yarn start e2e.fixtures` to create fixtures. This will create a few projects in the tmp folder you can develop against or run e2e tests against.
* Run `yarn start e2e.run` to run e2e tests. This will compile and frontend and the backend, and run cypress tests (The fixtures must be created).
* Run `yarn start e2e.up` to server the app and launch cypress. (The fixtures must be created). This is useful for development.


## Submitting a PR

Please follow the following guidelines:

Run the following commands to make sure the linting and the tests pass.

* `yarn start format.check`
* `yarn start lint`
* `yarn start e2e.fixtures`
* `yarn start e2e.run`

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
