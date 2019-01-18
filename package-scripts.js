const nps = require('nps-utils');
const os = require('os');
const { join } = require('path');

function electronOrVscode(command) {
  return {
    electron: command.replace(/APPLICATION/g, 'electron'),
    vscode: command.replace(/APPLICATION/g, 'vscode')
  };
}

function against(affectedCommand) {
  return {
    'origin-master': `nx affected:${affectedCommand} --base=origin/master --parallel`,
    'upstream-master': `nx affected:${affectedCommand} --base=upstream/master --parallel`
  };
}

function electronBuilder(platform, dashP, extraFlags) {
  return `electron-builder ${platform} -p ${dashP} ${
    extraFlags ? extraFlags : ''
  }`;
}

const ELECTRON_BUNDLE_PATH = join('dist', 'apps', 'electron');
const APPLICATION_BUNDLE_PATH = join('dist', 'apps', 'APPLICATION');
const assetMappings = {
  'ng-cmd': {
    from: join('tools', 'win', '.bin', 'ng.cmd'),
    to: join(APPLICATION_BUNDLE_PATH, 'ng.cmd')
  },
  'node-pty-prebuilt': {
    from: join('tools', 'win', 'node-pty-prebuilt', 'build', 'Release'),
    to: join(
      APPLICATION_BUNDLE_PATH,
      'node_modules',
      'node-pty-prebuilt',
      'build',
      'Release'
    )
  },
  schema: {
    from: join('libs', 'server', 'src', 'schema', 'schema.graphql'),
    to: join(APPLICATION_BUNDLE_PATH, 'assets', 'schema.graphql')
  },
  readme: {
    from: 'README.md',
    to: join(APPLICATION_BUNDLE_PATH, 'README.md')
  }
};

module.exports = {
  scripts: {
    dev: {
      'copy-assets': electronOrVscode(
        nps.concurrent({
          'ng-cmd': `shx cp ${assetMappings['ng-cmd'].from} ${
            assetMappings['ng-cmd'].to
          }`,

          schema: `shx cp ${assetMappings['schema'].from} ${
            assetMappings['schema'].to
          }`,
          readme: `shx cp ${assetMappings['readme'].from} ${
            assetMappings['readme'].to
          }`,
          cli: 'node ./tools/scripts/patch-cli.js'
        })
      ),
      'start-electron': `NODE_ENV=development electron ${ELECTRON_BUNDLE_PATH}`,
      server: {
        default: nps.series.nps(
          'dev.server.gen-and-build.electron',
          'dev.copy-assets.electron',
          'dev.server.start'
        ),
        start: `electron ${ELECTRON_BUNDLE_PATH} --server --port 4201 --inspect=9229`,
        gen: electronOrVscode(
          nps.series(
            'gql-gen --config codegen-server.yml',
            'gql-gen --config codegen-client.js',
            'ng build APPLICATION --prod --maxWorkers=4'
          )
        ),
        'gen-and-build': electronOrVscode(
          nps.series(
            'nps dev.server.gen.APPLICATION',
            'ng build APPLICATION --prod --maxWorkers=4'
          )
        )
      },
      up: {
        default: nps.concurrent({
          server: 'nps dev.server',
          frontend: 'ng serve angular-console'
        }),
        cypress: nps.concurrent({
          server: 'nps dev.server',
          frontend: 'ng serve angular-console --configuration cypress'
        })
      }
    },
    prepare: {
      ...electronOrVscode(
        nps.series.nps(
          'build.APPLICATION',
          'install-dependencies.APPLICATION',
          'dev.copy-assets.APPLICATION'
        )
      )
    },
    package: {
      // NOTE: This command should be run on a mac with Parallels installed
      electron: nps.series.nps(
        'prepare.electron',
        electronBuilder('--mac', 'never'),
        electronBuilder('--win', 'never'),
        electronBuilder('--linux', 'never')
      ),
      vscode: nps.series(
        'nps prepare.vscode',
        `shx rm -rf ${assetMappings['node-pty-prebuilt'].to}]`,
        `shx cp -rf ${assetMappings['node-pty-prebuilt'].from} ${
          assetMappings['node-pty-prebuilt'].to
        }`,
        `node ${join('tools', 'scripts', 'vscode-vsce.js')}`
      )
    },
    publish: {
      // NOTE: This command should be run on a mac with Parallels installed
      electron: nps.series.nps(
        'dev.prepare',
        electronBuilder('--mac', 'always'),
        electronBuilder(
          '--win',
          'always',
          '--config.win.certificateSubjectName="Narwhal Technologies Inc."'
        ),
        electronBuilder('--linux', 'always')
      )
    },
    e2e: {
      build: nps.series.nps(
        'build.electron.cypress',
        'dev.copy-assets.electron'
      ),
      fixtures: 'node ./tools/scripts/set-up-e2e-fixtures.js',
      prepare: nps.concurrent.nps('e2e.build', 'e2e.fixtures'),
      up: 'node ./tools/scripts/e2e.js --watch',
      headless: 'node ./tools/scripts/e2e.js --headless',
      ci: 'node ./tools/scripts/e2e.js --headless --record'
    },
    format: {
      default: 'nx format:write',
      write: 'nx format:write',
      check: 'nx format:check'
    },
    lint: {
      default: nps.concurrent({
        formatCheck: 'nps format.check',
        nxLint: 'nx lint',
        tsLint: 'nx affected:lint --all --parallel'
      }),
      against: against('lint'),
      fix: {
        default: 'nx affected:lint --all --parallel --fix',
        against: against('lint --fix')
      }
    },
    build: {
      default: 'nx affected:build --all --parallel',
      against: against('build'),
      ...electronOrVscode(
        nps.concurrent({
          server: 'nps dev.server.gen-and-build.APPLICATION',
          frontend: 'ng build angular-console --configuration=APPLICATION'
        })
      )
    },
    test: {
      default: 'nx affected:test --all --parallel',
      against: against('test')
    },
    'install-dependencies': {
      vscode: `node ${join('tools', 'scripts', 'vscode-yarn.js')}`,
      electron: `electron-builder --${
        os.platform() === 'win32'
          ? 'win'
          : os.platform() === 'darwin'
          ? 'mac'
          : 'linux'
      } --dir -p never`
    }
  }
};
