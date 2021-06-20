const { execSync } = require('child_process');

execSync('yarn install --prod', { cwd: 'dist/apps/vscode' });
