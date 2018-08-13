const path = require("path");
const fs = require("fs");

const cp = require('child_process');
let frontend;
let server;

function runE2eTests() {
  try {
    cp.execSync('yarn start e2e.compile', { stdio: [0, 1, 2] });
    cp.execSync('yarn start e2e.cypress', { stdio: [0, 1, 2] });
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    frontend.kill();
    server.kill();
    process.exit(0);
  }
}

try {
  frontend = cp.spawn(findInPath('yarn'), ['start', 'frontend.serve']);
  server = cp.spawn(findInPath('yarn'), ['start', 'dev.server'], {stdio: [0,1,2]});
  frontend.stdout.on('data', data => {
    console.log(data.toString());
    if (data.toString().indexOf('Compiled successfully') > -1) {
      runE2eTests();
    }
  });
  frontend.stderr.on('data', data => {
    console.log(data.toString());
    if (data.toString().indexOf('Compiled successfully') > -1) {
      runE2eTests();
    }
  });
} catch (e) {
  console.error(e);
  if (frontend) {
    frontend.kill();
  }
  if (server) {
    server.kill();
  }
  process.exit(1);
}

function findInPath(command) {
  const paths = process.env.PATH.split(path.delimiter);
  for (let pathEntry of paths) {
    let fullPath;
    if (path.isAbsolute(pathEntry)) {
      fullPath = path.join(pathEntry, command);
    } else {
      fullPath = path.join(process.cwd(), pathEntry, command);
    }
    if (fs.existsSync(fullPath + '.exe')) {
      return fullPath + '.exe';
    } else if (fs.existsSync(fullPath + '.cmd')) {
      return fullPath + '.cmd';
    } else if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  return undefined;
}
