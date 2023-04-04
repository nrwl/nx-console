import { createProjectGraph } from '@nx-console/vscode/nx-workspace';
import { getOutputChannel } from '@nx-console/vscode/utils';
import { assign, createMachine, interpret } from 'xstate';
import { MessageType } from './graph-message-type';

export const enum State {
  init = 'init',
  loading = 'loading',
  loaded = 'loaded',
  error = 'error',
}

export const enum ViewStatus {
  ready = 'ready',
  destroyed = 'destroyed',
}

interface Context {
  state: State;
  project: {
    projectName: string;
    taskName: string | undefined
    type: MessageType;
  } | null;
  error: string | null;
}

export const graphMachine =
  /** @xstate-layout N4IgpgJg5mDOIC5QAUBOB7AVmAxgFwAIBxVAQwAcALAYgCUBRAMQYGUAJAbQAYBdRUculgBLPMPQA7fiAAeiAKwB2ADQgAnogCMADgBsAOgCcAFkObjigMzGATEs2GAvo9VosuQiQo1ktAPIAUvQAwgAqAPos9AAyIaH0ACLcfEgggiJiktJyCLq6Nvq6mlx2XJbWNrqWhqoaCNrG2vpcio02lvLahkqGNs6uGNj4xGRU1AByfuG+gXHJ0umi4lKpOUq1iNaW+jba2h02xbpcJrr9IG5DnqM0RPQRwX7j8c-zqYuZK6BrKuqIxvl9PJLFxQfIbIZFPsuJpzpcPCNvPocJI8GAJHhqAA1ACS9AA6uEGABBBIATTeAiESyyq0Qila+gBlnM8kMlkUJhsGwQAMMQMUukUxU0NhOYsscMGCK8VGRqPRmMpaWpn2y-0U8iBDkUNgZvXKOh5nW2lWMxjZhmOXGZUvcw1llH0ABt0KQIMIJFBqBBJGB9J6AG7oADW-td7s9UGCCoxyo+y3VvM0Wo5JRTvWBhj0vzq+X5NmMZUspSU4O0dquiLlEY9XuoYFQGFQ+nIztIeAAZuhUABbF1uuvR2N4eOqxN05MGYUnBwdErCnm6gog1ryAFCi12Ssym76QPCMAAd1oYHdamxeMJCXoLFC-jJiTHGQn3y0LX5FnNhz1el6PL5AUhRFMVehtZwXBACR0AgOBpHhB0bgWcdaTfBAaj+BAAFoDFBUEi20D89WFWFIIQ64kU9URkJfVDZC0TogVsU5LCqEFjA5HltE0JluPyLoOXNYxNDOMjpUQpEUQxRUaJpL56NyCF9E0KErAcAE9m4gCAQFNc7EhQxukqHcJJrQco1ktVJ3WTD5F0LVNA5QjuihEsVJMii5UbZtLNfBT82U1SWVOTTNCXMVChaEF5B0c0YuMDzqydaDwnIcS8F8uiclsLh9DTQ42Tsaocx5LZ9ChUULCKcwxXNRLHX3Q8TzPCA6ipWj5JydljGUww8N1bRBQ5DC6nNAwlD0tlOSM0SBntTynQPY8EjgPAMDUSBMs6rQ9X5JRv3nIoIVzf4Is6MV9j2TUOmBCDHCAA */
  createMachine(
    {
      predictableActionArguments: true,
      context: { state: State.init, project: null, error: null },
      tsTypes: {} as import('./graph.machine.typegen').Typegen0,
      schema: {
        context: {} as Context,
        services: {} as {
          generateContent: {
            data: string | void;
          };
        },
        events: {} as
          | { type: 'GET_CONTENT' }
          | { type: 'REFRESH' }
          | { type: 'NO_PROJECT' }
          | {
              type: 'PROJECT_SELECTED';
              data: { projectName: string; taskName: string | undefined; type: MessageType };
            }
          | { type: 'VIEW_READY' }
          | { type: 'VIEW_DESTROYED' }
          | { type: 'error.platform.loadingContent'; data: string },
      },
      id: 'Project Graph',
      initial: 'init',
      on: {
        REFRESH: {
          actions: ['log', 'refreshData'],
          target: '.content',
        },
        PROJECT_SELECTED: {
          actions: ['log', 'projectSelected'],
        },
        NO_PROJECT: {
          target: '.no_project',
        },
        GET_CONTENT: {
          target: '.content',
        },
      },
      states: {
        init: {
          entry: 'log',
        },
        content: {
          entry: 'log',
          always: {
            cond: 'loadGraph',
            target: 'loading',
          },
          on: {
            VIEW_READY: {
              target: 'viewReady',
            },
          },
        },
        loading: {
          entry: ['loadingStarted', 'log'],
          invoke: {
            src: 'generateContent',
            id: 'loadingContent',
            onDone: [
              {
                actions: 'contentLoaded',
                target: 'content',
              },
            ],
            onError: [
              {
                actions: 'loadingFailed',
                target: 'error',
              },
            ],
          },
        },
        error: {
          entry: 'log',
        },
        no_project: {},
        viewReady: {
          entry: 'log',
          on: {
            VIEW_DESTROYED: {
              target: 'viewDestroyed',
            },
          },
        },
        viewDestroyed: {
          entry: ['log', 'refreshData', 'clearProject'],
        },
      },
    },
    {
      services: {
        generateContent: async () => {
          return await createProjectGraph();
        },
      },
      actions: {
        log: (context, event) => {
          getOutputChannel().appendLine(
            `Graph Machine - ${JSON.stringify(event)}, ${JSON.stringify(
              context
            )}`
          );
        },
        refreshData: assign((context, event) => {
          return {
            state: State.init,
          };
        }),
        contentLoaded: assign((context, event) => {
          return {
            state: State.loaded,
            error: null,
          };
        }),
        loadingFailed: assign((context, { data }) => {
          return {
            state: State.error,
            error: data,
          };
        }),
        loadingStarted: assign((context, event) => {
          return {
            state: State.loading,
          };
        }),
        clearProject: assign((context, event) => {
          return {
            project: null,
          };
        }),
        projectSelected: assign((context, { data }) => {
          return {
            project: {
              projectName: data.projectName,
              taskName: data.taskName,
              type: data.type,
            },
          };
        }),
      },
      guards: {
        loadGraph: (context) => {
          getOutputChannel().appendLine(`Graph guard - ${context.state}`);
          return context.state !== State.loaded;
        },
      },
    }
  );

export const graphService = interpret(graphMachine, {
  execute: false,
});
