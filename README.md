# Start


## Prepare
* Run `yarn`


## Developing
* For development run: `yarn start dev.up`
* To run wrapped in Electron: Run `yarn start electron.up`

## E2E tests
* Run `yarn start e2e.fixtures` to create fixtures. This will create a few projects in the tmp folder you can develop against or run e2e tests against.
* Run `yarn start e2e.run` to run e2e tests. This will compile and frontend and the backend, and run cypress tests (The fixtures must be created).
* Run `yarn start e2e.up` to server the app and launch cypress. (The fixtures must be created). This is useful for development.

## Creating Electron Packages
* To create a dmg: Run `yarn start electron.package-mac`
