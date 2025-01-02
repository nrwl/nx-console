const { execSync } = require('child_process');
const { copyFileSync, existsSync, mkdirSync } = require('fs');
const { normalize } = require('path');
const cwd = normalize('dist/apps/vscode');
execSync('npm i -f --ignore-scripts', {
  stdio: 'inherit',
  cwd,
});

//  we don't need the entire @vscode-elements/elements package, just the bundled.js file
const destFolder = normalize(
  './dist/apps/vscode/node_modules/@vscode-elements/elements/dist'
);
if (!existsSync(destFolder)) {
  mkdirSync(destFolder, { recursive: true });
}
copyFileSync(
  normalize('./node_modules/@vscode-elements/elements/dist/bundled.js'),
  normalize(`${destFolder}/bundled.js`)
);
