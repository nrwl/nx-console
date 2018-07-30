const execSync = require('child_process').execSync;

exports.default = async function(context) {
  if (context.appOutDir.indexOf('win-unpacked') > -1) {
    execSync('rm -rf dist/electron/node_modules/node-pty-prebuilt');
    execSync('rm -rf dist/packages/win-unpacked/resources/app/node_modules/node-pty-prebuilt');
    execSync('cp -r tools/win/node-pty-prebuilt dist/electron/node_modules/node-pty-prebuilt');
    execSync('cp -r tools/win/node-pty-prebuilt dist/packages/win-unpacked/resources/app/node_modules/node-pty-prebuilt');

    execSync('cp tools/win/.bin/ng.cmd dist/electron/ng.cmd');
    execSync('cp tools/win/.bin/ng.cmd dist/packages/win-unpacked/resources/app/ng.cmd');
  }
};
