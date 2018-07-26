const npsUtils = require('nps-utils');

module.exports = {
  scripts: {
    frontend: {
      ng: 'ng',
      build: 'ng build nxui --prod',
      serve: {
        default: 'ng serve nxui',
        prod: 'ng serve nxui --prod'
      },
      format: {
        default: 'nx format:write',
        write: 'nx format:write',
        check: 'nx format:check'
      },
      lint: {
        default: npsUtils.series('nx lint', 'ng lint'),
        fix: npsUtils.series(
          'ng lint --fix --project nxui',
          'ng lint --fix --project feature-workspaces',
          'ng lint --fix --project feature-extensions',
          'ng lint --fix --project feature-generate',
          'ng lint --fix --project utils',
          'ng lint --fix --project feature-run',
          'ng lint --fix --project ui'
        )
      }
    },
    server: {
      compile: 'tsc -p server/tsconfig.json',
      start: 'node dist/server',
      up: npsUtils.series.nps('server.compile', 'server.start'),
      format: {
        default: npsUtils.series.nps('server.format.write'),
        write: 'prettier --write \'./server/**/*.ts\'',
        check: 'prettier --list-different \'./server/**/*.ts\''
      }
    },
    electron: {
      'clean': 'rm -rf dist',
      'compile': 'tsc -p electron/tsconfig.json',
      'copy-assets': 'cp electron/package.json dist/electron/package.json && cp -r electron/assets dist/electron',
      'copy-server': 'cp -r dist/server dist/electron/server',
      'install-node-modules': 'cd dist/electron && yarn',
      'copy-frontend': 'cp -r dist/apps/nxui dist/electron/server/public',
      'start': 'electron dist/electron',
      'restart': npsUtils.series.nps('electron.compile', 'electron.copy-assets', 'electron.start'),
      'prepackage': npsUtils.series.nps('electron.clean', 'electron.compile', 'electron.copy-assets', 'frontend.build', 'server.compile', 'electron.copy-server', 'electron.copy-frontend', 'electron.install-node-modules'),
      'up': npsUtils.series.nps('electron.prepackage', 'electron.start')
    },
    dev: {
      up: npsUtils.concurrent.nps('server.up', 'frontend.serve')
    },
    demo: {
      up: npsUtils.concurrent.nps('server.up', 'frontend.serve.prod')
    },
    e2e: {
      'compile': 'tsc -p apps/nxui-e2e/tsconfig.json',
      'compile-watch': 'tsc -p apps/nxui-e2e/tsconfig.json --watch',
      'fixtures': 'node ./tools/scripts/set-up-e2e-fixtures.js',
      'cypress': `cypress run --project apps/nxui-e2e --env projectsRoot=${__dirname + '/tmp'} --record --key bab6b9ec-ce6d-48af-a8be-9e606f48f70e`,
      'open-cypress': `cypress open --project apps/nxui-e2e --env projectsRoot=${__dirname + '/tmp'}`,
      'run': 'node ./tools/scripts/run-e2e.js',
      'up': npsUtils.concurrent.nps('dev.up', 'e2e.compile-watch', 'e2e.open-cypress')
    },
    format: {
      default: npsUtils.series.nps('format.write'),
      check: npsUtils.concurrent.nps('frontend.format.check', 'server.format.check'),
      write: npsUtils.concurrent.nps('frontend.format.write', 'server.format.write')
    },
    lint: {
      default: npsUtils.concurrent.nps('frontend.lint'),
      fix: npsUtils.concurrent.nps('frontend.lint.fix')
    }
  }
};
