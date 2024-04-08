import { uniq } from '../utils';
import { testNxWorkspace } from './nx-workspace-base';

const workspaceName = uniq('workspace');

testNxWorkspace(
  '14',
  {
    preset: 'react',
    style: 'css',
    e2eTestRunner: 'cypress',
    appName: workspaceName,
  },
  workspaceName,
  [workspaceName, `${workspaceName}-e2e`],
  [
    { [workspaceName]: ['build', 'lint', 'serve', 'test'] },
    { [`${workspaceName}-e2e`]: ['e2e', 'lint'] },
  ]
);
