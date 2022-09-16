import { execSync } from 'child_process';

// https://github.com/GabrielBB/xvfb-action/blob/master/index.js
function main() {
  if (process.platform === 'linux') {
    execSync('sudo apt-get install -y xvfb');
  }
  console.log('starting xvfb...');
  execSync(
    `xvfb-run -a --server-args="-screen 0 1920x1080x24" wdio run ./wdio.conf.ts`,
    {
      stdio: [0, 1, 2],
    }
  );
}

main();
