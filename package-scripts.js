const nps = require('nps-utils');

function affected(affectedCommand) {
  return {
    'origin-master': `nx affected:${affectedCommand} --base=origin/master --parallel --silent --ci`,
    'upstream-master': `nx affected:${affectedCommand} --base=upstream/master --parallel --silent --ci`,
  };
}

module.exports = {
  scripts: {
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
        server: 'nx build vscode-app --prod',
        client: 'nx build vscode-ui --prod',
      },
      ci: {
        vscode: nps.concurrent({
          server: 'nx build vscode-app --noSourceMap',
          client:
            'nx build nx-console --configuration=vscode --noSourceMap --optimization=false --noCommonChunk --aot=false --buildOptimizer=false',
        }),
      },
      dev: {
        vscode: nps.concurrent({
          server: 'nx build vscode-app --watch',
          client: 'nx build vscode-ui --watch',
        }),
      },
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
    storybook: {
      default: 'nx run vscode-ui-feature-task-execution-form:storybook',
    },
    ['storybook-e2e']: {
      default: 'nx run vscode-ui-feature-task-execution-form-e2e:e2e',
    },
    test: {
      default: 'nx affected:test --all --parallel',
      affected: affected('test'),
    },
    lint: {
      default: 'nx run-many --all --parallel --target=lint',
    },
  },
};
