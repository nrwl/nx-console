import {
  simpleReactWorkspaceOptions,
  uniq,
} from '@nx-console/shared-e2e-utils';
import { testNxWorkspace } from './nx-workspace-base';
const workspaceName = uniq('workspace');
testNxWorkspace(
  '17',
  simpleReactWorkspaceOptions,
  workspaceName,
  ['e2e', workspaceName],
  [
    { [`e2e`]: ['e2e', 'lint'] },
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
