import { createMachine, assign, interpret } from 'xstate';
import { MessageType } from './graph-message-type';
import { createProjectGraph } from './create-project-graph';

const enum State {
  init = 'init',
  loading = 'loading',
  loaded = 'loaded',
}

export const enum ViewStatus {
  ready = 'ready',
  destroyed = 'destroyed',
}

const graphMachine = createMachine(
  {
    tsTypes: {} as import('./graph.machine.typegen').Typegen0,
    id: 'Project Graph',
    initial: 'init',
    schema: {
      context: {} as {
        state: State;
        project:
          | {
              type: MessageType;
              projectName: string;
            }
          | undefined;
        viewStatus: ViewStatus;
      },
      services: {} as {
        generateContent: {
          data: void;
        };
      },
      events: {} as
        | { type: 'GET_CONTENT' }
        | { type: 'REFRESH' }
        | { type: 'VIEW_READY' }
        | { type: 'VIEW_DESTROYED' }
        | { type: 'FOCUS'; projectName: string }
        | { type: 'SELECT'; projectName: string },
    },
    context: {
      state: State.init,
      project: undefined,
      viewStatus: ViewStatus.destroyed,
    },
    on: {
      FOCUS: {
        actions: 'setProjectName',
      },
      SELECT: {
        actions: 'setProjectName',
      },
      VIEW_READY: {
        actions: 'viewReady',
      },
      VIEW_DESTROYED: {
        actions: 'viewDestroyed',
      },
    },
    states: {
      init: {
        on: {
          GET_CONTENT: {
            target: 'content',
          },
        },
      },
      content: {
        always: [{ target: 'loading', cond: 'loadGraph' }],
        on: {
          REFRESH: {
            actions: 'refreshData',
          },
        },
      },
      loading: {
        entry: assign({ state: State.loading }),
        invoke: {
          id: 'loadingContent',
          src: 'generateContent',
          onDone: {
            target: 'content',
            actions: 'contentLoaded',
          },
        },
      },
    },
  },
  {
    services: {
      generateContent: async () => {
        return createProjectGraph();
      },
    },
    actions: {
      setProjectName: assign({
        project: (context, event) => ({
          type: event.type as MessageType,
          projectName: event.projectName,
        }),
      }),
      refreshData: assign({ state: () => State.init }),
      contentLoaded: assign({
        state: () => State.loaded,
      }),
      viewReady: assign({
        viewStatus: () => ViewStatus.ready,
      }),
      viewDestroyed: assign({
        viewStatus: () => ViewStatus.destroyed,
      }),
    },
    guards: {
      loadGraph: (context) => {
        return context.state !== State.loaded;
      },
    },
  }
);

export const graphService = interpret(graphMachine, { execute: false });
