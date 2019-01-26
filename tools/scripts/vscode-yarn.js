const shell = require('shelljs');

shell.exec(
  'yarn install --prod --ignore-platform --ignore-engines --ignore-optional --no-audit --no-bin-link',
  {
    cwd: 'dist/apps/vscode'
  }
);
