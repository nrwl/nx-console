const { execSync } = require('child_process');
const { normalize } = require('path');

execSync(
  `${normalize(
    '../../../node_modules/.bin/vsce'
  )} package --yarn --out nx-console.vsix`,
  {
    stdio: [0, 1, 2],
    cwd: normalize('dist/apps/vscode'),
  }
);
