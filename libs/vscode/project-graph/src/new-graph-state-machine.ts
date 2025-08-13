import type { ProjectGraph } from 'nx/src/devkit-exports';
import type { GraphDataResult } from '@nx-console/shared-types';
import { assign, enqueueActions, fromPromise, setup } from 'xstate';

export type GraphMachineContext = {
  graphData: ProjectGraph | undefined;
  graphBasePath: string | undefined;
  errors:
    | {
        errorsSerialized: string | undefined; // JSON string of NxError[]
        errorMessage: string | undefined;
        isPartial: boolean | undefined;
      }
    | undefined;
  resultType: GraphDataResult['resultType'] | undefined;
};

// Events the machine reacts to
export type GraphMachineEvents =
  | { type: 'GRAPH_DATA_LOAD_SUCCESS' }
  | { type: 'GRAPH_DATA_LOAD_ERROR' }
  | { type: 'REFRESH' }
  | { type: 'INITIALIZED' };

// The actor should resolve with the fields needed by the machine context
export type LoadGraphDataOutput = Partial<GraphMachineContext>;

export const graphMachine = setup({
  types: {
    context: {} as GraphMachineContext,
    events: {} as GraphMachineEvents,
  },
  actors: {
    loadGraphData: fromPromise<LoadGraphDataOutput>(async () => {
      // Provided by the consumer via .provide({ actors: { loadGraphData } })
      return {} as LoadGraphDataOutput;
    }),
  },
  actions: {
    renderLoading: () => {
      // Provided by the consumer via .provide({ actions: { renderLoading } })
    },
    renderGraph: () => {
      // Provided by the consumer via .provide({ actions: { renderGraph } })
    },
    updateGraph: (
      _: unknown,
      params: { graphData: ProjectGraph | undefined },
    ) => {
      void params;
      // Provided by the consumer via .provide({ actions: { updateGraph } })
    },
    renderError: () => {
      // Provided by the consumer via .provide({ actions: { renderError } })
    },
    assignLoadGraphData: assign(({ event }) => ({
      ...(event as any)['output'],
    })),
    transitionConditionally: enqueueActions(({ context, enqueue }) => {
      // If there are errors, go to error state
      if (context.resultType === 'SUCCESS') {
        enqueue.raise({ type: 'GRAPH_DATA_LOAD_SUCCESS' });
      } else {
        enqueue.raise({ type: 'GRAPH_DATA_LOAD_ERROR' });
      }
    }),
  },
}).createMachine({
  id: 'projectGraph',
  initial: 'initialLoading',
  context: {
    graphData: undefined,
    graphBasePath: undefined,
    errors: undefined,
    resultType: undefined,
  },
  states: {
    initialLoading: {
      entry: ['renderLoading'],
      invoke: {
        src: 'loadGraphData',
        onDone: {
          actions: ['assignLoadGraphData', 'transitionConditionally'],
        },
      },
    },
    showingGraph: {
      entry: 'renderGraph',
      initial: 'starting',
      on: {
        INITIALIZED: {
          target: '.idle',
        },
        REFRESH: {
          target: '.refreshing',
        },
      },
      states: {
        starting: {},
        idle: {},
        refreshing: {
          invoke: {
            src: 'loadGraphData',
            onDone: {
              actions: [
                'assignLoadGraphData',
                enqueueActions(({ context, enqueue }) => {
                  if (context.resultType !== 'SUCCESS') {
                    enqueue('transitionConditionally');
                  } else {
                    enqueue({
                      type: 'updateGraph',
                      params: { graphData: context.graphData },
                    });
                  }
                }),
              ],
            },
          },
        },
      },
    },
    showingError: {
      entry: 'renderError',
      on: {
        REFRESH: {
          target: '.refreshing',
        },
      },
      initial: 'idle',
      states: {
        idle: {},
        refreshing: {
          invoke: {
            src: 'loadGraphData',
            onDone: {
              actions: ['assignLoadGraphData', 'transitionConditionally'],
            },
          },
        },
      },
    },
  },
  on: {
    GRAPH_DATA_LOAD_SUCCESS: {
      target: '.showingGraph',
    },
    GRAPH_DATA_LOAD_ERROR: {
      target: '.showingError',
    },
  },
});
