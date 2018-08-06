const execSync = require('child_process').execSync;
const os = require('os');

exports.default = async function(context) {
  if (context.appOutDir.indexOf('win-unpacked') > -1) {
    if (os.platform() === 'win32') {
      execSync('copy tools\\win\\.bin\\ng.cmd dist\\electron\\ng.cmd');
      execSync('copy tools\\win\\.bin\\ng.cmd dist\\packages\\win-unpacked\\resources\\app\\ng.cmd');
    } else {
      execSync('cp tools/win/.bin/ng.cmd dist/electron/ng.cmd');
      execSync('cp tools/win/.bin/ng.cmd dist/packages/win-unpacked/resources/app/ng.cmd');

      execSync('rm -rf dist/electron/node_modules');
      execSync('rm -rf dist/packages/win-unpacked/resources/app/node_modules');
      execSync('unzip ./tools/win/node_modules.zip -d ./dist/electron');
      execSync('unzip ./tools/win/node_modules.zip -d dist/packages/win-unpacked/resources/app');
    }
  }
};
