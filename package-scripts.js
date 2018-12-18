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
      'gen-and-build': nps.series.nps(
        'server.gen-graphql-types',
        'server.gen-apollo-angular',
        'server.build'
      ),
      build: {
        default: 'ng build electron --prod --maxWorkers=4',
        vscode: 'ng build vscode --prod --maxWorkers=4'
      },
      'gen-graphql-types': 'gql-gen --config codegen-server.yml',
      'gen-apollo-angular': 'gql-gen --config codegen-client.js'
    },
    mac: {
      clean: 'rm -rf dist',
      'vsce-package': 'cd dist/apps/vscode && yarn && vsce package',
      'copy-frontend': {
        default:
          'cp -r dist/apps/angular-console dist/apps/electron/assets/public',
        vscode:
          'cp -r dist/apps/angular-console dist/apps/vscode/assets/angular-console'
      },
      'copy-schema-to-vscode':
        'cp apps/electron/src/assets/schema.graphql apps/vscode/src/assets/schema.graphql',
      'electron-pack': 'electron-builder --mac --dir -p never',
      'copy-to-osbuilds': 'cp -r dist/packages osbuilds/mac',
      'start-server': 'electron dist/apps/electron --server --inspect=9229',
      'start-electron': 'NODE_ENV=development electron dist/apps/electron',
      'electron-dist': 'electron-builder --mac -p never'
    },
    linux: {
      clean: 'rm -rf dist',
      'vsce-package': 'mac.vsce-package',
      'copy-frontend': {
        default: nps.series.nps('mac.copy-frontend'),
        vscode: nps.series.nps('mac.copy-frontend.vscode')
      },
      'copy-schema-to-vscode': nps.series.nps('mac.copy-schema'),
      'electron-pack': 'electron-builder --linux --dir -p never',
      'copy-to-osbuilds': 'cp -r dist/packages osbuilds/linux',
      'start-server': nps.series.nps('mac.start-server'),
      'start-electron': nps.series.nps('mac.start-electron'),
      'electron-dist': 'electron-builder --linux -p never'
    },
    win: {
      clean: 'if exist dist rmdir dist /s /q',
      'vsce-package': 'cd dist\\apps\\vscode && yarn && vsce package',
      'copy-frontend': {
        default:
          'robocopy dist\\apps\\angular-console dist\\apps\\electron\\assets\\public /e || echo 0',
        vscode:
          'robocopy dist\\apps\\angular-console dist\\apps\\vscode\\assets\\angular-console /e || echo 0'
      },
      'copy-schema-to-vscode':
        'robocopy apps\\electron\\src\\assets\\schema.graphql apps\\vscode\\src\\assets\\schema.graphql',
      'electron-pack': 'electron-builder --win --dir -p never',
      'copy-to-osbuilds': 'robocopy dist\\packages osbuilds\\win /e || echo 0',
      'start-server': 'electron dist\\apps\\electron --server --inspect=9229',
      'start-electron': 'electron dist\\apps\\electron',
      'electron-dist': 'electron-builder --win -p never'
    },
    dev: {
      'patch-cli': 'node ./tools/scripts/patch-cli.js',
      prepare: nps.series.nps(
        withPlatform('clean'),
        'server.gen-and-build',
        'frontend.build',
        withPlatform('copy-frontend'),
        withPlatform('electron-pack'),
        'dev.patch-cli'
      ),
      'package-vscode': nps.series.nps(
        withPlatform('clean'),
        'server.gen-graphql-types',
        'server.gen-apollo-angular',
        withPlatform('copy-schema-to-vscode'),
        'server.build.vscode',
        'frontend.build',
        withPlatform('copy-frontend.vscode'),
        withPlatform('vsce-package')
      ),
      server: nps.series.nps(
        'server.gen-and-build',
        withPlatform('start-server')
      ),
      up: nps.concurrent.nps('dev.server', 'frontend.serve'),
      'electron-dist': nps.series.nps(
        'dev.prepare',
        withPlatform('electron-dist'),
        withPlatform('copy-to-osbuilds')
      )
    },
    publish: {
      'win-builder-prerelease': electronBuilder('--win', 'never'),
      'win-builder-publish': electronBuilder('--win', 'always'),
      'mac-builder-prerelease': electronBuilder('--mac', 'never'),
      'mac-builder-publish': electronBuilder('--mac', 'always'),
      'linux-builder-prerelease': electronBuilder('--linux', 'never'),
      'linux-builder-publish': electronBuilder('--linux', 'always'),
      'win-prerelease': nps.series.nps(
        'dev.prepare',
        'publish.win-builder-prerelease'
      ),
      'win-publish': nps.series.nps(
        'dev.prepare',
        'publish.win-builder-publish'
      ),
      'linux-prerelease': nps.series.nps(
        'dev.prepare',
        'publish.linux-builder-prerelease'
      ),
      'linux-publish': nps.series.nps(
        'dev.prepare',
        'publish.linux-builder-publish'
      ),
      'mac-prerelease': nps.series.nps(
        'dev.prepare',
        'publish.mac-builder-prerelease'
      ),
      'mac-publish': nps.series.nps(
        'dev.prepare',
        'publish.mac-builder-publish'
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
