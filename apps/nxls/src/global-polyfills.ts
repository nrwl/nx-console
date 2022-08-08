/* eslint-disable */

// needed for rollup builds because one of the dependent libraries have a non_webpack_require (essentially the nx package resolve util)
declare var __non_webpack_require__: typeof require;
if (!globalThis.__non_webpack_require__) {
  globalThis.__non_webpack_require__ = require;
}
