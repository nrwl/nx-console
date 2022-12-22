import type { Options } from '@wdio/types';

import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { TestworkspaceInstallationService } from './services/testworkspace-installation.service';

const debug = process.env.DEBUG;

export const config: Options.Testrunner = {
  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: {
      transpileOnly: true,
      project: `./tsconfig.json`,
    },
  },
  specs: [
    // `./specs/**/*.e2e.ts`
    './specs/viewcontainer.e2e.ts',
  ],
  exclude: [],
  maxInstances: debug || process.env.CI ? 1 : 3,
  capabilities: [
    {
      browserName: 'vscode',
      browserVersion: '1.73.1',
      'wdio:vscodeOptions': {
        vscodeArgs: { 'disable-extensions': true },
        userSettings: { 'NxConsoleClient.trace.server': 'info' },
        verboseLogging: true,
        extensionPath: join(__dirname, '../..', 'dist/apps/vscode'),
      },
    },
  ],
  logLevel: 'error',
  bail: 0,
  baseUrl: 'http://localhost',
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
  services: [[TestworkspaceInstallationService, {}], 'vscode'],
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: debug ? 600000 : 60000,
  },
  afterTest: function (
    test,
    context,
    { error, result, duration, passed, retries }
  ) {
    if (error) {
      if (!existsSync('./.screenshots')) {
        mkdirSync('./.screenshots');
      }
      const time = new Date();
      const screenshotTitle =
        `${time.getFullYear()}-${time.getMonth()}-${time.getDay()}-${time.getUTCHours()}h-${time.getUTCMinutes()}m-${time.getUTCSeconds()}s-${
          test.parent
        }-${test.title}`.replace(/[ |/]/g, '-');
      browser.saveScreenshot(`./.screenshots/${screenshotTitle}.png`);
    }
  },
};
