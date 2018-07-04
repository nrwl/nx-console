const cp = require('child_process');
cp.execSync('rm -rf tmp', { stdio: [0, 1, 2] });
cp.execSync('mkdir tmp', { stdio: [0, 1, 2] });
cp.execSync('rm -rf /tmp/proj', { stdio: [0, 1, 2] });
cp.execSync('mkdir /tmp/proj', { stdio: [0, 1, 2] });

cp.execSync(`${process.cwd()}/node_modules/.bin/ng new proj --collection=@schematics/angular`, { cwd: '/tmp', stdio: [0, 1, 2] });
cp.execSync('mv /tmp/proj ./tmp/proj', { stdio: [0, 1, 2] });
