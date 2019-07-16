const shell = require('shelljs');
const os = require('os');
const fs = require('fs');

shell.exec('node ./node_modules/vscode/bin/install');
if (os.platform() === 'win32') {
  shell.exec(`.\\node_modules\\.bin\\electron-rebuild.cmd`);
} else {
  shell.exec('./node_modules/.bin/electron-rebuild');
}
shell.rm('-rf', 'node_modules/cypress/node_modules/@types');
shell.rm('-rf', 'node_modules/@types/sinon-chai/node_modules/@types');
fs.writeFileSync(
  `./node_modules/source-map-explorer/vendor/webtreemap.css`,
  ''
);
fs.writeFileSync(
  `./node_modules/source-map-explorer/index.js`,
  fs
    .readFileSync('./node_modules/source-map-explorer/index.js')
    .toString()
    .replace('#!/usr/bin/env node', '')
);
