const { execSync } = require('child_process');
const { normalize } = require('path');

execSync('npm i -f', {
  stdio: 'inherit',
  cwd: normalize('dist/apps/vscode'),
});
