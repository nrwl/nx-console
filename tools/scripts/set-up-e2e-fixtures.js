const cp = require('child_process');
const shell = require('shelljs');
const tmp = require('tmp').dirSync().name;
const path = require('path');
const fs = require('fs');

console.log(`setting up fixtures`);

let flags = process.argv.slice(2);

if (flags.includes('--ci-1')) {
}

shell.rm('-rf', 'tmp');
shell.mkdir('tmp');

shell.mkdir(path.join(tmp, 'proj'));
shell.mkdir(path.join(tmp, 'proj-extensions'));
shell.mkdir(path.join(tmp, 'proj-no-node-modules'));
shell.mkdir(path.join(tmp, 'proj-nx'));
shell.mkdir(path.join(tmp, 'ng'));

cp.execSync('yarn add @angular/cli@7.3.1', { cwd: path.join(tmp, 'ng') });
cp.execSync('yarn add @nrwl/schematics@7.5.2', { cwd: path.join(tmp, 'ng') });
cp.execSync('ng config -g cli.packageManager yarn');

cp.execSync(
  `${path.join(
    tmp,
    'ng'
  )}/node_modules/.bin/ng new proj --collection=@schematics/angular --directory=proj --skip-git --no-interactive`,
  { cwd: tmp, stdio: [0, 1, 2] }
);

const angularJson = JSON.parse(
  fs.readFileSync(path.join(tmp, 'proj', 'angular.json')).toString()
);
angularJson.schematics = {
  '@schematics/angular:service': {
    flat: false
  }
};
fs.writeFileSync(
  path.join(tmp, 'proj', 'angular.json'),
  JSON.stringify(angularJson, null, 2)
);

const karma = fs
  .readFileSync(path.join(tmp, 'proj', 'src', 'karma.conf.js'))
  .toString();
fs.writeFileSync(
  path.join(tmp, 'proj', 'src', 'karma.conf.js'),
  karma.replace('Chrome', 'ChromeHeadless')
);

// add a custom task that will invoke lint
const parsedAngularJson = JSON.parse(
  fs.readFileSync(path.join(tmp, 'proj', 'angular.json')).toString()
);
const configForProj = parsedAngularJson.projects.proj;
configForProj.architect.custom = configForProj.architect.lint;
fs.writeFileSync(
  path.join(tmp, 'proj', 'angular.json'),
  JSON.stringify(parsedAngularJson, null, 2)
);

shell.mv(path.join(tmp, 'proj'), './tmp/proj');

cp.exec(
  `${path.join(
    tmp,
    'ng'
  )}/node_modules/.bin/ng new proj-no-node-modules --collection=@schematics/angular --directory=proj-no-node-modules --skip-install --skip-git --no-interactive`,
  { cwd: tmp, stdio: [0, 1, 2] },
  () => {
    shell.mv(
      path.join(tmp, 'proj-no-node-modules'),
      './tmp/proj-no-node-modules'
    );
  }
);

cp.execSync(
  `${path.join(
    tmp,
    'ng'
  )}/node_modules/.bin/ng new proj-extensions --collection=@schematics/angular --directory=proj-extensions --skip-git --no-interactive`,
  { cwd: tmp, stdio: [0, 1, 2] }
);
shell.mv(path.join(tmp, 'proj-extensions'), './tmp/proj-extensions');

cp.execSync(
  `${path.join(
    tmp,
    'ng'
  )}/node_modules/.bin/ng new proj-nx --minimal --collection=@nrwl/schematics --directory=proj-nx --skip-git --no-interactive`,
  { cwd: tmp, stdio: [0, 1, 2] }
);

shell.mv(path.join(tmp, 'proj-nx'), './tmp/proj-nx');
