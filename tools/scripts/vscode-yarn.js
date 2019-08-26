const shell = require('shelljs');

shell.exec('yarn install --prod', {
  cwd: 'dist/apps/vscode'
});
