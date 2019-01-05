const shell = require('shelljs');
const cp = require('child_process');
const path = require('path');

shell.exec('node ./node_modules/vscode/bin/install');
cp.execSync(`${path.normalize('./node_modules/.bin/electron-rebuild')} -p -t "dev,prod,optional"`, { stdio: [0,1,2]});
shell.rm('-rf', 'node_modules/cypress/node_modules/@types');
shell.rm('-rf', 'node_modules/@types/sinon-chai/node_modules/@types');
