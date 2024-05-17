const fs = require('fs');
const { execSync } = require('child_process');
const { join } = require('path');

const nxlsPath = join(
  process.cwd(),
  'dist/apps/intellij/idea-sandbox/plugins/nx-console/nxls'
);

execSync(`npm i -f`, { stdio: 'inherit', cwd: nxlsPath });
