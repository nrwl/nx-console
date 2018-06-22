const npsUtils = require('nps-utils');

module.exports = {
  scripts: {
    install: {
      frontend: 'yarn',
      server: 'cd server && yarn',
      electron: 'cd electron && yarn',
      all: npsUtils.concurrent.nps('install.frontend', 'install.server', 'install.electron')
    },
    frontend: {
      ng: 'ng',
      build: 'ng build nxui --prod',
      serve: 'ng serve nxui'
    },
    server: {
      'compile': 'tsc -p server/tsconfig.json',
      'start': 'node dist/server',
      'up': npsUtils.series.nps('server.compile', 'server.start')
    },
    electron: {
      'clean': 'rm -rf dist',
      'compile': 'tsc -p electron/tsconfig.json',
      'copy-assets': 'cp electron/package.json dist/electron/package.json && cp -r electron/assets dist/electron',
      'copy-server': 'cp -r dist/server dist/electron/server && cp -r server/node_modules dist/electron',
      'copy-frontend': 'cp -r dist/apps/nxui dist/electron/server/public',
      'start': 'electron dist/electron',
      'restart': npsUtils.series.nps('electron.compile', 'electron.copy-assets', 'electron.start'),
      'prepackage': npsUtils.series.nps('electron.clean', 'electron.compile', 'electron.copy-assets', 'frontend.build', 'server.compile', 'electron.copy-server', 'electron.copy-frontend'),
      'up': npsUtils.series.nps('electron.prepackage', 'electron.start'),

      "inner-package-mac": "electron-packager dist/electron --overwrite --platform=darwin --arch=x64 --icon=dist/electron/assets/icons/mac/icon.icns --prune=true --out=dist/release-builds",
      "inner-installer-mac": "electron-installer-dmg dist/release-builds/angular-console-darwin-x64/angular-console.app AngularConsole --out=dist --overwrite --icon=dist/electron/assets/icons/mac/icon.icns",

      "inner-package-win": "electron-packager dist/electron angular-console --overwrite --asar=true --platform=win32 --arch=ia32 --icon=dist/electron/assets/icons/win/icon.ico --prune=true --out=release-builds --version-string.CompanyName=CE --version-string.FileDescription=CE --version-string.ProductName='Angular Console'",
      "inner-package-linux": "electron-packager dist/electron angular-console --overwrite --asar=true --platform=linux --arch=x64 --icon=dist/electron/assets/icons/png/icon.png --prune=true --out=release-builds",

      "package-mac": npsUtils.series.nps('electron.prepackage', 'electron.inner-package-mac', "electron.inner-installer-mac")
    },
    dev: {
      up: npsUtils.concurrent.nps('server.up', 'frontend.serve')
    }
  }
};
