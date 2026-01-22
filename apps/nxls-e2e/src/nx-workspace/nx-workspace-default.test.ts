import {
  defaultVersion,
  simpleReactWorkspaceOptions,
  uniq,
} from '@nx-console/shared-e2e-utils';
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
        'build-deps',
        'dev',
        'lint',
        'preview',
        'serve',
        'serve-static',
        'test',
        'test-ci',
        'test-ci--src/app/app.spec.tsx',
        'typecheck',
        'watch-deps',
      ],
    },
  ],
);
