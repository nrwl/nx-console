const npsUtils = require('nps-utils');

module.exports = {
  scripts: {
    frontend: {
      ng: 'ng',
      build: 'ng build angular-console --prod',
      serve: {
        default: 'ng serve angular-console',
        prod: 'ng serve angular-console --prod'
      },
      format: {
        default: 'nx format:write',
        write: 'nx format:write',
        check: 'nx format:check'
      },
      lint: {
        default: npsUtils.series('nx lint', 'ng lint'),
        fix: npsUtils.series(
          'ng lint --fix --project angular-console',
          'ng lint --fix --project feature-workspaces',
          'ng lint --fix --project feature-extensions',
          'ng lint --fix --project feature-generate',
          'ng lint --fix --project utils',
          'ng lint --fix --project feature-run',
          'ng lint --fix --project ui'
        )
      },
      test: 'nx affected:test --all'
    },
    server: {
      compile: 'tsc -p server/tsconfig.json',
      start: 'node dist/server/src/index.js 8888',
      up: npsUtils.series.nps('server.compile', 'server.start'),
      format: {
        default: npsUtils.series.nps('server.format.write'),
        write: 'prettier --write \"./server/**/*.ts\"',
        check: 'prettier --list-different \"./server/**/*.ts\"'
      },
      test: 'echo 0'
    },
    electron: {
      'clean': 'rm -rf dist',
      'compile': 'tsc -p electron/tsconfig.json',
      'copy-assets': 'cp electron/package.json dist/electron/package.json && cp -r electron/assets dist/electron',
      'copy-server': 'cp -r dist/server/src dist/electron/server',
      'install-node-modules': 'cd dist/electron && yarn',
      'copy-frontend': 'cp -r dist/apps/angular-console dist/electron/server/public',
      'start': 'NODE_ENV=development electron dist/electron',
      'restart': npsUtils.series.nps('electron.compile', 'electron.copy-assets', 'electron.start'),
      'prepackage': npsUtils.series.nps('electron.clean', 'electron.compile', 'electron.copy-assets', 'frontend.build', 'server.compile', 'electron.copy-server', 'electron.copy-frontend', 'electron.install-node-modules'),
      'up': npsUtils.series.nps('electron.prepackage', 'electron.start'),

      'builder-dist': 'electron-builder --mac -p never',
      'copy-to-osbuilds': 'cp -r dist/packages osbuilds/mac',
      'dist': npsUtils.series.nps('electron.prepackage', 'electron.builder-dist', 'electron.copy-to-osbuilds')
    },
    electronwin: {
      'clean': 'rmdir dist /s /q',
      'compile': 'tsc -p electron/tsconfig.json',
      'copy-assets': 'copy electron\\package.json dist\\electron\\package.json && (robocopy electron\\assets dist\\electron\\assets /e || echo 0)',
      'copy-server': 'robocopy dist\\server\\src dist\\electron\\server /e || echo 0',
      'install-node-modules': 'cd dist\\electron && yarn',
      'copy-frontend': 'robocopy dist\\apps\\angular-console dist\\electron\\server\\public /e || echo 0',
      'start': 'electron dist/electron',
      'prepackage': npsUtils.series.nps('electronwin.clean', 'electronwin.compile', 'electronwin.copy-assets', 'frontend.build', 'server.compile', 'electronwin.copy-server', 'electronwin.copy-frontend', 'electronwin.install-node-modules'),
      'up': npsUtils.series.nps('electronwin.prepackage', 'electronwin.start'),

      'builder-dist': 'electron-builder --win -p never',
      'copy-to-osbuilds': 'robocopy dist\\packages osbuilds\\win /e || echo 0',
      'dist': npsUtils.series.nps('electronwin.prepackage', 'electronwin.builder-dist', 'electronwin.copy-to-osbuilds')
    },
    publish: {
      'builder-publish': 'electron-builder --mac --win -p always',
      'publish': npsUtils.series.nps('electron.prepackage', 'publish.builder-publish')
    },
    dev: {
      up: npsUtils.concurrent.nps('server.up', 'frontend.serve'),
      'path-node-pty': 'rm -rf node_modules/node-pty-prebuilt && cp -r tools/win/node-pty-prebuilt node_modules/node-pty-prebuilt'
    },
    demo: {
      up: npsUtils.concurrent.nps('server.up', 'frontend.serve.prod')
    },
    e2e: {
      'compile': 'tsc -p apps/angular-console-e2e/tsconfig.json',
      'compile-watch': 'tsc -p apps/angular-console-e2e/tsconfig.json --watch',
      'fixtures': 'node ./tools/scripts/set-up-e2e-fixtures.js',
      'cypress': `cypress run --project ./apps/angular-console-e2e --env projectsRoot=${__dirname + '/tmp'} --record --key bab6b9ec-ce6d-48af-a8be-9e606f48f70e`,
      'open-cypress': `cypress open --project ./apps/angular-console-e2e --env projectsRoot=${__dirname + '/tmp'}`,
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
    },
    test: npsUtils.concurrent.nps('frontend.test', 'server.test')
  }
};
