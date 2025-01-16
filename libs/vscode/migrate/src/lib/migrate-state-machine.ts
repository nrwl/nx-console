import { setup, assign, not } from 'xstate';
import { NxVersion, gte } from '@nx-console/nx-version';

// need this import for type inference
import type { Guard } from 'xstate/guards';

export type MigrateViewData = {
  currentNxVersion?: NxVersion;
  latestNxVersion?: NxVersion;
  hasMigrationsJson?: boolean;
  migrationsJsonSection?: any;
  hasPendingChanges?: boolean;
};

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
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAoC2BDAxgCwJYDswBKAOgjADN0BXAGwBcBiAbQAYBdRUABwHtZc9XL3xcQAD0QBGACwB2EqzkAOKawCcM2QDYATOoDMAVgA0IAJ6JdrXSW1HdB7Rt1ypqqQF9PZtFjyEpORUdEzMUpxIIHwCQiJikgiyCkqqGloyeoamFojKBiQySkZG9lraUlK62t6+GDgExCTU3BDo9GAAtOgAbui4tOgARrRgLBxiMYLColGJpbYOcgaOBgYyyipSZpYI+YXFpUblldXePiD4vOTwUX4NgZP80-FziJ3aO+81F-cBTcEaAwnrEZglEDJdF89gpliojHItMp1MoSnJaiA-o1SC02h1un0BsNRiCXrNQIkDMptIU1kZlLopHJtCyKtDVCQVvoqpCUVJtMoZBisYESAROtwAE68KCSuC3HjPOLkiSIORGApydQClZVNROdTs5QkBGVdTFRzudTnTxAA */
  initial: 'default',
  states: {
    default: {
      always: [
        {
          guard: 'isMigrationInProgress',
          target: 'in-progress',
        },
        {
          guard: 'isUpdateAvailable',
          target: 'update-available',
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
      always: {
        guard: not('isMigrationInProgress'),
        target: 'default',
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
  latestNxVersion: NxVersion
): boolean {
  return (
    !!currentNxVersion &&
    !!latestNxVersion &&
    gte(latestNxVersion, currentNxVersion) &&
    (latestNxVersion.major > currentNxVersion.major ||
      latestNxVersion.minor > currentNxVersion.minor)
  );
}
