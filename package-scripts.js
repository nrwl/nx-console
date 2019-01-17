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

function electronOrVscode(command) {
  return {
    electron: command.replace(/APPLICATION/g, 'electron'),
    vscode: command.replace(/APPLICATION/g, 'vscode')
  };
}

function electronBuilder(platform, dashP, extraFlags) {
  return `electron-builder ${platform} -p ${dashP} ${
    extraFlags ? extraFlags : ''
  }`;
}

module.exports = {
  scripts: {
    frontend: {
      build: 'ng build angular-console --prod',
      serve: 'ng serve angular-console'
    },
    server: {
      gen: nps.series.nps(
        'server.gen-apollo-angular',
        'server.gen-graphql-types'
      ),
      'gen-graphql-types': 'gql-gen --config codegen-server.yml',
      'gen-apollo-angular': 'gql-gen --config codegen-client.js',
      build: electronOrVscode('ng build APPLICATION --prod --maxWorkers=4'),
      'gen-and-build': electronOrVscode(
        nps.series.nps('server.gen', 'server.build.APPLICATION')
      ),
      buildForServe: 'ng build electron'
    },
    mac: {
      clean: 'rm -rf dist',
      'copy-ng-cmd': electronOrVscode(
        'cp tools/win/.bin/ng.cmd dist/apps/APPLICATION/ng.cmd'
      ),
      'copy-node-pty-prebuilt': {
        vscode:
          'rm -rf dist/apps/vscode/node_modules/node-pty-prebuilt/build/Release && cp -rf tools/win/node-pty-prebuilt/build/Release dist/apps/vscode/node_modules/node-pty-prebuilt/build/Release'
      },
      'copy-frontend': electronOrVscode(
        'cp -rf dist/apps/angular-console dist/apps/APPLICATION/assets/public'
      ),
      'copy-schema': electronOrVscode(
        'cp libs/server/src/schema/schema.graphql dist/apps/APPLICATION/assets/schema.graphql'
      ),
      'copy-readme': {
        vscode: 'cp README.md dist/apps/vscode/README.md'
      },
      'electron-pack': 'electron-builder --mac --dir -p never',
      'copy-to-osbuilds': 'cp -r dist/packages osbuilds/mac',
      'start-server':
        'electron dist/apps/electron --server --port 4201 --inspect=9229',
      'start-electron': 'NODE_ENV=development electron dist/apps/electron',
      'builder-prerelease': electronBuilder('--mac', 'never'),
      'builder-publish': electronBuilder('--mac', 'always'),
      'vscode-yarn': 'node tools/scripts/vscode-yarn.js',
      'vscode-vsce': 'node tools/scripts/vscode-vsce.js'
    },
    win: {
      clean: 'if exist dist rmdir dist /s /q',
      'copy-ng-cmd': electronOrVscode(
        'copy tools\\win\\.bin\\ng.cmd dist\\apps\\APPLICATION\\assets\\ng.cmd'
      ),
      'copy-node-pty-prebuilt': {
        vscode: nps.series.nps(
          'win.copy-node-pty-prebuilt.delete',
          'win.copy-node-pty-prebuilt.copy'
        ),
        delete:
          'rmdir dist\\apps\\vscode\\node_modules\\node-pty-prebuilt\\build\\Release /s /q',
        copy:
          'robocopy tools\\win\\node-pty-prebuilt\\build\\Release dist\\apps\\vscode\\node_modules\\node-pty-prebuilt\\build\\Release /e || echo 0'
      },
      'copy-frontend': {
        electron:
          'robocopy dist\\apps\\angular-console dist\\apps\\electron\\assets\\public /e || echo 0',
        vscode:
          'robocopy dist\\apps\\angular-console dist\\apps\\vscode\\assets\\angular-console /e || echo 0'
      },
      'copy-schema': electronOrVscode(
        'copy libs\\server\\src\\schema\\schema.graphql dist\\apps\\APPLICATION\\assets\\schema.graphql'
      ),
      'copy-readme': {
        vscode: 'copy README.md dist\\apps\\vscode\\README.md'
      },
      'electron-pack': 'electron-builder --win --dir -p never',
      'start-server':
        'electron dist\\apps\\electron --server --port 4201 --inspect=9229',
      'start-electron': 'electron dist\\apps\\electron',
      'builder-prerelease': electronBuilder('--win', 'never'),
      'builder-publish': electronBuilder(
        '--win',
        'always',
        '--config.win.certificateSubjectName="Narwhal Technologies Inc."'
      ),
      'vscode-yarn': 'node tools\\scripts\\vscode-yarn.js',
      'vscode-vsce': 'node tools\\scripts\\vscode-vsce.js'
    },
    dev: {
      'patch-cli': 'node ./tools/scripts/patch-cli.js',
      prepare: {
        electron: nps.series.nps(
          withPlatform('clean'),
          'dev.build.electron',
          withPlatform('electron-pack'),
          withPlatform('copy-frontend.electron'),
          'dev.patch-cli'
        ),
        vscode: nps.series.nps(
          withPlatform('clean'),
          'dev.build.vscode',
          withPlatform('copy-schema.vscode'),
          withPlatform('copy-readme.vscode'),
          withPlatform('copy-frontend.vscode'),
          withPlatform('vscode-yarn'),
          'dev.patch-cli',
          withPlatform('copy-ng-cmd.vscode'),
          withPlatform('copy-node-pty-prebuilt.vscode')
        )
      },
      build: electronOrVscode(
        nps.concurrent.nps('server.gen-and-build.APPLICATION', 'frontend.build')
      ),
      gen: nps.series.nps(withPlatform('copy-schema.electron'), 'server.gen'),
      server: nps.series.nps(
        'server.buildForServe',
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
      vscode: nps.series.nps('dev.prepare.vscode', withPlatform('vscode-vsce'))
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
      fixtures: 'node ./tools/scripts/set-up-e2e-fixtures.js',
      up: 'node ./tools/scripts/e2e.js --watch',
      run: 'node ./tools/scripts/e2e.js --headless --record'
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
  'builder-prerelease': electronBuilder('--linux', 'never'),
  'builder-publish': electronBuilder('--linux', 'always')
};
