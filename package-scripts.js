const npsUtils = require('nps-utils');

module.exports = {
  scripts: {
    frontend: {
      ng: 'ng',
      build: 'ng build nxui --prod',
      serve: 'ng serve nxui',
      format: {
        default: 'nx format:write',
        write: 'nx format:write',
        check: 'nx format:check'
      },
      lint: npsUtils.series('nx lint', 'ng lint')
    },
    server: {
      compile: 'tsc -p server/tsconfig.json',
      start: 'node dist/server',
      up: npsUtils.series.nps('server.compile', 'server.start'),
      lint: 'yarn workspace server lint',
      format: {
        default: npsUtils.series.nps('server.format.write'),
        write: 'yarn workspace server format:write',
        check: 'yarn workspace server format:check'
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
      'up': npsUtils.series.nps('electron.prepackage', 'electron.start'),

      'inner-package-mac': 'electron-packager dist/electron --overwrite --platform=darwin --arch=x64 --icon=dist/electron/assets/icons/mac/icon.icns --prune=true --out=dist/release-builds',
      'inner-installer-mac': 'electron-installer-dmg dist/release-builds/AngularConsole-darwin-x64/AngularConsole.app AngularConsole --out=dist --overwrite --icon=dist/electron/assets/icons/mac/icon.icns',

      'inner-package-win': 'electron-packager dist/electron AngularConsole --overwrite --asar=true --platform=win32 --arch=ia32 --icon=dist/electron/assets/icons/win/icon.ico --prune=true --out=--out=dist/release-builds --version-string.CompanyName=CE --version-string.FileDescription=CE --version-string.ProductName=\'Angular Console\'',
      'inner-package-linux': 'electron-packager dist/electron AngularConsole --overwrite --asar=true --platform=linux --arch=x64 --icon=dist/electron/assets/icons/png/icon.png --prune=true --out=--out=dist/release-builds',

      'package-mac': npsUtils.series.nps('electron.prepackage', 'electron.inner-package-mac', 'electron.inner-installer-mac'),
      'package-linux': npsUtils.series.nps('electron.prepackage', 'electron.inner-package-linux')
    },
    dev: {
      up: npsUtils.concurrent.nps('server.up', 'frontend.serve')
    },
    e2e: {
      'compile': 'tsc -p apps/nxui-e2e/tsconfig.json',
      'compile-watch': 'tsc -p apps/nxui-e2e/tsconfig.json --watch',
      'fixtures': 'node ./tools/scripts/set-up-e2e-fixtures.js',
      'cypress': `cypress run --project apps/nxui-e2e --env projectsRoot=${__dirname + '/tmp'}`,
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
      default: npsUtils.concurrent.nps('frontend.lint', 'server.lint')
    }
  }
};
