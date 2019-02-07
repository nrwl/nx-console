const nps = require('nps-utils');
const os = require('os');
const { join } = require('path');

function electronOrVscode(command) {
  return {
    electron: command.replace(/APPLICATION/g, 'electron'),
    vscode: command.replace(/APPLICATION/g, 'vscode')
  };
}

function affected(affectedCommand) {
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
  'node-pty-prebuilt': {
    from: join('tools', 'win', 'node-pty-prebuilt', 'build', 'Release'),
    to: join(
      APPLICATION_BUNDLE_PATH,
      'node_modules',
      'node-pty-prebuilt',
      'build'
    )
  },
  'extensions-schema': {
    from: join(
      './node_modules',
      '@nrwl',
      'angular-console-enterprise-electron',
      'schema.graphql'
    ),
    to: join(APPLICATION_BUNDLE_PATH, 'assets', 'extensions-schema.graphql')
  },
  'server-assets': {
    from: join('libs', 'server', 'src', 'assets', '*'),
    to: join(APPLICATION_BUNDLE_PATH, 'assets')
  },
  readme: {
    from: 'README.md',
    to: join(APPLICATION_BUNDLE_PATH, 'README.md')
  },
  schema: {
    from: join(
      'node_modules',
      '@nrwl',
      'angular-console-enterprise-electron',
      'schema.graphql'
    ),
    to: join(
      APPLICATION_BUNDLE_PATH,
      'assets',
      'angular-console-enterprise-electron-schema.graphql'
    )
  }
};

module.exports = {
  scripts: {
    dev: {
      'copy-assets': {
        electron: nps.series(
          'nps dev.copy-assets-base.electron',
          `shx chmod 0755 ${join(
            'dist',
            'apps',
            'electron',
            'assets',
            'new-workspace'
          )}`
        ),
        vscode: nps.series(
          'nps dev.copy-assets-base.vscode',
          `shx rm -rf ${assetMappings['node-pty-prebuilt'].to}]`,
          `shx cp -rf ${assetMappings['node-pty-prebuilt'].from} ${
            assetMappings['node-pty-prebuilt'].to
          }`.replace(/APPLICATION/g, 'vscode')
        )
      },
      'copy-assets-base': electronOrVscode(
        nps.concurrent({
          schema: `shx cp ${assetMappings['schema'].from} ${
            assetMappings['schema'].to
          }`,
          'server-assets': `shx cp -rf ${assetMappings['server-assets'].from} ${
            assetMappings['server-assets'].to
          }`,
          readme: `shx cp ${assetMappings['readme'].from} ${
            assetMappings['readme'].to
          }`,
          'extensions-schema': `shx cp ${
            assetMappings['extensions-schema'].from
          } ${assetMappings['extensions-schema'].to}`,
          cli: 'node ./tools/scripts/patch-cli.js'
        })
      ),
      server: {
        default: nps.series.nps(
          'dev.server.gen-and-build.electron',
          'dev.copy-assets.electron',
          'dev.server.start'
        ),
        start: `npx electron ${ELECTRON_BUNDLE_PATH} --server --port 4201 --inspect=9229`,
        gen: electronOrVscode(
          nps.series(
            'gql-gen --config ./tools/scripts/codegen-server.yml',
            'gql-gen --config ./tools/scripts/codegen-client.js',
            'ng build APPLICATION --prod --maxWorkers=2 --noSourceMap'
          )
        ),
        'gen-and-build': electronOrVscode(
          nps.series(
            'nps dev.server.gen.APPLICATION',
            'ng build APPLICATION --prod --maxWorkers=2 --noSourceMap'
          )
        )
      },
      up: {
        default: nps.concurrent({
          server: 'nps dev.server',
          frontend: 'ng serve angular-console'
        }),
        cypress: nps.concurrent({
          server: 'nps dev.server.start',
          frontend: 'ng run angular-console:serve:cypress'
        })
      }
    },
    clean: 'shx rm -rf dist/',
    prepare: {
      ...electronOrVscode(
        nps.series.nps(
          'clean',
          'build.APPLICATION',
          'install-dependencies.APPLICATION',
          'dev.copy-assets.APPLICATION'
        )
      )
    },
    package: {
      electronMac: nps.series(
        'nps prepare.electron',
        electronBuilder('--mac', 'never'),
        electronBuilder('--linux', 'never')
      ),
      electronWin: nps.series(
        'nps prepare.electron',
        electronBuilder('--win', 'never')
      ),
      vscode: nps.series(
        'nps prepare.vscode',
        `shx rm -rf ${join('dist', 'apps', 'vscode', '**', '*.ts')}`,
        `node ${join('tools', 'scripts', 'vscode-vsce.js')}`
      )
    },
    publish: {
      electronWin: nps.series(
        'nps prepare.electron',
        electronBuilder(
          '--win',
          'always',
          '--config.win.certificateSubjectName="Narwhal Technologies Inc."'
        )
      )
    },
    e2e: {
      fixtures: 'node ./tools/scripts/set-up-e2e-fixtures.js',
      prepare: nps.concurrent.nps('prepare.electron', 'e2e.fixtures'),
      up: 'node ./tools/scripts/e2e.js --watch',
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
      affected: affected('lint'),
      fix: {
        default: 'nx affected:lint --all --parallel --fix',
        affected: affected('lint --fix')
      }
    },
    build: {
      default: 'nx affected:build --all --parallel',
      affected: affected('build'),
      ...electronOrVscode(
        nps.series(
          'nps dev.server.gen-and-build.APPLICATION',
          'ng build angular-console --configuration=APPLICATION'
        )
      )
    },
    test: {
      default: 'nx affected:test --all --parallel',
      affected: affected('test')
    },
    'install-dependencies': {
      vscode: `node ${join('tools', 'scripts', 'vscode-yarn.js')}`,
      electron: `node ${join('tools', 'scripts', 'electron-yarn.js')}`
    }
  }
};
