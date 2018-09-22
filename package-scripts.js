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
  return `electron-builder --mac --win --linux -p ${dashP} --config.win.certificateSubjectName="Narwhal Technologies Inc."`
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
      compile: npsUtils.series.nps('server.gen-graphql-types', 'server.compile-only'),
      'compile-only': 'tsc -p server/tsconfig.json',
      format: {
        default: npsUtils.series.nps('server.format.write'),
        write: 'prettier --write \"./server/**/*.ts\"',
        check: 'prettier --list-different \"./server/**/*.ts\"'
      },
      test: 'jest --maxWorkers=1 ./dist/server/test',
      'gen-graphql-types': 'ts-node server/gen-graphql-types.ts'
    },
    mac: {
      'clean': 'rm -rf dist',
      'compile': 'tsc -p server/tsconfig.json',
      'copy-assets': 'cp server/package.json dist/server/package.json && cp -r server/assets dist/server',
      'install-node-modules': 'cd dist/server && yarn',
      'copy-frontend': 'cp -r dist/apps/angular-console dist/server/src/public',
      'pack': 'electron-builder --mac --dir -p never',
      'copy-to-osbuilds': 'cp -r dist/packages osbuilds/mac',
      'start-server': 'electron dist/server --server',
      'start-electron': 'NODE_ENV=development electron dist/server',
      'builder-dist': 'electron-builder --mac -p never',
    },
    linux: {
      'clean': 'rm -rf dist',
      'compile': 'tsc -p server/tsconfig.json',
      'copy-assets': 'cp server/package.json dist/server/package.json && cp -r server/assets dist/server',
      'install-node-modules': 'cd dist/server && yarn',
      'copy-frontend': 'cp -r dist/apps/angular-console dist/server/src/public',
      'pack': 'electron-builder --linux --dir -p never',
      'copy-to-osbuilds': 'cp -r dist/packages osbuilds/linux',
      'start-server': 'electron dist/server --server',
      'start-electron': 'NODE_ENV=development electron dist/server',
      'builder-dist': 'electron-builder --linux -p never'
    },
    win: {
      'clean': 'if exist dist rmdir dist /s /q',
      'compile': 'tsc -p server/tsconfig.json',
      'copy-assets': 'copy server\\package.json dist\\server\\package.json && (robocopy server\\assets dist\\server\\assets /e || echo 0)',
      'install-node-modules': 'cd dist\\electron && yarn',
      'copy-frontend': 'robocopy dist\\apps\\angular-console dist\\server\\src\\public /e || echo 0',
      'pack': 'electron-builder --win --dir -p never',
      'copy-to-osbuilds': 'robocopy dist\\packages osbuilds\\win /e || echo 0',
      'start-server': 'electron dist\\server --server',
      'start-electron': 'electron dist\\server',
      'builder-dist': 'electron-builder --win -p never'
    },
    dev: {
      'compile-server': npsUtils.series.nps(withPlatform('compile'), withPlatform('copy-assets')),
      'prepare': npsUtils.series.nps(withPlatform('clean'), 'dev.compile-server', 'frontend.build', withPlatform('copy-frontend'), withPlatform('pack')),
      'server': npsUtils.series.nps('dev.compile-server', withPlatform('start-server')),
      'up': npsUtils.concurrent.nps('dev.server', 'frontend.serve'),
      'dist': npsUtils.series.nps('dev.prepare', withPlatform('builder-dist'), withPlatform('copy-to-osbuilds'))
    },
    publish: {
      'builder-prerelease': electronBuilder('never'),
      'builder-publish': electronBuilder('always'),
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
