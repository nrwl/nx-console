const shell = require('shelljs');

shell.rm('-rf', 'node_modules/cypress/node_modules/@types');
shell.rm('-rf', 'node_modules/@types/sinon-chai/node_modules/@types');
