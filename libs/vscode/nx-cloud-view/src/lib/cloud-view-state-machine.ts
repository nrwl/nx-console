import type {
  CIPEInfo,
  CIPEInfoError,
  CloudOnboardingInfo,
} from '@nx-console/shared/types';
import { onWorkspaceRefreshed } from '@nx-console/vscode/lsp-client';
import { getRecentCIPEData } from '@nx-console/vscode/nx-workspace';
import {
  and,
  AnyEventObject,
  assign,
  emit,
  enqueueActions,
  fromCallback,
  fromPromise,
  not,
  or,
  sendTo,
  setup,
  spawnChild,
} from 'xstate';

const COLD_POLLING_TIME = 180_000;
const HOT_POLLING_TIME = 10_000;
const EMPTY_POLL_SLEEP_AMOUNT = 20;

const pollingMachine = setup({
  types: {
    context: {} as {
      pollingFrequency: number;
      emptyCounter: number;
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
    updateEmptyCounter: assign(({ context, event }) => {
      const recentCIPEData = event['output'] as
        | {
            info?: CIPEInfo[];
            error?: CIPEInfoError;
          }
        | undefined;
      if (!recentCIPEData?.info || recentCIPEData.info.length === 0) {
        return {
          ...context,
          emptyCounter: context.emptyCounter + 1,
        };
      } else {
        return {
          ...context,
          emptyCounter: 0,
        };
      }
    }),
  },
  actors: {
    getRecentCIPEData: fromPromise(async () => {
      return await getRecentCIPEData();
    }),
    workspaceRefreshedListener: fromCallback(({ sendBack }) => {
      onWorkspaceRefreshed(() => {
        sendBack({ type: 'WAKE_UP' });
      });
    }),
  },
  guards: {
    shouldSleep: ({ context }) => {
      return context.emptyCounter > EMPTY_POLL_SLEEP_AMOUNT;
    },
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAcD2AbdBLAdlAdLOmGMrlAMQDqAggNICiA+gKoAKA2gAwC6iKqWFgAuWVDn4gAHogDMAdnwAmABwBGAGzy1StQE4lAVg1KjAGhABPOXpX4ALFz2yNGw7JUr5p2QF9fFmiY5PgA7gCGIuQU3HxIIGhCouKSMghKTvgaHnryhup6XCqySvIW1ghq9oqGerYaxUqO1cX+gRjYeGGRongUUrDC4cJg+OEAZiMATgAUQZ1QAGJTYACOAK5gOADGlgCUFPMhEVF4sZKJUSnxaRr2GvjqOp5Keg2GhvbliPam+IbyLhqNTyeT2Wx1LiGNoJDohI59CDiUa4ABuqAA1qMEQQcQg0ahtsMxDhYud4pdkhIboglNl8FwXCpVB5HK81N90iDHvZ3LztMymnoYTj8DiKGAplNUFMxehhuMZQBbMVwrp4glEqlk3gXQRXamgNLgh7yBT2e62UxqLhKTmqJQOV5ve72EFQt7+AIgHCoCBwPXBPB6pIk1KIAC0NvwApKXhUXDBCjynIBWQMr3B9gTsl+ahFaoIRBIZGDFP1VPDCEBjwauU87jquU5VUMDLUhiUsjUsjenYUSgLQYIJ16UBDBqrsmMMa03fs840XEchhbvPb-Z7fa73iHC1Vw4nlZplQaWTNsiKS6XzIBnPNWRM+VcWi4rnsXt8QA */
  context: {
    pollingFrequency: COLD_POLLING_TIME,
    emptyCounter: 0,
  },
  id: 'polling',
  initial: 'polling',
  states: {
    sleeping: {
      on: {
        WAKE_UP: {
          target: 'polling',
          actions: [
            assign({
              emptyCounter: 0,
            }),
          ],
        },
      },
    },
    waiting: {
      after: {
        pollingFrequency: {
          target: 'polling',
        },
      },
      always: {
        target: 'sleeping',
        guard: 'shouldSleep',
      },
    },
    polling: {
      invoke: {
        src: 'getRecentCIPEData',
        onDone: {
          actions: [
            'sendCIPEUpdate',
            'setPollingFrequency',
            'updateEmptyCounter',
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
  entry: [spawnChild('workspaceRefreshedListener')],
});

export const machine = setup({
  types: {
    context: {} as {
      onboardingInfo?: CloudOnboardingInfo;
      recentCIPEs?: CIPEInfo[];
      cipeError?: CIPEInfoError;
      pollingTime: number;
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
        recentCIPEs: newCIPEData?.info,
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
