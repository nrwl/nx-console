const { execSync } = require('child_process');
const { normalize } = require('path');

execSync('npm i', {
  stdio: 'inherit',
  cwd: normalize('dist/apps/vscode'),
});
