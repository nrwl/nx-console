import type {
  CIPEInfo,
  CIPEInfoError,
  CloudOnboardingInfo,
} from '@nx-console/shared/types';
import { getRecentCIPEData } from '@nx-console/vscode/nx-workspace';
import { getOutputChannel } from '@nx-console/vscode/output-channels';
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

const COLD_POLLING_TIME = 180_000;
const HOT_POLLING_TIME = 10_000;

const pollingMachine = setup({
  types: {
    context: {} as {
      pollingFrequency: number;
      authErrorCounter: number;
    },
  },
  delays: {
    pollingFrequency: ({ context }) => context.pollingFrequency,
  },
  actions: {
    adjustAuthErrorCounter: assign(({ context, event }) => {
      const recentCIPEData = event['output'] as
        | {
            info?: CIPEInfo[];
            error?: CIPEInfoError;
          }
        | undefined;

      if (
        recentCIPEData?.error &&
        recentCIPEData.error.type === 'authentication'
      ) {
        return {
          ...context,
          authErrorCounter: context.authErrorCounter + 1,
        };
      } else {
        return {
          ...context,
          authErrorCounter: 0,
        };
      }
    }),
    resetAuthErrorCounter: assign(({ context }) => ({
      ...context,
      authErrorCounter: 0,
    })),
    sendCIPEUpdate: sendTo(
      ({ system }) => system.get('cloud-view'),
      ({ event }) => ({
        type: 'UPDATE_RECENT_CIPE',
        value: event['output'],
      })
    ),
    setPollingFrequency: assign(({ context, event }) => {
      const recentCIPEData = event['output'] as
        | {
            info?: CIPEInfo[];
            error?: CIPEInfoError;
          }
        | undefined;
      if (recentCIPEData?.info?.some((cipe) => cipe.status === 'IN_PROGRESS')) {
        return {
          ...context,
          pollingFrequency: HOT_POLLING_TIME,
        };
      } else {
        return {
          ...context,
          pollingFrequency: COLD_POLLING_TIME,
        };
      }
    }),
  },
  actors: {
    getRecentCIPEData: fromPromise(async () => {
      return await getRecentCIPEData();
    }),
  },
  guards: {
    isAuthErrorCounterTooHigh: ({ context }) => {
      return context.authErrorCounter > 4;
    },
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAcD2AbdBLAdlAdAO4CGWALrlAMQDaADALqIqqzlao7MgAeiATAHZ8ATjoBmEQBY6-AGwi5guVKkAaEAE8BQ-BMFSArCKEBGEcqEBfKxrSZKRUhTxUesMsTJh8xAGbeAE4AFPbYeABigWAAjgCuYDgAxpoAlFRhjiTsePRMSCBobBSc3HwI4qZS+IZ0MqamhlIiAByqchraFXTCzYL84got-XLiLTZ2GOEEsOhgYMiUVADqAIIA0gCiAPoAqgAKedxF7KUF5eJGeopGTS0KgiKmnYiPeoISpvx00lLidD0JoUpo5Mq4IJwfLgAG6oADWPjBBCRCBhqCSXg4ODyRwKJxKXHOAkUoik-FMKmMLTGhmpLwQUhaLXwA0M-VMlwMbNMQKR+CRVDAgUCqEC-PQXj8ooAtvyQXg5Q48KicLCMQScYxjqxToTQOV+BZ8HIfoz2S1yYZDPS-oY9A0-o0pIJBoY5DZbCAcKgIHBtUqoNriliyogALTfa4m4wuiSsjpacPM2lSOT8e4DS6mQSNXnygjZFyBvE6gmhhCmAF6Ywm0wtET-esu+niQTMtpiRlyK2PQx5gP4WbzRZ4IO68sNET4ST8fjO9PyHoGelt-Aui31+SCQwDHmevlIsdlokIK3ifDZnP-KpMkR3+lCOjGy8cuQmuRMqQeqxAA */
  context: {
    pollingFrequency: COLD_POLLING_TIME,
    authErrorCounter: 0,
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
      always: {
        guard: 'isAuthErrorCounterTooHigh',
        target: 'sleeping',
      },
    },
    sleeping: {
      on: {
        WAKE_UP: {
          target: 'polling',
          actions: ['resetAuthErrorCounter'],
        },
      },
      entry: [
        () => {
          getOutputChannel().appendLine(
            'Stopping cloud polling after 5 failed authentication attempts'
          );
        },
      ],
      exit: [
        () => {
          getOutputChannel().appendLine('Restarting cloud polling');
        },
      ],
    },
    polling: {
      invoke: {
        src: 'getRecentCIPEData',
        onDone: {
          actions: [
            'sendCIPEUpdate',
            'setPollingFrequency',
            'adjustAuthErrorCounter',
          ],
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
        recentCIPEs: newCIPEData?.info ?? [],
        cipeError: newCIPEData?.error,
        workspaceUrl: newCIPEData?.workspaceUrl,
      });
      enqueue({
        type: 'setErrorContext',
      } as any);
    }),
    compareCIPEDataAndSendNotification: (
      _,
      params: {
        oldData: CIPEInfo[];
        newData: CIPEInfo[];
      }
    ) => {
      throw new Error('Not implemented');
    },
    setViewVisible: (_, params: { viewId: string }) => {
      throw new Error('Not implemented');
    },
    setErrorContext: ({ context }) => {
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
      return Boolean(
        context.onboardingInfo?.isWorkspaceClaimed &&
          context.onboardingInfo?.isConnectedToCloud &&
          context.onboardingInfo?.hasNxInCI &&
          context.onboardingInfo?.hasAffectedCommandsInCI
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
          context.recentCIPEs.some((cipe) => cipe.status === 'IN_PROGRESS')
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
