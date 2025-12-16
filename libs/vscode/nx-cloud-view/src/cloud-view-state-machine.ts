import type {
  CIPEInfo,
  CIPEInfoError,
  CloudOnboardingInfo,
  NxAiFix,
} from '@nx-console/shared-types';
import { getRecentCIPEData } from '@nx-console/vscode-nx-workspace';
import {
  and,
  AnyEventObject,
  assign,
  emit,
  enqueueActions,
  fromPromise,
  not,
  or,
  sendTo,
  setup,
  spawnChild,
} from 'xstate';
// need this import for type inference - DO NOT REMOVE
import type { Guard } from 'xstate/guards';
import { vscodeLogger } from '@nx-console/vscode-output-channels';

const SLEEP_POLLING_TIME = 3_600_000;
const COLD_POLLING_TIME = 180_000;
const HOT_POLLING_TIME = 20_000;
const AI_FIX_POLLING_TIME = 10_000;

const pollingMachine = setup({
  types: {
    context: {} as {
      pollingFrequency: number;
    },
  },
  delays: {
    pollingFrequency: ({ context }) => context.pollingFrequency,
  },
  actions: {
    sendCIPEUpdate: sendTo(
      ({ system }) => system.get('cloud-view'),
      ({ event }) => ({
        type: 'UPDATE_RECENT_CIPE',
        value: event['output'],
      }),
    ),
    setPollingFrequency: assign(({ context, event }) => {
      const recentCIPEData = event['output'] as
        | {
            info?: CIPEInfo[];
            error?: CIPEInfoError;
          }
        | undefined;

      const previousFrequency = context.pollingFrequency;
      let newFrequency: number;
      let reason: string;

      if (
        recentCIPEData?.error &&
        recentCIPEData.error.type === 'authentication'
      ) {
        newFrequency = SLEEP_POLLING_TIME;
        reason = 'authentication error';
      } else if (
        recentCIPEData?.info?.some((cipe) => cipe.status === 'IN_PROGRESS')
      ) {
        newFrequency = HOT_POLLING_TIME;
        reason = 'CIPE in progress';
      } else if (
        recentCIPEData?.info?.some((cipe) =>
          cipe.runGroups.some((rg) => isAIFixActive(rg.aiFix)),
        )
      ) {
        newFrequency = AI_FIX_POLLING_TIME;
        reason = 'AI fix in progress';
      } else {
        newFrequency = COLD_POLLING_TIME;
        reason = 'default';
      }

      // Log only when frequency changes
      if (previousFrequency !== newFrequency) {
        const getFrequencyName = (freq: number) => {
          switch (freq) {
            case SLEEP_POLLING_TIME:
              return 'SLEEP (1 hour)';
            case COLD_POLLING_TIME:
              return 'COLD (3 minutes)';
            case HOT_POLLING_TIME:
              return 'HOT (20 seconds)';
            case AI_FIX_POLLING_TIME:
              return 'AI FIX (10 seconds)';
            default:
              return `${freq}ms`;
          }
        };

        vscodeLogger.log(
          `Nx Cloud - Polling frequency changed from ${getFrequencyName(previousFrequency)} to ${getFrequencyName(newFrequency)} (reason: ${reason})`,
        );
      }

      return {
        ...context,
        pollingFrequency: newFrequency,
      };
    }),
  },
  actors: {
    getRecentCIPEData: fromPromise(async () => {
      return await getRecentCIPEData();
    }),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAcD2AbdBLAdlAdAO4CGWALrlAMQBiA8gEoDCAogPoAKdAMtwNoAGALqIUqWOSyocokAA9EAZkUAmfAA51KgJzKB2gOy6VAVhMAaEAE9EARnUA2fAJUH1qgCwqBt2w+0eAL6BlmiYlESkFHhUcrBkxGRg+MQAZkkATgAUYdh4NBlgAI4ArmA4AMZWAJRUuREkkniCIkggaBIU0rIKCIq2HvgmAh4+tiYe2uoeHg6WNn0CBviTBiqK-uprDorqwaEYeQT1MRDSybgAbqgA1sknx4eUCFeoFYlSOC0tsh2S3W1ejonAEVLYjG51PoPIp5ogPJpnCNhgIzOpxqoDPt2k88PgHlQwBkMqgMvj0IlUqSALb43GPcJ4F44a7vLpfYQ-Np-dk9RA6ZYOaFGLwmewOObWeHKfBTDwmLbTLSuLHYnCoCBwX707WdT58hAmNSo7RC+y6ATqQyKDxwhBTfAGEbaFTuWzaS0+EzYh6RJpQXX-GSAuwCATOEymnxWxSW612xRuDSTEaOMxGb0hHGMhlHQO8kOGkyKfDggy2WMDTTaGt21zhhxlisSgQOTRBYKBIA */
  context: {
    pollingFrequency: COLD_POLLING_TIME,
  },
  id: 'polling',
  initial: 'polling',
  states: {
    waiting: {
      after: {
        pollingFrequency: {
          target: 'polling',
        },
      },
      on: {
        FORCE_POLL: {
          target: 'polling',
        },
      },
    },
    polling: {
      invoke: {
        src: 'getRecentCIPEData',
        onDone: {
          actions: ['sendCIPEUpdate', 'setPollingFrequency'],
          target: 'waiting',
        },
        onError: {
          actions: [],
          target: 'waiting',
        },
      },
    },
  },
});

export const machine = setup({
  types: {
    context: {} as {
      pollingTime: number;
      recentCIPEs: CIPEInfo[] | null;
      onboardingInfo?: CloudOnboardingInfo;
      cipeError?: CIPEInfoError;
      workspaceUrl?: string;
    },
  },
  actions: {
    updateOnboarding: assign(({ context, event }) => ({
      ...context,
      onboardingInfo: event['value'],
    })),
    updateRecentCIPE: enqueueActions(({ context, enqueue, event }) => {
      const newCIPEData = (event as AnyEventObject)['value'] as
        | { info?: CIPEInfo[]; error?: CIPEInfoError; workspaceUrl?: string }
        | undefined;
      if (newCIPEData?.info) {
        enqueue({
          type: 'compareCIPEDataAndSendNotification',
          params: {
            oldData: context.recentCIPEs,
            newData: newCIPEData.info,
          },
        } as any);
      }
      enqueue.assign({
        ...context,
        // Preserve existing CIPEs when errors occur to avoid false notifications
        recentCIPEs: newCIPEData?.info ?? context.recentCIPEs,
        cipeError: newCIPEData?.error,
        workspaceUrl: newCIPEData?.workspaceUrl,
      });
      enqueue({
        type: 'setErrorContext',
      } as any);
    }),
    compareCIPEDataAndSendNotification: () => {
      throw new Error('Not implemented');
    },
    setViewVisible: () => {
      throw new Error('Not implemented');
    },
    setErrorContext: () => {
      throw new Error('Not implemented');
    },
    requestRecentCIPEData: emit({
      type: 'UPDATE_RECENT_CIPES',
    }),
  },
  delays: {
    recentCipePollingFrequency: ({ context }) => {
      return context.pollingTime;
    },
  },
  guards: {
    shouldShowRecentCIPEs: or([
      'hasRecentCIPEs',
      and(['hasOnboardingInfo', 'isOnboardingComplete']),
    ]),
    isOnboardingComplete: ({ context }) => {
      const info = context.onboardingInfo;
      if (!info) return false;

      // If claim check failed (undefined) but other conditions are met,
      // assume onboarding is complete (optimistic approach)
      if (
        info.isWorkspaceClaimed === undefined &&
        info.isConnectedToCloud &&
        info.hasNxInCI
      ) {
        return true;
      }

      // Otherwise, check all conditions as before
      return Boolean(
        info.isWorkspaceClaimed && info.isConnectedToCloud && info.hasNxInCI,
      );
    },
    hasOnboardingInfo: ({ context }) => {
      return Boolean(context.onboardingInfo);
    },
    hasRecentCIPEs: ({ context }) => {
      return Boolean(context.recentCIPEs && context.recentCIPEs.length > 0);
    },
    hasRunningCIPEs: ({ context }) => {
      return Boolean(
        context.recentCIPEs &&
          context.recentCIPEs.some((cipe) => cipe.status === 'IN_PROGRESS'),
      );
    },
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QGMA2B7ArhAtANwEswB3AYgFUAFAEQEEAVAUQH0B5AOQCFXaAlagJLsA4gG0ADAF1EoAA7pYBAC4F0AOxkgAHogDM43QDoALAE4A7MfGmAHGfEA2AEzmANCACeiAIzjzhpwBWQKdQ829TY29zcwcAXzj3NCxcQhIKGgYWXkYAYUZ2emZcgUpGCWkkEHlFFXVNHQR9Y0NvQLNvJ2MHY0C-N08fJwSkjGx8ImJDDABDCAI1KFIKzRrlVQ0qxqdnQwsHYONdc0DowNN3LwQnGxtWx11znt1TCOHEkGTxtKnZ+cXlt5KnIFOt6ltEIEBldfPpDNZAjZmk8euYRp8xqlJoZ1AAjdAzABO-yWKyqazqm1AjWC3nu3jMNicpnE4mZ0MQTKcrXaxhsgQOfSRpnRXyxJBxanxRJJpC0sCUMyUYEMMwAZsrCQAKQlgZBgNRKXIEWRgSjoVCoBZQABiuoAjpgDcgPABKUhiiYSvEE4nWskg2obBqICyXHz6O5RZxOTqRXymeIfT0-Qy6-WGnDIE1gZZSVagykhhC0+mM5ms9nhhAsu7mUx9Sw7cQCl6izFeqbpg1KLM5uUKpUq9WanV6nvG03my3Wu1gR3Ot0ejup7uZ7OmgPVQvBiHXJziQy6Y-MwK6BzmGwWbwOauCkw7BwOGwGF8OXQ2dspTtp8frnOGMgFoQHmwLbkG4LUj45jct4+gRK8rzdMet6DDWujci8T4OI4B5MqcX7fNia69huKoABboEooEFhBVLaIgXRGN4di3FYLbMk+gTVrc-h+O+Ni+C+l5QgkHxqOgEBwJoKaTLRYL0Y0OAMtWLGmIYpziMYvRHLcjwhIR4q-ASJLyUWe7GBy1yxIYSLHucemJrGgSGT+PoytaZm7lBCAXoYMGvLEiINlWaEMi2hhPue0RXqYLidK5q5-qROZeZBDFNMY1bmLoLQXlYPTPKEZ6JcRyV9qagHAWlimck4PEshpOXHi1pwYe8ozfklGYpZVlFKDVxaPP4N5xc4xixtpLLcWhNjPrZjhzThyEnEmCRAA */
  id: 'cloud-view',
  initial: 'loading',
  context: {
    pollingTime: COLD_POLLING_TIME,
    recentCIPEs: null,
  },
  states: {
    loading: {
      entry: {
        type: 'setViewVisible',
        params: { viewId: 'loading' },
      },
      always: [
        {
          guard: 'shouldShowRecentCIPEs',
          target: 'recent-cipe',
        },
        {
          guard: 'hasOnboardingInfo',
          target: 'onboarding',
        },
      ],
    },
    onboarding: {
      entry: {
        type: 'setViewVisible',
        params: { viewId: 'onboarding' },
      },
      always: {
        target: 'recent-cipe',
        guard: 'shouldShowRecentCIPEs',
      },
    },
    'recent-cipe': {
      entry: {
        type: 'setViewVisible',
        params: { viewId: 'recent-cipe' },
      },
      always: {
        target: 'onboarding',
        guard: not('shouldShowRecentCIPEs'),
      },
    },
  },
  on: {
    UPDATE_ONBOARDING: {
      actions: ['updateOnboarding'],
    },
    UPDATE_RECENT_CIPE: {
      actions: ['updateRecentCIPE'],
    },
  },
  entry: [
    spawnChild(pollingMachine, {
      systemId: 'polling',
    }),
  ],
});

/**
 * Checks if an AI fix is in an active state that requires frequent polling.
 * Returns true only if the fix is still being generated or verified.
 */
function isAIFixActive(aiFix: NxAiFix | undefined): boolean {
  if (!aiFix) {
    return false;
  }

  const userHasTakenAction =
    aiFix.userAction === 'APPLIED' ||
    aiFix.userAction === 'REJECTED' ||
    aiFix.userAction === 'APPLIED_AUTOMATICALLY';

  if (userHasTakenAction) {
    return false;
  }

  const fixGenerationComplete =
    aiFix.suggestedFixStatus === 'COMPLETED' ||
    aiFix.suggestedFixStatus === 'FAILED' ||
    aiFix.suggestedFixStatus === 'NOT_EXECUTABLE';

  const verificationComplete =
    aiFix.verificationStatus === 'COMPLETED' ||
    aiFix.verificationStatus === 'FAILED' ||
    aiFix.verificationStatus === 'NOT_EXECUTABLE';

  // handle undefined as needing verification for backwards compat - API doesn't always return this yet
  const needsVerification =
    aiFix.failureClassification === 'code_change' ||
    aiFix.failureClassification === undefined;

  // Only consider the fix active if either
  // generation is still in progress or
  // verification is still in progress AND the fix needs verification
  return !fixGenerationComplete || (!verificationComplete && needsVerification);
}
