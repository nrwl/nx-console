const path = require('path');
const fs = require('fs');
const cp = require('child_process');
let dev;

let flags = process.argv.slice(2).join(' ');

function runE2eTests() {
  try {
    const x = cp.execSync(`ng e2e ${flags}`, {
      stdio: [0, 1, 2],
      env: {
        ...process.env,
        CYPRESS_projectsRoot: path.join(__dirname, '../../tmp')
      }
    });
    dev.kill();
    process.exit(0);
  } catch (e) {
    console.error(e);
    dev.kill('SIGKILL');
    process.exit(1);
  }
}

try {
  dev = cp.spawn(findInPath('yarn'), ['start', 'dev.up.cypress']);
  dev.stdout.on('data', data => {
    console.log(data.toString());
    if (data.toString().indexOf('Listening on port 4201') > -1) {
      runE2eTests();
    }
  });
} catch (e) {
  console.error(e);
  if (dev) {
    dev.kill('SIGKILL');
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
