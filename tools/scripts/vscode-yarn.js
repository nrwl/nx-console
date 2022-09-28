const { execSync } = require('child_process');
const { normalize } = require('path');

execSync('npm i', {
  stdio: [0, 1, 2],
  cwd: normalize('dist/apps/vscode'),
});
