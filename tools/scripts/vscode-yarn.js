const shell = require('shelljs');

shell.exec('yarn install --production --pure-lockfile --ignore-optional --no-bin-links --non-interactive', {cwd: 'dist/apps/vscode'});
