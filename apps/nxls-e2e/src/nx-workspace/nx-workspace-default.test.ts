import { defaultVersion, simpleReactWorkspaceOptions, uniq } from '../utils';
import { testNxWorkspace } from './nx-workspace-base';

const workspaceName = uniq('workspace');
testNxWorkspace(
  defaultVersion,
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
  ]
);
