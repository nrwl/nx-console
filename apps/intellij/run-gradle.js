const { execSync } = require('child_process');
const os = require('os');

const arg = process.argv[2];
const gradlew = os.platform() === 'win32' ? 'gradlew.bat' : './gradlew';
execSync(gradlew, [arg], {
    stdio: 'pipe',
    env: process.env,
    cwd: process.cwd()
});

   

