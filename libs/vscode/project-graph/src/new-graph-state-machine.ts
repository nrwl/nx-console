import { assign, enqueueActions, fromPromise, setup } from 'xstate';

/**
 * Graph state machine scaffolding modeled after the PDV state machine.
 *
 * States:
 * - initialLoading: render spinner immediately and invoke loadGraphData
 * - showingGraph: graph html rendered, supports REFRESH
 * - showingError: error UI rendered, supports REFRESH
 *
 * Context:
 * - graphDataSerialized: stringified project graph to pass into the webview
 * - graphBasePath: base path for graph assets (environment.js, runtime.js, etc.)
 * - errorsSerialized / errorMessage: optional error payload for error UI
 */
export type GraphMachineContext = {
  graphDataSerialized: string | undefined;
  errorsSerialized: string | undefined;
  errorMessage: string | undefined;
};

// Events the machine reacts to
export type GraphMachineEvents =
  | { type: 'GRAPH_DATA_LOAD_SUCCESS' }
  | { type: 'GRAPH_DATA_LOAD_ERROR' }
  | { type: 'REFRESH' }
  | {
      type: 'updateGraph';
      params: { graphData: string | undefined };
    };

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
    updateGraph: (_: unknown, params: { graphData: string | undefined }) => {
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
      // If we have the data, we can render the graph
      if (context.graphDataSerialized) {
        enqueue.raise({ type: 'GRAPH_DATA_LOAD_SUCCESS' });
        return;
      }
      // If there are errors, go to error state
      if (context.errorsSerialized || context.errorMessage) {
        enqueue.raise({ type: 'GRAPH_DATA_LOAD_ERROR' });
        return;
      }
      // Default to error if neither condition is met
      enqueue.raise({ type: 'GRAPH_DATA_LOAD_ERROR' });
    }),
  },
}).createMachine({
  id: 'projectGraph',
  initial: 'initialLoading',
  context: {
    graphDataSerialized: undefined,
    errorsSerialized: undefined,
    errorMessage: undefined,
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
      initial: 'idle',
      on: {
        REFRESH: {
          target: '.refreshing',
        },
      },
      states: {
        idle: {},
        refreshing: {
          invoke: {
            src: 'loadGraphData',
            onDone: {
              actions: [
                'assignLoadGraphData',
                enqueueActions(({ context, enqueue }) => {
                  if (context.graphDataSerialized) {
                    enqueue({
                      type: 'updateGraph',
                      params: { graphData: context.graphDataSerialized },
                    });
                  } else {
                    enqueue('transitionConditionally');
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
