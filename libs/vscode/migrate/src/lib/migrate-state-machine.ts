import { setup, assign, not } from 'xstate';
import { NxVersion, gte } from '@nx-console/nx-version';

// need this import for type inference
import type { Guard } from 'xstate/guards';
import { MigrateViewData } from '@nx-console/shared-types';

export const migrateMachine = setup({
  types: {
    context: {} as MigrateViewData,
  },
  actions: {
    updateViewData: assign(({ context, event }) => {
      const workspaceData = event['value'];
      return {
        ...context,
        ...workspaceData,
      };
    }),
  },
  actors: {},
  guards: {
    isMigrationInProgress: ({ context }) => !!context.migrationsJsonSection,
    isUpdateAvailable: ({ context }) =>
      isUpdateAvailable(context.currentNxVersion, context.latestNxVersion),
    hasConfirmedPackageUpdates: ({ context }) =>
      context.migrationsJsonSection &&
      context.migrationsJsonSection.confirmedPackageUpdates,
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAoC2BDAxgCwJYDswBKAYgFUAFAEQEEAVAUQH0A1ASQYHUna6aBtAAwBdRKAAOAe1i4ALrkn4xIAB6IALIPUA6AEyDBAVkEB2dQGYAjAA5rlywBoQAT0SXdAXw9O0WPISJtCDAAM3QAVwAbWRIhUSQQKRl5RWU1BEsde11DS0N1QwBOdQA2cxNBaydXBHVdS211dUKSwxLrQoqmky8fDBwCYm1w8Qh0WTAAWnQAN3RcSPQAI0iwWJFlJLkFJQT0yZNtc2bTQsFdE0Nj3WsTasQTS3NtIsFLFqN1d2tzXpBfAYBYajcZTWbzRYrNb8SzxCTSbapPZuGzaFpmC7WV5FTL3BAlXTPOwdGyCcxWN6GP4A-xDAiTcQAJ0kUEZcFg6zhiQRKV2oHSN0MRzaJUsgkKuhyeRK6jx5l0JRe7xMrWVxzOVO8-36tMC9KZLLZsFg2nEYHwEAIUAZWAA1ugYJMRmMJhy4pseTs0hoLnpKsdBCVCjY7IG8e0GiZ6l8TIUNXlNX0-IM9fgGczWeygqEItFOR7kl7kQhjLptFpCTccm1jo4XA8Ci9A5LzIVyj8CV4tfhJMF4AkaSmC4i+apEJNDEL1adzpdroU8YTCtp3u1WuoTJvDI9qTqU9mwlFZMPed7and6whyYJtLd7F82m1dKVd8mgc7QdM5gtlqsT0X+RRRoJXeeV9C+FoqkvYxDg3aNDAuMVrAVdRX0BOk0wNTNjX-JFAIQBVlyec5yUuMlWhMcw8SKHRWyxEpLhKQNKhKNDdW0fUMyNE0zQtK0bUwe1HQ-V1cNHdIgxvawmKDUVAzFJ5w1ubRHg7Z93AlN42P3TjDSzYJD2iMSzysQ5iMJcpjHMCiqMvdohXqNSvl0TTLC7DwgA */
  initial: 'default',
  states: {
    default: {
      always: [
        {
          guard: 'isUpdateAvailable',
          target: 'update-available',
        },
        {
          guard: 'isMigrationInProgress',
          target: 'in-progress',
        },
      ],
    },
    'update-available': {
      always: [
        {
          guard: 'isMigrationInProgress',
          target: 'in-progress',
        },
        {
          guard: not('isUpdateAvailable'),
          target: 'default',
        },
      ],
    },
    'in-progress': {
      always: [
        {
          guard: not('isMigrationInProgress'),
          target: 'default',
        },
      ],
      initial: 'default',
      states: {
        'pending-package-updates': {
          always: [
            {
              guard: 'hasConfirmedPackageUpdates',
              target: 'default',
            },
          ],
        },
        default: {
          always: [
            {
              guard: not('hasConfirmedPackageUpdates'),
              target: 'pending-package-updates',
            },
          ],
        },
      },
    },
  },
  on: {
    UPDATE_VIEW_DATA: {
      actions: ['updateViewData'],
    },
  },
});

export function isUpdateAvailable(
  currentNxVersion: NxVersion,
  latestNxVersion: NxVersion,
): boolean {
  return (
    !!currentNxVersion &&
    !!latestNxVersion &&
    gte(latestNxVersion, currentNxVersion) &&
    (latestNxVersion.major > currentNxVersion.major ||
      latestNxVersion.minor > currentNxVersion.minor)
  );
}
