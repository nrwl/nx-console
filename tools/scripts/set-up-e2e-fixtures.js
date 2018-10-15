const cp = require('child_process');
const shell = require('shelljs');
const tmp = shell.tempdir();
const path = require('path');

console.log('setting up fixtures');
shell.rm('-rf', 'tmp');
shell.mkdir('tmp');

shell.rm('-rf', path.join(tmp, 'proj'));
shell.mkdir(path.join(tmp, 'proj'));
shell.rm('-rf', path.join(tmp, 'proj-extensions'));
shell.mkdir(path.join(tmp, 'proj-extensions'));
shell.rm('-rf', path.join(tmp, 'proj-no-node-modules'));
shell.mkdir(path.join(tmp, 'proj-no-node-modules'));

cp.execSync('ng config -g cli.packageManager yarn');
cp.execSync(`${process.cwd()}/node_modules/.bin/ng new proj --collection=@schematics/angular --directory=proj --skip-git`, { cwd: tmp, stdio: [0, 1, 2] });
shell.mv(path.join(tmp, 'proj'), './tmp/proj');

cp.execSync(`${process.cwd()}/node_modules/.bin/ng new proj-extensions --collection=@schematics/angular --directory=proj-extensions --skip-git`, { cwd: tmp, stdio: [0, 1, 2] });
shell.mv(path.join(tmp, 'proj-extensions'), './tmp/proj-extensions');

cp.execSync(`${process.cwd()}/node_modules/.bin/ng new proj-no-node-modules --collection=@schematics/angular --directory=proj-no-node-modules --skip-install --skip-git`, { cwd: tmp, stdio: [0, 1, 2] });
shell.mv(path.join(tmp, 'proj-no-node-modules'), './tmp/proj-no-node-modules');
