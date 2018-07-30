const cp = require('child_process');
let frontend;
let server;

function runE2eTests() {
  try {
    cp.execSync('nps e2e.compile', { stdio: [0, 1, 2] });
    cp.execSync('nps e2e.cypress', { stdio: [0, 1, 2] });
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
  frontend = cp.spawn('nps', ['frontend.serve']);
  server = cp.spawn('nps', ['server.up'], {stdio: [0,1,2]});

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




