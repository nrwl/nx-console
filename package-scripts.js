const nps = require('nps-utils');
const os = require('os');
const { join } = require('path');

function forEachApplication(command) {
  return {
    electron: command.replace(/APPLICATION/g, 'electron'),
    intellij: command.replace(/APPLICATION/g, 'intellij'),
    vscode: command.replace(/APPLICATION/g, 'vscode')
  };
}

function affected(affectedCommand) {
  return {
    'origin-master': `nx affected:${affectedCommand} --base=origin/master --parallel --silent --ci`,
    'upstream-master': `nx affected:${affectedCommand} --base=upstream/master --parallel --silent --ci`
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
  readme: {
    from: 'README.md',
    to: join(APPLICATION_BUNDLE_PATH, 'README.md')
  }
};

module.exports = {
  scripts: {
    dev: {
      'gen-graphql': nps.series(
        'gql-gen --config ./tools/scripts/codegen-server.yml',
        'gql-gen --config ./tools/scripts/codegen-client.js'
      ),
      server: {
        default: nps.series(
          'ng build electron --noSourceMap',
          'nps dev.server.start'
        ),
        start: `electron ${ELECTRON_BUNDLE_PATH} --server --port 4201 --inspect=9229`
      },
      up: {
        default: nps.concurrent({
          server: 'nps dev.server',
          frontend: 'ng serve angular-console --configuration=dev'
        }),
        start: nps.concurrent({
          server: 'nps dev.server.start',
          frontend: 'ng serve angular-console --configuration=dev'
        }),
        cypress: nps.concurrent({
          server: 'nps dev.server.start',
          frontend: 'ng run angular-console:serve:cypress'
        })
      }
    },
    clean: 'shx rm -rf dist/',
    prepare: {
      and: {
        e2e: {
          up: nps.series.nps('prepare.e2e', 'e2e.up'),
          headless: nps.series.nps('prepare.e2e', 'e2e.headless')
        },
        package: {
          ...forEachApplication(
            nps.series.nps(
              'clean',
              'prepare.APPLICATION',
              'install-dependencies.APPLICATION',
              'package.APPLICATION'
            )
          )
        }
      },
      ...forEachApplication(
        nps.concurrent({
          server: 'ng build APPLICATION --prod --noSourceMap',
          client: 'ng build angular-console --configuration=APPLICATION'
        })
      ),
      ci: {
        ...forEachApplication(
          nps.concurrent({
            server: 'ng build APPLICATION --noSourceMap',
            client:
              'ng build angular-console --configuration=APPLICATION --noSourceMap --optimization=false --noCommonChunk --aot=false --buildOptimizer=false'
          })
        )
      },
      dev: {
        ...forEachApplication(
          nps.concurrent({
            server: 'ng build APPLICATION --watch',
            client:
              'ng build angular-console --configuration=APPLICATION --watch --aot=false --buildOptimizer=false'
          })
        )
      }
    },
    package: {
      electronMac: nps.series(
        'echo "${CSC_LINK:?Need to set CSC_LINK non-empty}" > /dev/null',
        electronBuilder('--mac', 'never'),
        electronBuilder('--linux', 'never')
      ),
      electronWin: nps.series(electronBuilder('--win', 'never')),
      vscode: nps.series(
        `shx rm -rf ${join('dist', 'apps', 'vscode', '**', '*-es5.js')}`,
        `shx rm -rf ${join(
          'dist',
          'apps',
          'vscode',
          'assets',
          'public',
          'assets',
          'external-programs'
        )}`,

        `shx rm -rf ${join('dist', 'apps', 'vscode', '**', '*.ts')}`,

        `node ${join('tools', 'scripts', 'vscode-vsce.js')}`
      ),
      intellij: `node ${join('tools', 'scripts', 'intellij-package.js')}`
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
      headless: nps.series.nps(
        'prepare.e2e',
        'e2e.ci1.fixtures',
        'e2e.ci1',
        'e2e.ci2.fixtures',
        'e2e.ci2'
      ),
      ci1: {
        default: 'node ./tools/scripts/e2e.js electron-e2e-ci1 --headless',
        fixtures: 'node ./tools/scripts/electron-e2e-ci1-fixtures.js',
        up: 'node ./tools/scripts/e2e.js electron-e2e-ci1 --headless --watch'
      },
      ci2: {
        default: 'node ./tools/scripts/e2e.js electron-e2e-ci2 --headless',
        fixtures: 'node ./tools/scripts/electron-e2e-ci2-fixtures.js',
        up: 'node ./tools/scripts/e2e.js electron-e2e-ci2 --headless --watch'
      }
    },
    format: {
      default: 'nx format:write',
      and: {
        lint: {
          check: nps.concurrent.nps('format.check', 'lint')
        }
      },
      write: 'nx format:write --base=origin/master',
      check: 'nx format:check --base=origin/master'
    },
    lint: {
      default: nps.concurrent({
        nxLint: 'nx lint',
        tsLint: 'npx tslint -p tsconfig.json -e **/generated/* -c tslint.json',
        stylelint: 'stylelint "{apps,libs}/**/*.scss" --config .stylelintrc'
      }),
      fix: nps.concurrent({
        tslint:
          'npx tslint -p tsconfig.json -e **/generated/* -c tslint.json --fix',
        stylelint:
          'stylelint "{apps,libs}/**/*.scss" --config .stylelintrc --fix'
      })
    },
    test: {
      default: 'nx affected:test --all --parallel',
      affected: affected('test')
    },
    'install-dependencies': {
      vscode: `node ${join('tools', 'scripts', 'vscode-yarn.js')}`,
      electron: `node ${join('tools', 'scripts', 'electron-yarn.js')}`,
      intellij: `node ${join('tools', 'scripts', 'intellij-yarn.js')}`
    }
  }
};
