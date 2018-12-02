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

function electronBuilder(platform, dashP) {
  return `electron-builder ${platform} -p ${dashP} --config.win.certificateSubjectName="Narwhal Technologies Inc."`
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
        default: 'prettier **/*.ts **/*.css **/*.scss **/*.html --write',
        write: 'prettier **/*.ts **/*.css **/*.scss **/*.html --write',
        check: 'prettier --list-different **/*.ts **/*.css **/*.scss **/*.html --write'
      },
      lint: npsUtils.series('nx lint', 'nx affected:lint --base=master --parallel'),
      test: 'nx affected:test --base=master'
    },
    server: {
      compile: npsUtils.series.nps('server.gen-graphql-types', 'server.gen-apollo-angular', 'server.compile-only', withPlatform('move-graphql')),
      'compile-only': 'tsc -p server/tsconfig.json',
      format: {
        default: npsUtils.series.nps('server.format.write'),
        write: 'prettier --write \"./server/**/*.ts\"',
        check: 'prettier --list-different \"./server/**/*.ts\"'
      },
      test: 'node ./tools/scripts/test ./server/test',
      'gen-graphql-types': 'gql-gen --config codegen-server.yml',
      'gen-apollo-angular': 'gql-gen --config codegen-client.js'
    },
    mac: {
      'clean': 'rm -rf dist',
      'copy-assets': 'cp server/package.json dist/server/package.json && cp -r server/assets dist/server',
      'install-node-modules': 'cd dist/server && yarn',
      'copy-frontend': 'cp -r dist/apps/angular-console dist/server/src/public',
      'pack': 'electron-builder --mac --dir -p never',
      'copy-to-osbuilds': 'cp -r dist/packages osbuilds/mac',
      'start-server': 'electron dist/server --server --inspect=9229',
      'start-electron': 'NODE_ENV=development electron dist/server',
      'builder-dist': 'electron-builder --mac -p never',
      'move-graphql': 'cp server/src/schema/schema.graphql dist/server/src/schema/schema.graphql'
    },
    linux: {
      'clean': 'rm -rf dist',
      'copy-assets': 'cp server/package.json dist/server/package.json && cp -r server/assets dist/server',
      'install-node-modules': 'cd dist/server && yarn',
      'copy-frontend': 'cp -r dist/apps/angular-console dist/server/src/public',
      'pack': 'electron-builder --linux --dir -p never',
      'copy-to-osbuilds': 'cp -r dist/packages osbuilds/linux',
      'start-server': 'electron dist/server --server --inspect=9229',
      'start-electron': 'NODE_ENV=development electron dist/server',
      'builder-dist': 'electron-builder --linux -p never',
      'move-graphql': 'cp server/src/schema/schema.graphql dist/server/src/schema/schema.graphql'
    },
    win: {
      'clean': 'if exist dist rmdir dist /s /q',
      'copy-assets': 'copy server\\package.json dist\\server\\package.json && (robocopy server\\assets dist\\server\\assets /e || echo 0)',
      'install-node-modules': 'cd dist\\server && yarn',
      'copy-frontend': 'robocopy dist\\apps\\angular-console dist\\server\\src\\public /e || echo 0',
      'pack': 'electron-builder --win --dir -p never',
      'copy-to-osbuilds': 'robocopy dist\\packages osbuilds\\win /e || echo 0',
      'start-server': 'electron dist\\server --server --inspect=9229',
      'start-electron': 'electron dist\\server',
      'builder-dist': 'electron-builder --win -p never',
      'move-graphql': 'copy server\\src\\schema\\schema.graphql dist\\server\\src\\schema\\schema.graphql'
    },
    dev: {
      'patch-cli': 'node ./tools/scripts/patch-cli.js',
      'compile-server': npsUtils.series.nps('server.compile', withPlatform('copy-assets')),
      'prepare': npsUtils.series.nps(withPlatform('clean'), 'dev.compile-server', 'frontend.build', withPlatform('copy-frontend'), withPlatform('pack'), 'dev.patch-cli'),
      'server': npsUtils.series.nps('dev.compile-server', withPlatform('start-server')),
      'up': npsUtils.concurrent.nps('dev.server', 'frontend.serve'),
      'dist': npsUtils.series.nps('dev.prepare', withPlatform('builder-dist'), withPlatform('copy-to-osbuilds'))
    },
    publish: {
      'win-builder-prerelease': electronBuilder('--win', 'never'),
      'win-builder-publish': electronBuilder('--win', 'always'),
      'mac-builder-prerelease': electronBuilder('--mac --linux', 'never'),
      'mac-builder-publish': electronBuilder('--mac --linux', 'always'),
      'linux-builder-prerelease': electronBuilder('--linux --linux', 'never'),
      'linux-builder-publish': electronBuilder('--linux --linux', 'always'),
      'win-prerelease': npsUtils.series.nps('dev.prepare', 'publish.win-builder-prerelease'),
      'win-publish': npsUtils.series.nps('dev.prepare', 'publish.win-builder-publish'),
      'mac-prerelease': npsUtils.series.nps('dev.prepare', 'publish.mac-builder-prerelease'),
      'mac-publish': npsUtils.series.nps('dev.prepare', 'publish.mac-builder-publish'),
      'linux-prerelease': npsUtils.series.nps('dev.prepare', 'publish.linux-builder-prerelease'),
      'linux-publish': npsUtils.series.nps('dev.prepare', 'publish.linux-builder-publish')
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
