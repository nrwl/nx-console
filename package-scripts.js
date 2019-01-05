const nps = require('nps-utils');
const os = require('os');

function withPlatform(command) {
  let platform;
  switch (os.platform()) {
    case 'win32':
      platform = 'win';
      break;
    case 'darwin':
      platform = 'mac';
      break;
    default:
      platform = 'linux';
      break;
  }
  return `${platform}.${command}`;
}

function electronBuilder(platform, dashP, extraFlags) {
  return `electron-builder ${platform} -p ${dashP} ${extraFlags ? extraFlags : ''}`;
}

module.exports = {
  scripts: {
    frontend: {
      build: 'ng build angular-console --prod',
      serve: 'ng serve angular-console'
    },
    server: {
      'gen-all': nps.series.nps(
        'server.gen-graphql-types',
        'server.gen-apollo-angular'
      ),
      'gen-and-build': {
        electron: nps.series.nps('server.gen-all', 'server.build.electron'),
        vscode: nps.series.nps('server.gen-all', 'server.build.vscode')
      },
      build: {
        electron: 'ng build electron --prod --maxWorkers=4',
        vscode: 'ng build vscode --prod --maxWorkers=4'
      },
      'gen-graphql-types': 'gql-gen --config codegen-server.yml',
      'gen-apollo-angular': 'gql-gen --config codegen-client.js',
      'vscode-yarn': 'node tools\\scripts\\vscode-yarn.js',
      'vscode-vsce': 'node tools\\scripts\\vscode-vsce.js'
    },
    mac: {
      clean: 'rm -rf dist',
      'copy-ng-cmd': {
        electron: 'cp tools/win/.bin/ng.cmd dist/apps/electron/ng.cmd',
        vscode: 'cp tools/win/.bin/ng.cmd dist/apps/vscode/ng.cmd'
      },
      'copy-node-pty-prebuilt': {
        vscode:
          'rm -rf dist/apps/vscode/node_modules/node-pty-prebuilt/build/Release && cp -rf tools/win/node-pty-prebuilt/build/Release dist/apps/vscode/node_modules/node-pty-prebuilt/build/Release'
      },
      'copy-frontend': {
        electron:
          'cp -rf dist/apps/angular-console dist/apps/electron/assets/public',
        vscode:
          'cp -rf dist/apps/angular-console dist/apps/vscode/assets/angular-console'
      },
      'copy-schema': {
        electron:
          'cp libs/server/src/schema/schema.graphql apps/electron/src/assets/schema.graphql',
        vscode:
          'cp libs/server/src/schema/schema.graphql apps/vscode/src/assets/schema.graphql'
      },
      'copy-yarn-lock': {
        electron: 'cp yarn.lock dist/apps/electron/yarn.lock',
        vscode: 'cp yarn.lock dist/apps/vscode/yarn.lock'
      },
      'copy-readme': {
        vscode: 'cp README.md dist/apps/vscode/README.md'
      },
      'electron-pack': 'electron-builder --mac --dir -p never',
      'copy-to-osbuilds': 'cp -r dist/packages osbuilds/mac',
      'start-server':
        'electron dist/apps/electron --server --port 4201 --inspect=9229',
      'start-electron': 'NODE_ENV=development electron dist/apps/electron',
      'builder-prerelease': electronBuilder('--mac', 'never'),
      'builder-publish': electronBuilder('--mac', 'always')
    },
    win: {
      clean: 'if exist dist rmdir dist /s /q',
      'copy-ng-cmd': {
        electron:
          'copy tools\\win\\.bin\\ng.cmd dist\\apps\\electron\\assets\\ng.cmd',
        vscode:
          'copy tools\\win\\.bin\\ng.cmd dist\\apps\\vscode\\assets\\ng.cmd'
      },
      'copy-node-pty-prebuilt': {
        vscode:
          'robocopy tools\\win\\node-pty-prebuilt\\build\\Release dist\\apps\\vscode\\node_modules\\node-pty-prebuilt\\build\\Release'
      },
      'copy-frontend': {
        electron:
          'robocopy dist\\apps\\angular-console dist\\apps\\electron\\assets\\public /e || echo 0',
        vscode:
          'robocopy dist\\apps\\angular-console dist\\apps\\vscode\\assets\\angular-console /e || echo 0'
      },
      'copy-schema': {
        electron:
          'copy libs\\server\\src\\schema\\schema.graphql apps\\electron\\src\\assets\\schema.graphql',
        vscode:
          'copy libs\\server\\src\\schema\\schema.graphql apps\\vscode\\src\\assets\\schema.graphql'
      },
      'copy-yarn-lock': {
        electron: 'copy yarn.lock dist\\apps\\electron\\yarn.lock',
        vscode: 'copy yarn.lock dist\\apps\\vscode\\yarn.lock'
      },
      'copy-readme': {
        vscode: 'copy README.md dist\\apps\\vscode\\README.md'
      },
      'electron-pack': 'electron-builder --win --dir -p never',
      'copy-to-osbuilds': 'robocopy dist\\packages osbuilds\\win /e || echo 0',
      'start-server':
        'electron dist\\apps\\electron --server --port 4201 --inspect=9229',
      'start-electron': 'electron dist\\apps\\electron',
      'builder-prerelease': electronBuilder('--win', 'never'),
      'builder-publish': electronBuilder(
        '--win',
        'always',
        '--config.win.certificateSubjectName="Narwhal Technologies Inc."'
      )
    },
    dev: {
      'patch-cli': 'node ./tools/scripts/patch-cli.js',
      prepare: {
        electron: nps.series.nps(
          withPlatform('clean'),
          'dev.build.electron',
          withPlatform('copy-yarn-lock.electron'),
          withPlatform('copy-frontend.electron'),
          'dev.patch-cli'
        ),
        vscode: nps.series.nps(
          withPlatform('clean'),
          'dev.build.vscode',
          withPlatform('copy-schema.vscode'),
          withPlatform('copy-yarn-lock.vscode'),
          withPlatform('copy-readme.vscode'),
          withPlatform('copy-frontend.vscode'),
          'server.vscode-yarn',
          'dev.patch-cli'
        )
      },
      build: {
        electron: nps.concurrent.nps(
          'server.gen-and-build.electron',
          'frontend.build'
        ),
        vscode: nps.concurrent.nps(
          'server.gen-and-build.vscode',
          'frontend.build'
        )
      },
      server: nps.series.nps(
        withPlatform('copy-schema.electron'),
        'server.gen-and-build.electron',
        withPlatform('start-server')
      ),
      up: nps.concurrent.nps('dev.server', 'frontend.serve')
    },
    package: {
      // NOTE: This command should be run on a mac with Parallels installed
      electron: nps.series.nps(
        'dev.prepare.electron',
        'mac.builder-prerelease',
        'win.builder-prerelease',
        'linux.builder-prerelease'
      ),
      vscode: nps.series.nps(
        'dev.prepare.vscode',
        withPlatform('copy-ng-cmd.vscode'),
        withPlatform('copy-node-pty-prebuilt.vscode'),
        'server.vscode-vsce'
      )
    },
    publish: {
      // NOTE: This command should be run on a mac with Parallels installed
      electron: nps.series.nps(
        'dev.prepare',
        'mac.builder-publish',
        'win.builder-publish',
        'linux.builder-publish'
      )
    },
    e2e: {
      compile: 'tsc -p apps/angular-console-e2e/tsconfig.json',
      'compile-watch': 'tsc -p apps/angular-console-e2e/tsconfig.json --watch',
      fixtures: 'node ./tools/scripts/set-up-e2e-fixtures.js',
      cypress: `cypress run --project ./apps/angular-console-e2e --env projectsRoot=${__dirname +
        '/tmp'} --record`,
      'open-cypress': `cypress open --project ./apps/angular-console-e2e --env projectsRoot=${__dirname +
        '/tmp'}`,
      run: 'node ./tools/scripts/run-e2e.js',
      up: nps.concurrent.nps('dev.up', 'e2e.compile-watch', 'e2e.open-cypress')
    },
    format: {
      default: nps.series.nps('format.write'),
      write: 'prettier {apps,libs}/**/*.{ts,css,scss,html} --write',
      check: 'prettier --list-different {apps,libs}/**/*.{ts,css,scss,html}'
    },
    lint: nps.concurrent({
      formatCheck: 'nps format.check',
      nxLint: 'nx lint',
      tsLint: 'tslint .'
    }),
    test: 'nx affected:test --base=origin/master --parallel'
  }
};

module.exports.scripts.linux = {
  ...module.exports.scripts.mac,
  'electron-pack': 'electron-builder --linux --dir -p never',
  'copy-to-osbuilds': 'cp -r dist/packages osbuilds/linux',
  'builder-prerelease': electronBuilder('--linux', 'never'),
  'builder-publish': electronBuilder('--linux', 'always')
};
