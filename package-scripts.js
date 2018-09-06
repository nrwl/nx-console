const npsUtils = require('nps-utils');
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

function electronBuilder(dashP) {
  return `electron-builder --mac --win -p ${dashP} --config.win.certificateSubjectName="Narwhal Technologies Inc."`
}

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
      test: 'nx affected:test --base=master'
    },
    server: {
      compile: 'tsc -p server/tsconfig.json',
      format: {
        default: npsUtils.series.nps('server.format.write'),
        write: 'prettier --write \"./server/**/*.ts\"',
        check: 'prettier --list-different \"./server/**/*.ts\"'
      },
      test: 'jest --maxWorkers=1 ./dist/server/test'
    },
    mac: {
      'clean': 'rm -rf dist',
      'compile': 'tsc -p electron/tsconfig.json',
      'copy-assets': 'cp electron/package.json dist/electron/package.json && cp -r electron/assets dist/electron',
      'copy-server': 'cp -r dist/server/src dist/electron/server',
      'install-node-modules': 'cd dist/electron && yarn',
      'copy-frontend': 'cp -r dist/apps/angular-console dist/electron/server/public',
      'pack': 'electron-builder --mac --dir -p never',
      'copy-to-osbuilds': 'cp -r dist/packages osbuilds/mac',
      'start-server': 'electron dist/electron --server',
      'start-electron': 'NODE_ENV=development electron dist/electron',
      'builder-dist': 'electron-builder --mac -p never',
    },
    linux: {
      'clean': 'rm -rf dist',
      'compile': 'tsc -p electron/tsconfig.json',
      'copy-assets': 'cp electron/package.json dist/electron/package.json && cp -r electron/assets dist/electron',
      'copy-server': 'cp -r dist/server/src dist/electron/server',
      'install-node-modules': 'cd dist/electron && yarn',
      'copy-frontend': 'cp -r dist/apps/angular-console dist/electron/server/public',
      'pack': 'electron-builder --linux --dir -p never',
      'copy-to-osbuilds': 'cp -r dist/packages osbuilds/linux',
      'start-server': 'electron dist/electron --server',
      'start-electron': 'NODE_ENV=development electron dist/electron',
      'builder-dist': 'electron-builder --linux -p never'
    },
    win: {
      'clean': 'if exist dist rmdir dist /s /q',
      'compile': 'tsc -p electron/tsconfig.json',
      'copy-assets': 'copy electron\\package.json dist\\electron\\package.json && (robocopy electron\\assets dist\\electron\\assets /e || echo 0)',
      'copy-server': 'robocopy dist\\server\\src dist\\electron\\server /e || echo 0',
      'install-node-modules': 'cd dist\\electron && yarn',
      'copy-frontend': 'robocopy dist\\apps\\angular-console dist\\electron\\server\\public /e || echo 0',
      'pack': 'electron-builder --win --dir -p never',
      'copy-to-osbuilds': 'robocopy dist\\packages osbuilds\\win /e || echo 0',
      'start-server': 'electron dist\\electron --server',
      'start-electron': 'electron dist\\electron',
      'builder-dist': 'electron-builder --win -p never'
    },
    dev: {
      'compile-server-and-electron': npsUtils.series.nps(withPlatform('compile'), withPlatform('copy-assets'), 'server.compile', withPlatform('copy-server')),
      'prepare': npsUtils.series.nps(withPlatform('clean'), 'dev.compile-server-and-electron', 'frontend.build', withPlatform('copy-frontend'), withPlatform('pack')),
      'server': npsUtils.series.nps('dev.compile-server-and-electron', withPlatform('start-server')),
      'up': npsUtils.concurrent.nps('dev.server', 'frontend.serve'),
      'dist': npsUtils.series.nps('dev.prepare', withPlatform('builder-dist'), withPlatform('copy-to-osbuilds'))
    },
    publish: {
      'builder-prerelease': npsUtils.series('./build_linux.sh never', electronBuilder('never')),
      'builder-publish': npsUtils.series('./build_linux.sh always', electronBuilder('always')),
      'push': 'electron-builder -p always',
      'prerelease': npsUtils.series.nps('dev.prepare', 'publish.builder-prerelease'),
      'publish': npsUtils.series.nps('dev.prepare', 'publish.builder-publish')
    },
    e2e: {
      'compile': 'tsc -p apps/angular-console-e2e/tsconfig.json',
      'compile-watch': 'tsc -p apps/angular-console-e2e/tsconfig.json --watch',
      'fixtures': 'node ./tools/scripts/set-up-e2e-fixtures.js',
      'cypress': `cypress run --project ./apps/angular-console-e2e --env projectsRoot=${__dirname + '/tmp'} --record`,
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
