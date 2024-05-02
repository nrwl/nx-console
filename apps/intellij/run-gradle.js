const { spawn } = require('child_process');
const os = require('os');

const arg = process.argv[2];
const gradlew = os.platform() === 'win32' ? 'gradlew.bat' : './gradlew';

const gradleCommand = os.platform() === 'win32' ? 'gradlew.bat' : './gradlew';

const gradleProcess = spawn(gradleCommand, [arg], { shell: true, stdio: 'inherit' });

gradleProcess.on('error', (err) => {
  console.error(`Failed to start subprocess: ${err}`);
  process.exit(1);
});

gradleProcess.on('close', (code) => {
  console.log(`Gradle process exited with code ${code}`);
  process.exit(code);
});
