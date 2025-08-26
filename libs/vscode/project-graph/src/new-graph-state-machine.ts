import type { ProjectGraph, TaskGraph } from 'nx/src/devkit-exports';
import type { GraphDataResult } from '@nx-console/shared-types';
import { assign, enqueueActions, fromPromise, setup } from 'xstate';

type GraphMachineContextBase = {
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
export type ProjectGraphMachineContext = GraphMachineContextBase & {
  graphData:
    | {
        projectGraph: ProjectGraph | undefined;
      }
    | undefined;
};

export type TaskGraphMachineContext = GraphMachineContextBase & {
  graphData:
    | {
        projectGraph: ProjectGraph | undefined;
        taskGraph: TaskGraph | undefined;
      }
    | undefined;
};

export type GraphMachineContext =
  | ProjectGraphMachineContext
  | TaskGraphMachineContext;

export type GraphData = GraphMachineContext['graphData'];

// Events the machine reacts to
export type GraphMachineEvents =
  | { type: 'GRAPH_DATA_LOAD_SUCCESS' }
  | { type: 'GRAPH_DATA_LOAD_ERROR' }
  | { type: 'REFRESH' }
  | { type: 'INITIALIZED' };

// The actor should resolve with the fields needed by the machine context
export type LoadGraphDataOutput = Partial<
  ProjectGraphMachineContext | TaskGraphMachineContext
>;

export function getGraphMachine(machineType: 'project' | 'task') {
  return setup({
    types: {
      context: {} as ProjectGraphMachineContext | TaskGraphMachineContext,
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
      renderError: () => {
        // Provided by the consumer via .provide({ actions: { renderError } })
      },
      updateGraph: (
        _: unknown,
        params: {
          graphData: GraphMachineContext['graphData'];
        },
      ) => {
        void params;
        // Provided by the consumer via .provide({ actions: { updateGraph } })
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
    id: `${machineType}Graph`,
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
}
