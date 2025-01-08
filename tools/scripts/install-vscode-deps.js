const { execSync } = require('child_process');
const { normalize } = require('path');
const cwd = normalize('dist/apps/vscode');
execSync('npm i -f --ignore-scripts', {
  stdio: 'inherit',
  cwd,
});
