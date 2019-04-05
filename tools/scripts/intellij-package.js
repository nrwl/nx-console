const shell = require('shelljs');
const os = require('os');

const SOURCE = './apps/intellij/';
const DIST = 'dist/apps/intellij/';

shell.cd(`${SOURCE}`);

if (os.platform() === 'win32') {
  shell.exec(`.\\gradlew.bat --rerun-tasks buildPlugin`);
} else {
  shell.exec('./gradlew --rerun-tasks buildPlugin');
}
shell.cd('../../');

shell.cp(`${SOURCE}/build/distributions/*.zip`, `${DIST}`);
