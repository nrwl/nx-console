const cp = require('child_process');
const shell = require('shelljs');
const tmp = shell.tempdir();
const path = require('path');

console.log(`setting up fixtures`);

shell.rm('-rf', 'tmp');
shell.mkdir('tmp');

shell.rm('-rf', path.join(tmp, 'proj'));
shell.mkdir(path.join(tmp, 'proj'));
shell.rm('-rf', path.join(tmp, 'proj-extensions'));
shell.mkdir(path.join(tmp, 'proj-extensions'));
shell.rm('-rf', path.join(tmp, 'proj-no-node-modules'));
shell.mkdir(path.join(tmp, 'proj-no-node-modules'));
shell.rm('-rf', path.join(tmp, 'proj-local-collection'));
shell.mkdir(path.join(tmp, 'proj-local-collection'));

shell.rm('-rf', path.join(tmp, 'ng'));
shell.mkdir(path.join(tmp, 'ng'));
cp.execSync('yarn add @angular/cli@7.0.4', {cwd: path.join(tmp, 'ng')});
cp.execSync('yarn add @angular-devkit/schematics-cli @schematics/schematics', {cwd: path.join(tmp, 'ng')});
cp.execSync('yarn add json', {cwd: path.join(tmp, 'ng')});

cp.execSync('ng config -g cli.packageManager yarn');
cp.execSync(`${path.join(tmp, 'ng')}/node_modules/.bin/ng new proj --collection=@schematics/angular --directory=proj --skip-git --no-interactive`, { cwd: tmp, stdio: [0, 1, 2] });
shell.mv(path.join(tmp, 'proj'), './tmp/proj');

cp.execSync(`${path.join(tmp, 'ng')}/node_modules/.bin/ng new proj-extensions --collection=@schematics/angular --directory=proj-extensions --skip-git --no-interactive`, { cwd: tmp, stdio: [0, 1, 2] });
shell.mv(path.join(tmp, 'proj-extensions'), './tmp/proj-extensions');

cp.execSync(`${path.join(tmp, 'ng')}/node_modules/.bin/ng new proj-no-node-modules --collection=@schematics/angular --directory=proj-no-node-modules --skip-install --skip-git --no-interactive`, { cwd: tmp, stdio: [0, 1, 2] });
shell.mv(path.join(tmp, 'proj-no-node-modules'), './tmp/proj-no-node-modules');

cp.execSync(`${path.join(tmp, 'ng')}/node_modules/.bin/ng new proj-local-collection --collection=@schematics/angular --directory=proj-local-collection --skip-git --no-interactive`, { cwd: tmp, stdio: [0, 1, 2] });
shell.mv(path.join(tmp, 'proj-local-collection'), './tmp/proj-local-collection');
shell.cd('./tmp/proj-local-collection');
cp.execSync(`${path.join(tmp, 'ng')}/node_modules/.bin/schematics schematic --name=schematics .`);
cp.execSync(`${path.join(tmp, 'ng')}/node_modules/.bin/json -I -f package.json -e 'this.schematics="./schematics/src/collection.json"'`);
cp.execSync('ng config cli.defaultCollection schematics')
shell.cd('schematics');
cp.execSync(`${path.join(tmp, 'ng')}/node_modules/.bin/tsc`);
