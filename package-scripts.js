const nps = require('nps-utils');
const { join } = require('path');

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
          vscode: nps.series.nps(
            'clean',
            'prepare.vscode',
            'install-dependencies.vscode',
            'package.vscode'
          )
        }
      },
      vscode: nps.concurrent({
        server: 'ng build vscode --prod --noSourceMap',
        client: 'ng build vscode-ui --prod'
      }),
      ci: {
        vscode: nps.concurrent({
          server: 'ng build vscode --noSourceMap',
          client:
            'ng build angular-console --configuration=vscode --noSourceMap --optimization=false --noCommonChunk --aot=false --buildOptimizer=false'
        })
      },
      dev: {
        vscode: nps.concurrent({
          server: 'ng build vscode --watch',
          // NOTE: To inline JS we must run terser over the bundle to strip comments
          // Some comments have html tags in them which would otherwise need special escaping
          client:
            'ng build vscode-ui --watch --aot=false --buildOptimizer=false --prod'
        })
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
      default: 'nx format:write --base=upstream/master',
      and: {
        lint: {
          check: nps.concurrent.nps('format.check', 'lint')
        }
      },
      write: 'nx format:write --base=upstream/master',
      check: 'nx format:check --base=upstream/master'
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
