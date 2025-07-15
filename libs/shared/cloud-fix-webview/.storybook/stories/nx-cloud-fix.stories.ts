import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import '../../src/nx-cloud-fix-component';
import type { NxCloudFixDetails } from '@nx-console/shared-types';

const meta: Meta = {
  title: 'Cloud Fix/NxCloudFixComponent',
  tags: ['autodocs'],
  render: (args) => html`
    <nx-cloud-fix-component
      .details=${args.details}
      .onApply=${() => console.log('Apply clicked')}
      .onApplyLocally=${() => console.log('Apply Locally clicked')}
      .onReject=${() => console.log('Reject clicked')}
      .onShowDiff=${() => console.log('Show Diff clicked')}
    ></nx-cloud-fix-component>
  `,
  argTypes: {
    details: { control: 'object' },
  },
};

export default meta;
type Story = StoryObj;

const baseDetails: NxCloudFixDetails = {
  cipe: {
    cipeUrl: 'https://cloud.nx.app/runs/123',
    id: '123',
    status: 'FAILED',
    createdAt: new Date().toISOString(),
  },
  runGroup: {
    runGroup: 'e2e',
    runGroupId: 'rg-123',
    aiFix: {
      suggestedFix: true,
      suggestedFixDescription: 'fix: Update configuration for TypeScript 5.0',
      suggestedFixReasoning:
        'The build is failing because the `tsconfig.json` file is using an outdated TypeScript configuration. The error shows that `moduleResolution: "node"` is deprecated. We need to update it to `moduleResolution: "bundler"` for TypeScript 5.0+ compatibility. Additionally, the `target` should be updated from `es2015` to `es2022` for better modern JavaScript support.',
      suggestedFixStatus: 'COMPLETED',
      verificationStatus: 'COMPLETED',
      taskIds: ['app:build'],
      userAction: null,
    },
  },
  terminalOutput: `
> nx run app:build

tsconfig.json:5:15 - error TS5098: Option 'moduleResolution: "node"' is deprecated and will be removed in a future release. Please use 'moduleResolution: "node10"' or 'moduleResolution: "bundler"' instead.

5     "moduleResolution": "node",
                ~~~~~~~

Found 1 error.
`,
  hasUncommittedChanges: false,
};

export const WithInlineCode: Story = {
  args: {
    details: {
      ...baseDetails,
      runGroup: {
        ...baseDetails.runGroup,
        aiFix: {
          ...baseDetails.runGroup.aiFix!,
          suggestedFixReasoning:
            'The build is failing because `tsconfig.json` is using deprecated options. The `moduleResolution: "node"` setting needs to be updated to `moduleResolution: "bundler"` for TypeScript 5.0+. Also update `target: "es2015"` to `target: "es2022"`.',
        },
      },
    },
  },
};

export const MultipleInlineCode: Story = {
  args: {
    details: {
      ...baseDetails,
      runGroup: {
        ...baseDetails.runGroup,
        aiFix: {
          ...baseDetails.runGroup.aiFix!,
          suggestedFixReasoning:
            'The test is failing due to a missing import. Add `import { render } from "@testing-library/react"` at the top of `app.spec.tsx`. Also ensure that `jest.config.ts` includes the `setupFilesAfterEnv` option pointing to `./test-setup.ts`.',
        },
      },
    },
  },
};

export const NoInlineCode: Story = {
  args: {
    details: {
      ...baseDetails,
      runGroup: {
        ...baseDetails.runGroup,
        aiFix: {
          ...baseDetails.runGroup.aiFix!,
          suggestedFixReasoning:
            'The build is failing because of a configuration issue. Update the TypeScript configuration to use the latest settings compatible with your project requirements.',
        },
      },
    },
  },
};
