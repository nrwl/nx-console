const shell = require('shelljs');

shell.rm('-rf', 'node_modules/cypress/node_modules/@types');
shell.rm('-rf', 'node_modules/@types/sinon-chai/node_modules/@types');

// Hack to fix the regex used within build-angular
const fs = require('fs');
const path = require('path');
const serverWebpackPath = path.join(__dirname, '../../node_modules/@angular-devkit/build-angular/src/angular-cli-files/models/webpack-configs/server.js');
const originalContents = fs.readFileSync(serverWebpackPath).toString();
const updatedContents = originalContents.replace(`/^@angular/`, `/^@angular\\//`);
fs.writeFileSync(serverWebpackPath, updatedContents);
