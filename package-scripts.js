const nps = require('nps-utils');
const { join } = require('path');

function affected(affectedCommand) {
  return {
    'origin-master': `nx affected:${affectedCommand} --base=origin/master --parallel --silent --ci`,
    'upstream-master': `nx affected:${affectedCommand} --base=upstream/master --parallel --silent --ci`,
  };
}

module.exports = {
  scripts: {
    clean: 'shx rm -rf dist/',
    prepare: {
      and: {
        e2e: {
          up: nps.series.nps('prepare.e2e', 'e2e.up'),
          headless: nps.series.nps('prepare.e2e', 'e2e.headless'),
        },
        package: {
          vscode: nps.series.nps(
            'clean',
            'prepare.vscode.build',
            'install-dependencies.vscode',
            'package.vscode'
          ),
        },
      },
      vscode: {
        build: nps.series.nps('prepare.vscode.server', 'prepare.vscode.client'),
        server: 'ng build vscode-app --prod --noSourceMap',
        client: 'ng build vscode-ui --prod',
      },
      ci: {
        vscode: nps.concurrent({
          server: 'ng build vscode-app --noSourceMap',
          client:
            'ng build nx-console --configuration=vscode --noSourceMap --optimization=false --noCommonChunk --aot=false --buildOptimizer=false',
        }),
      },
      dev: {
        vscode: nps.concurrent({
          server: 'ng build vscode-app --watch',
          // NOTE: To inline JS we must run terser over the bundle to strip comments
          // Some comments have html tags in them which would otherwise need special escaping
          client: 'ng build vscode-ui --watch --prod',
        }),
      },
    },
    package: {
      vscode: nps.series(
        `shx rm -rf ${join('dist', 'apps', 'vscode', '**', '*-es5.js')}`,
        `node ${join('tools', 'scripts', 'vscode-vsce.js')}`
      ),
    },
    format: {
      default: 'nx format:write --base=upstream/master',
      and: {
        lint: {
          check: nps.concurrent.nps('format.check', 'lint'),
        },
      },
      write: 'nx format:write --base=upstream/master',
      check: 'nx format:check --base=upstream/master',
    },
    lint: {
      default: nps.concurrent({
        nxLint: 'nx lint',
        tsLint: 'ng lint',
        stylelint: 'stylelint "{apps,libs}/**/*.scss" --config .stylelintrc',
      }),
      fix: nps.concurrent({
        tslint: 'ng lint --fix',
        stylelint:
          'stylelint "{apps,libs}/**/*.scss" --config .stylelintrc --fix',
      }),
    },
    storybook: {
      default: 'ng run vscode-ui-feature-task-execution-form:storybook',
    },
    ['storybook-e2e']: {
      default: 'ng run vscode-ui-feature-task-execution-form-e2e:e2e',
    },
    test: {
      default: 'nx affected:test --all --parallel',
      affected: affected('test'),
    },
    'install-dependencies': {
      vscode: `node ${join('tools', 'scripts', 'vscode-yarn.js')}`,
    },
  },
};
