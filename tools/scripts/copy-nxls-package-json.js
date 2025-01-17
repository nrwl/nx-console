const fs = require('fs-extra');
const { execSync } = require('child_process');
fs.copySync('./apps/nxls/package.json', './dist/apps/nxls/package.json');

execSync(`npm i -f --install-strategy nested`, {
  stdio: 'inherit',
  cwd: './dist/apps/nxls',
});
