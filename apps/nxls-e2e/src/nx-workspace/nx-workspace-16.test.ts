import {
  simpleReactWorkspaceOptions,
  uniq,
} from '@nx-console/shared-e2e-utils';
import { testNxWorkspace } from './nx-workspace-base';
const workspaceName = uniq('workspace');
testNxWorkspace(
  '16',
  simpleReactWorkspaceOptions,
  workspaceName,
  [`e2e`, workspaceName],
  [
    { [`e2e`]: ['e2e', 'lint'] },
    {
      [workspaceName]: [
        'build',
        'lint',
        'nx-release-publish',
        'preview',
        'serve',
        'serve-static',
        'start',
        'test',
      ],
    },
  ],
);
