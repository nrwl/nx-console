const execSync = require('child_process').execSync;

exports.default = async function(context) {
  if (context.appOutDir.indexOf('win-unpacked') > -1) {
    execSync('copy tools\\win\\.bin\\ng.cmd dist\\electron\\ng.cmd');
    execSync('copy tools\\win\\.bin\\ng.cmd dist\\packages\\win-unpacked\\resources\\app\\ng.cmd');
  }
};
