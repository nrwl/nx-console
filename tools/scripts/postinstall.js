const shell = require('shelljs');

shell.exec('node ./node_modules/vscode/bin/install');
shell.exec('./node_modules/.bin/electron-rebuild -p -t "dev,prod,optional"');
shell.rm('-rf', 'node_modules/cypress/node_modules/@types');
shell.rm('-rf', 'node_modules/@types/sinon-chai/node_modules/@types');
