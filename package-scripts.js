const nps = require('nps-utils');
const { platform } = require('os');
const { join } = require('path');

const APPS_PATH = join('dist', 'apps');
const ELECTRON_BUNDLE_PATH = join(APPS_PATH, 'electron');

module.exports = {
  scripts: pipe(
    always({
      'gen-graphql': nps.series(
        'gql-gen --config ./tools/scripts/codegen-server.yml',
        'gql-gen --config ./tools/scripts/codegen-client.js'
      ),
      clean: 'shx rm -rf dist/',
      e2e: {
        prepare: {
          default: nps.concurrent.nps('electron.prepare', 'e2e.fixtures'),
          and: {
            up: nps.series.nps('e2e.prepare', 'e2e.up'),
            headless: nps.series.nps('e2e.prepare', 'e2e.headless'),
            'check-formatting': nps.concurrent.nps(
              'e2e.prepare',
              'format.and.lint.check'
            )
          }
        },
        fixtures: 'node ./tools/scripts/set-up-e2e-fixtures.js',
        up: 'node ./tools/scripts/e2e.js --watch',
        headless: {
          default: 'node ./tools/scripts/e2e.js --headless',
          'new-fixtures': nps.series.nps('e2e.prepare', 'e2e.headless')
        },
        ci1: 'node ./tools/scripts/e2e.js --headless --configuration=ci1',
        ci2: 'node ./tools/scripts/e2e.js --headless --configuration=ci2',
        ci3: 'node ./tools/scripts/e2e.js --headless --configuration=ci3'
      },
      format: {
        default: 'nx format:write',
        and: {
          lint: {
            check: nps.concurrent.nps('format.check', 'lint')
          }
        },
        write: 'nx format:write',
        check: 'nx format:check'
      },
      lint: {
        default: nps.concurrent({
          nxLint: 'nx lint',
          tsLint:
            'npx tslint -p tsconfig.json -e **/generated/* -c tslint.json',
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
      build: {
        default: 'nx affected:build --all --parallel',
        affected: affected('build')
      },
      dev: {
        server: {
          default: nps.series(
            'nps gen-graphql',
            'ng build electron --maxWorkers=4 --noSourceMap',
            'nps electron.copy-assets',
            'nps dev.server.start'
          ),
          start: `electron ${ELECTRON_BUNDLE_PATH} --server --port 4201 --inspect=9229`
        },
        up: {
          default: nps.concurrent({
            server: 'nps dev.server',
            frontend: 'ng serve angular-console --configuration=dev'
          }),
          start: nps.concurrent({
            server: 'nps dev.server.start',
            frontend: 'ng serve angular-console --configuration=dev'
          }),
          cypress: nps.concurrent({
            server: 'nps dev.server.start',
            frontend: 'ng run angular-console:serve:cypress'
          })
        }
      }
    }),
    withApp('electron', ({ name }) => ({
      'install-dependencies': `node ${join(
        'tools',
        'scripts',
        'electron-yarn.js'
      )}`,
      'copy-assets': nps.series(
        `nps ${name}.copy-assets-base`,
        `shx chmod 0755 ${join(
          'dist',
          'apps',
          name,
          'assets',
          'new-workspace'
        )}`
      ),
      package: {
        default:
          platform() === 'win32'
            ? `nps ${name}.package.win`
            : `nps ${name}.package.mac`,
        mac: nps.series(
          'echo "${CSC_LINK:?Need to set CSC_LINK non-empty}" > /dev/null',
          electronBuilder('--mac', 'never'),
          electronBuilder('--linux', 'never')
        ),
        win: electronBuilder('--win', 'never')
      },
      publish: {
        win: nps.series(
          `nps ${name}.prepare`,
          electronBuilder(
            '--win',
            'always',
            '--config.win.certificateSubjectName="Narwhal Technologies Inc."'
          )
        )
      }
    })),
    withApp('intellij', () => ({
      'install-dependencies': `node ${join(
        'tools',
        'scripts',
        'intellij-yarn.js'
      )}`,
      package: `node ${join('tools', 'scripts', 'intellij-package.js')}`
    })),
    withApp('vscode', ({ name, assets }) => ({
      'install-dependencies': `node ${join(
        'tools',
        'scripts',
        'vscode-yarn.js'
      )}`,
      'copy-assets': nps.series(
        `nps ${name}.copy-assets-base`,
        `shx rm -rf ${assets['node-pty-prebuilt'].to}]`,
        `shx cp -rf ${assets['node-pty-prebuilt'].from} ${
          assets['node-pty-prebuilt'].to
        }`
      ),
      package: nps.series(
        `shx rm -rf ${join('dist', 'apps', name, '**', '*.ts')}`,
        `node ${join('tools', 'scripts', 'vscode-vsce.js')}`
      )
    }))
  ).call()
};

function pipe(...fns) {
  return fns.reduce((a, b) => x => b(a(x)));
}

function always(x) {
  return () => x;
}

function withApp(appName, getScripts) {
  const appAssets = assetMappings(appName);
  const appScripts = getScripts({ assets: appAssets, name: appName });

  if (!appScripts['copy-assets']) {
    appScripts['copy-assets'] = `nps ${appName}.copy-assets-base`;
  }

  if (!appScripts['install-dependencies']) {
    throw new Error(
      `Scripts for "${appName}" does not include "install-dependencies". Please check usage of \`withApp\`.`
    );
  }

  return chainedScripts => {
    return {
      ...chainedScripts,
      [appName]: {
        ...appScripts,
        'copy-assets-base': nps.concurrent({
          schema: `shx cp ${appAssets['schema'].from} ${
            appAssets['schema'].to
          }`,
          'server-assets': `shx cp -rf ${appAssets['server-assets'].from} ${
            appAssets['server-assets'].to
          }`,
          readme: `shx cp ${appAssets['readme'].from} ${
            appAssets['readme'].to
          }`,
          'extensions-schema': `shx cp ${appAssets['extensions-schema'].from} ${
            appAssets['extensions-schema'].to
          }`,
          cli: 'node ./tools/scripts/patch-cli.js'
        }),
        build: {
          default: nps.series(
            'nps gen-graphql',
            nps.concurrent({
              server: `ng build ${appName} --prod --maxWorkers=4 --noSourceMap`,
              client: `ng build angular-console --configuration=${appName}`
            })
          ),
          dev: nps.series(
            'nps gen-graphql',
            nps.concurrent({
              server: `ng build ${appName} --maxWorkers=4`,
              client: `ng build angular-console --configuration=${appName}`
            })
          )
        },
        prepare: {
          dev: nps.series.nps(
            `${appName}.build.dev`,
            `${appName}.copy-assets-base`
          ),
          default: nps.series.nps(
            'clean',
            `${appName}.build`,
            `${appName}.install-dependencies`,
            `${appName}.copy-assets`
          ),
          and: {
            package: nps.series.nps(`${appName}.prepare`, `${appName}.package`)
          }
        }
      }
    };
  };
}

function affected(affectedCommand) {
  return {
    'origin-master': `nx affected:${affectedCommand} --base=origin/master --parallel`,
    'upstream-master': `nx affected:${affectedCommand} --base=upstream/master --parallel`
  };
}

function electronBuilder(platform, dashP, extraFlags) {
  return `electron-builder ${platform} -p ${dashP} ${
    extraFlags ? extraFlags : ''
  }`;
}

function assetMappings(appName) {
  return {
    'node-pty-prebuilt': {
      from: join('tools', 'win', 'node-pty-prebuilt', 'build', 'Release'),
      to: join(APPS_PATH, appName, 'node_modules', 'node-pty-prebuilt', 'build')
    },
    'extensions-schema': {
      from: join(
        './node_modules',
        '@nrwl',
        'angular-console-enterprise-electron',
        'schema.graphql'
      ),
      to: join(APPS_PATH, appName, 'assets', 'extensions-schema.graphql')
    },
    'server-assets': {
      from: join('libs', 'server', 'src', 'assets', '*'),
      to: join(APPS_PATH, appName, 'assets')
    },
    readme: {
      from: 'README.md',
      to: join(APPS_PATH, appName, 'README.md')
    },
    schema: {
      from: join(
        'node_modules',
        '@nrwl',
        'angular-console-enterprise-electron',
        'schema.graphql'
      ),
      to: join(
        APPS_PATH,
        appName,
        'assets',
        'angular-console-enterprise-electron-schema.graphql'
      )
    }
  };
}
