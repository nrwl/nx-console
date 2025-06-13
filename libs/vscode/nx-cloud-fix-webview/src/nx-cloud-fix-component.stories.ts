import type { Meta, StoryObj } from '@storybook/web-components';
import './nx-cloud-fix-component';
import type {
  NxCloudFixComponent,
  NxCloudFixData,
} from './nx-cloud-fix-component';

const meta: Meta<NxCloudFixComponent> = {
  title: 'NxCloudFixComponent',
  component: 'nx-cloud-fix-component',
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    details: { control: 'object' },
    onApply: { action: 'apply' },
    onReject: { action: 'reject' },
  },
};

export default meta;
type Story = StoryObj<NxCloudFixComponent>;

const runGroup: NxCloudFixData['runGroup'] = {
  runGroup: 'build-group-1',
  status: 'FAILED',
  ciExecutionEnv: 'nx-cloud',
  createdAt: new Date('2024-01-15T10:00:00Z').getTime(),
  completedAt: new Date('2024-01-15T10:25:00Z').getTime(),
  runs: [
    {
      command: 'nx run my-app:build',
      status: 'FAILED',
      failedTasks: ['task-1', 'task-2'],
      numFailedTasks: 2,
      numTasks: 5,
      runUrl: 'https://cloud.nx.app/runs/abc123/build-group-1',
      linkId: 'link-123',
      executionId: 'exec-456',
    },
  ],
  aiFix: {
    aiFixId: 'fix-789',
    suggestedFix:
      'npm install some-missing-module\n\n// Add the following import:\nimport { SomeClass } from "some-missing-module";\n\n// Update the configuration:\nexport default {\n  // ... existing config\n  dependencies: {\n    "some-missing-module": "^1.0.0"\n  }\n};',
    validationStatus: 'COMPLETED',
    suggestedFixDescription:
      'Install missing dependencies and update imports, and more configuration changes.',
    userAction: undefined,
    taskIds: ['task-1', 'task-2'],
  },
};

const mockDetails: NxCloudFixData = {
  cipe: {
    id: 'cipe-123',
    status: 'FAILED',
    updatedAt: new Date('2024-01-15T10:30:00Z').getTime(),
    branch: 'feature/new-feature',
    sha: 'abc123def456789',
    runUrl: 'https://cloud.nx.app/runs/abc123',
    workspaceId: 'workspace-456',
    duration: '25m 30s',
    ciPipelineExecutionId: 'cipe-123',
    createdAt: new Date('2024-01-15T10:00:00Z').getTime(),
    completedAt: new Date('2024-01-15T10:30:00Z').getTime(),
    commitTitle: 'feat: add new feature',
    cipeUrl: 'https://cloud.nx.app/cipe/cipe-123',
    commitAuthor: 'Jane Doe',
    commitUrl: 'https://github.com/org/repo/commit/abc123def456789',
    runGroups: [runGroup],
  },
  runGroup,
  terminalOutput: `> nx run my-app:build

Building my-app...

✘ [ERROR] Could not resolve "some-missing-module"

    src/main.ts:1:0:
      1 │ import { missing } from 'some-missing-module';
        ╵ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  You can mark the path "some-missing-module" as external to exclude it from the bundle, which will remove this error and leave the unresolved path in the bundle.

Build failed with 1 error.

> nx run shared-lib:test

Running tests for shared-lib...

  ● Test suite failed to run

    Cannot find module 'some-missing-module' from 'shared-lib/src/index.ts'

};
      at Object.<anonymous> (shared-lib/src/index.ts:1:1)

Test Suites: 1 failed, 0 passed
Tests:       0 total
Time:        2.345 s`,
} as NxCloudFixData;

export const Default: Story = {
  args: {
    details: mockDetails,
    onApply: undefined,
    onReject: undefined,
  },
};

export const WaitingForFix: Story = {
  args: {
    details: {
      ...mockDetails,
      runGroup: {
        ...mockDetails.runGroup,
        aiFix: {
          ...mockDetails.runGroup.aiFix!,
          suggestedFix: undefined,
          suggestedFixDescription: undefined,
          validationStatus: 'NOT_STARTED',
        },
      },
    },
  },
};

export const Applied: Story = {
  args: {
    details: {
      ...mockDetails,
      runGroup: {
        ...mockDetails.runGroup,
        aiFix: {
          ...mockDetails.runGroup.aiFix!,
          userAction: 'APPLIED',
        },
      },
    },
  },
};

export const Ignored: Story = {
  args: {
    details: {
      ...mockDetails,
      runGroup: {
        ...mockDetails.runGroup,
        aiFix: {
          ...mockDetails.runGroup.aiFix!,
          userAction: 'REJECTED',
        },
      },
    },
  },
};

export const ValidationFailed: Story = {
  args: {
    details: {
      ...mockDetails,
      runGroup: {
        ...mockDetails.runGroup,
        aiFix: {
          ...mockDetails.runGroup.aiFix!,
          validationStatus: 'FAILED',
        },
      },
    },
  },
};

export const InProgress: Story = {
  args: {
    details: {
      ...mockDetails,
      runGroup: {
        ...mockDetails.runGroup,
        aiFix: {
          ...mockDetails.runGroup.aiFix!,
          validationStatus: 'IN_PROGRESS',
          suggestedFix: 'some diff',
        },
      },
    },
  },
};

export const NoTerminalOutput: Story = {
  args: {
    details: {
      ...mockDetails,
      terminalOutput: '',
    },
  },
};
