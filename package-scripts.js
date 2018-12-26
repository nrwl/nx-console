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

function electronBuilder(platform, dashP) {
  return `electron-builder ${platform} -p ${dashP} --config.win.certificateSubjectName="Narwhal Technologies Inc."`;
}

module.exports = {
  scripts: {
    frontend: {
      build: 'ng build angular-console --prod',
      serve: 'ng serve angular-console'
    },
    server: {
      'gen-all': nps.concurrent.nps(
        'server.gen-graphql-types',
        'server.gen-apollo-angular'
      ),
      'gen-and-build': nps.series.nps('server.gen-all', 'server.build'),
      build: {
        default: 'ng build electron --prod --maxWorkers=4',
        vscode: 'ng build vscode --prod --maxWorkers=4'
      },
      'gen-graphql-types': 'gql-gen --config codegen-server.yml',
      'gen-apollo-angular': 'gql-gen --config codegen-client.js'
    },
    mac: {
      clean: 'rm -rf dist',
      'vsce-package':
        'cd dist/apps/vscode && yarn install --production --pure-lockfile --ignore-optional --no-bin-links --non-interactive && vsce package',
      'copy-frontend': {
        default:
          'cp -r dist/apps/angular-console dist/apps/electron/assets/public',
        vscode:
          'cp -r dist/apps/angular-console dist/apps/vscode/assets/angular-console'
      },
      'copy-schema': {
        default:
          'cp libs/server/src/schema/schema.graphql apps/electron/src/assets/schema.graphql',
        vscode:
          'cp libs/server/src/schema/schema.graphql apps/vscode/src/assets/schema.graphql'
      },
      'copy-yarn-lock': {
        default: 'cp yarn.lock apps/electron/src/yarn.lock',
        vscode: 'cp yarn.lock apps/vscode/src/yarn.lock'
      },
      'copy-readme': {
        vscode: 'cp README.md apps/vscode/src/README.md'
      },
      'electron-pack': 'electron-builder --mac --dir -p never',
      'copy-to-osbuilds': 'cp -r dist/packages osbuilds/mac',
      'start-server': 'electron dist/apps/electron --server --inspect=9229',
      'start-electron': 'NODE_ENV=development electron dist/apps/electron',
      'builder-prerelease': electronBuilder('--mac', 'never'),
      'builder-publish': electronBuilder('--mac', 'always')
    },
    linux: {
      clean: 'rm -rf dist',
      'vsce-package': 'mac.vsce-package',
      'copy-frontend': {
        default: nps.series.nps('mac.copy-frontend'),
        vscode: nps.series.nps('mac.copy-frontend.vscode')
      },
      'copy-schema': {
        default: nps.series.nps('mac.copy-frontend'),
        vscode: nps.series.nps('mac.copy-frontend.vscode')
      },
      'copy-yarn-lock': {
        default: nps.series.nps('mac.copy-yarn-lock'),
        vscode: nps.series.nps('mac.copy-yarn-lock.vscode')
      },
      'copy-readme': {
        vscode: nps.series.nps('mac.copy-readme.vscode')
      },
      'electron-pack': 'electron-builder --linux --dir -p never',
      'copy-to-osbuilds': 'cp -r dist/packages osbuilds/linux',
      'start-server': nps.series.nps('mac.start-server'),
      'start-electron': nps.series.nps('mac.start-electron'),
      'builder-prerelease': electronBuilder('--linux', 'never'),
      'builder-publish': electronBuilder('--linux', 'always')
    },
    win: {
      clean: 'if exist dist rmdir dist /s /q',
      'vsce-package':
        'cd dist\\apps\\vscode && yarn install --production --pure-lockfile --ignore-optional --no-bin-links --non-interactive && vsce package',
      'copy-frontend': {
        default:
          'robocopy dist\\apps\\angular-console dist\\apps\\electron\\assets\\public /e || echo 0',
        vscode:
          'robocopy dist\\apps\\angular-console dist\\apps\\vscode\\assets\\angular-console /e || echo 0'
      },
      'copy-schema': {
        default:
          'robocopy apps\\electron\\src\\assets\\schema.graphql apps\\electron\\src\\assets\\schema.graphql',
        vscode:
          'robocopy apps\\electron\\src\\assets\\schema.graphql apps\\vscode\\src\\assets\\schema.graphql'
      },
      'copy-yarn-lock': {
        default: 'robocopy yarn.lock apps\\electron\\src\\yarn.lock',
        vscode: 'robocopy yarn.lock apps\\vscode\\src\\yarn.lock'
      },
      'copy-readme': {
        vscode: 'robocopy README.md apps\\vscode\\src\\README.md'
      },
      'electron-pack': 'electron-builder --win --dir -p never',
      'copy-to-osbuilds': 'robocopy dist\\packages osbuilds\\win /e || echo 0',
      'start-server': 'electron dist\\apps\\electron --server --inspect=9229',
      'start-electron': 'electron dist\\apps\\electron',
      'builder-prerelease': electronBuilder('--win', 'never'),
      'builder-publish': electronBuilder('--win', 'always')
    },
    dev: {
      'patch-cli': 'node ./tools/scripts/patch-cli.js',
      prepare: {
        default: nps.series.nps(
          withPlatform('clean'),
          withPlatform('copy-yarn-lock'),
          'build-electron',
          withPlatform('copy-frontend'),
          withPlatform('electron-pack'),
          'dev.patch-cli'
        ),
        vscode: nps.series.nps(
          'server.gen-all',
          withPlatform('copy-schema.vscode'),
          withPlatform('copy-yarn-lock.vscode'),
          withPlatform('copy-readme.vscode'),
          'dev.build.vscode',
          'dev.patch-cli',
          withPlatform('copy-frontend.vscode')
        )
      },
      build: {
        default: nps.concurrent.nps('server.gen-and-build', 'frontend.build'),
        vscode: nps.concurrent.nps('server.build.vscode', 'frontend.build')
      },
      server: nps.series.nps(
        withPlatform('copy-schema'),
        'server.gen-and-build',
        withPlatform('start-server')
      ),
      up: nps.concurrent.nps('dev.server', 'frontend.serve')
    },
    package: {
      default: nps.series.nps(
        'dev.prepare',
        withPlatform('builder-prerelease'),
        withPlatform('copy-to-osbuilds')
      ),
      vscode: nps.series.nps(
        withPlatform('clean'),
        'dev.prepare.vscode',
        withPlatform('vsce-package')
      )
    },
    publish: {
      prerelease: nps.series.nps(
        'dev.prepare',
        withPlatform('builder-prerelease')
      ),
      release: nps.series.nps(
        'dev.prepare',
        withPlatform('publish.builder-publish')
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
