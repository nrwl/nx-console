const cp = require('child_process');
cp.execSync('rm -rf tmp', { stdio: [0, 1, 2] });
cp.execSync('mkdir tmp', { stdio: [0, 1, 2] });

cp.execSync('rm -rf /tmp/proj', { stdio: [0, 1, 2] });
cp.execSync('mkdir /tmp/proj', { stdio: [0, 1, 2] });

cp.execSync('rm -rf /tmp/proj-no-node-modules', { stdio: [0, 1, 2] });
cp.execSync('mkdir /tmp/proj-no-node-modules', { stdio: [0, 1, 2] });

cp.execSync(`${process.cwd()}/node_modules/.bin/ng new proj --collection=@schematics/angular --directory=proj`, { cwd: '/tmp', stdio: [0, 1, 2] });
cp.execSync('mv /tmp/proj ./tmp/proj', { stdio: [0, 1, 2] });

cp.execSync(`${process.cwd()}/node_modules/.bin/ng new proj-no-node-modules --collection=@schematics/angular --directory=proj-no-node-modules --skip-install`, { cwd: '/tmp', stdio: [0, 1, 2] });
cp.execSync('mv /tmp/proj-no-node-modules ./tmp/proj-no-node-modules', { stdio: [0, 1, 2] });
