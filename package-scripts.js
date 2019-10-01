const nps = require('nps-utils');
const os = require('os');
const { join } = require('path');

function forEachApplication(command) {
  return {
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

module.exports = {
  scripts: {
    'gen-graphql': nps.series(
      'gql-gen --config ./tools/scripts/codegen-server.yml',
      'gql-gen --config ./tools/scripts/codegen-client.js'
    ),
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
          client: 'ng build APPLICATION-ui --prod',
          legacyClient: 'ng build angular-console --configuration=APPLICATION'
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
            // NOTE: To inline JS we must run terser over the bundle to strip comments
            // Some comments have html tags in them which would otherwise need special escaping
            client:
              'ng build APPLICATION-ui --watch --aot=false --buildOptimizer=false --prod',
            legacyClient:
              'ng build angular-console --configuration=APPLICATION --aot=false --buildOptimizer=false'
          })
        )
      }
    },
    package: {
      vscode: nps.series(
        `shx rm -rf ${join('dist', 'apps', 'vscode', '**', '*-es5.js')}`,
        `shx rm -rf ${join('dist', 'apps', 'vscode', '**', '*.ts')}`,
        `node ${join('tools', 'scripts', 'vscode-vsce.js')}`
      ),
      intellij: `node ${join('tools', 'scripts', 'intellij-package.js')}`
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
      intellij: `node ${join('tools', 'scripts', 'intellij-yarn.js')}`
    }
  }
};
