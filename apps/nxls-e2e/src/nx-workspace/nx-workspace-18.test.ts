import {
  simpleReactWorkspaceOptions,
  uniq,
} from '@nx-console/shared-e2e-utils';
import { testNxWorkspace } from './nx-workspace-base';
const workspaceName = uniq('workspace');
testNxWorkspace(
  '18',
  simpleReactWorkspaceOptions,
  workspaceName,
  ['e2e', workspaceName],
  [
    {
      [`e2e`]: [
        'e2e',
        'e2e-ci',
        'e2e-ci--src/e2e/app.cy.ts',
        'lint',
        'open-cypress',
      ],
    },
    {
      [workspaceName]: [
        'build',
        'lint',
        'preview',
        'serve',
        'serve-static',
        'test',
      ],
    },
  ],
);
