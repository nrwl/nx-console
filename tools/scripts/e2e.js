const path = require('path');
const fs = require('fs');
const cp = require('child_process');
let dev;

const flags = process.argv.slice(2).join(' ');

function runE2eTests() {
  try {
    cp.execSync(`ng e2e angular-console-e2e ${flags}`, {
      stdio: [0, 1, 2],
      env: {
        ...process.env,
        CYPRESS_projectsRoot: path.join(__dirname, '../../tmp')
      }
    });
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    dev.kill();
    process.exit(0);
  }
}

try {
  dev = cp.spawn(findInPath('yarn'), ['start', 'dev.up.cypress']);
  dev.stdout.on('data', data => {
    console.log(data.toString());
    if (data.toString().indexOf('Compiled successfully') > -1) {
      runE2eTests();
    }
  });
} catch (e) {
  console.error(e);
  if (dev) {
    dev.kill();
  }
  process.exit(1);
}

function findInPath(command) {
  const paths = process.env.PATH.split(path.delimiter);
  for (let pathEntry of paths) {
    if (pathEntry.indexOf('Temp') > -1) continue;
    let fullPath;
    if (path.isAbsolute(pathEntry)) {
      fullPath = path.join(pathEntry, command);
    } else {
      fullPath = path.join(process.cwd(), pathEntry, command);
    }
    if (fs.existsSync(fullPath + '.cmd')) {
      return fullPath + '.cmd';
    } else if (fs.existsSync(fullPath + '.exe')) {
      return fullPath + '.exe';
    } else if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  return undefined;
}
