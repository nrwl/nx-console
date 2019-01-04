const execSync = require('child_process').execSync;
const os = require('os');

exports.default = async function(context) {
  if (context.appOutDir.indexOf('win-unpacked') > -1) {
    if (os.platform() === 'win32') {
      execSync('copy tools\\win\\.bin\\ng.cmd dist\\apps\\electron\\ng.cmd');
      execSync(
        'copy tools\\win\\.bin\\ng.cmd dist\\packages\\win-unpacked\\resources\\app\\ng.cmd'
      );
    } else {
      execSync('cp tools/win/.bin/ng.cmd dist/apps/electron/ng.cmd');
      execSync(
        'cp tools/win/.bin/ng.cmd dist/packages/win-unpacked/resources/app/ng.cmd'
      );
    }
  }
};
