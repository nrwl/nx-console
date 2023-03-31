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
    type: MessageType;
  } | null;
  error: string | null;
}

export const graphMachine =
  /** @xstate-layout N4IgpgJg5mDOIC5QAUBOB7AVmAxgFwAIBxVAQwAcALAOgEsA7WvAYiIFEAVAfQGEB5AHIc2QxKHLpYTWunpiQAD0QAOAJwAmagEYA7FuXrDW9coDMO5QBoQAT0S7V1AKwAGNy9Uud6natNOAXwDrNCxcQhIKGhxZPDB6FgA1AEk2AHUuACU2AEEAEQBNeQkpPBk5JEVEVQAWTTrVADYnGtdlF3V-azsEVW9ndx91fVN2mqCQjGx8YjIqahiE+JZiyWlZeSUENU1dfUNhk3MrW0R1Jup3F30tVqdlHQmQUOmIuZoAG3RSCAYoZggsjAdHoADd0ABrYFfH5-HixZarUrlTaIVo6ajmVwuUznVRaPqNbpoxqabEdRqmPz3LQucbBZ5TcKzKLUGG-ej-MCoDCoajkD6kPAAM3QqAAtmzvhyoPClgkkesKqAtujMTpsbjVPjCcSEI1jNRtcbdE51G57k8XszIvNubzWJxeIJhKJKiUlajthptHoDEYjhY9ZTNFcPF4fH56ZMwjNbTRQbQwAB3TJgH42ZgpdJcPJsADKHEyfAKbDyirKG0qqqcGKxbi1Op0RNOCAsGLDLgMNV8fitTLj72oiZTeTgeAwNkgju4-CEIg4FZR1ZUPr2-sOZiDrfblzD3d7pn7sbeUWY2QAYtl8wAJJdVlWIWt6zx7q4G5RObVORrH14sqhmGQYsACk2B4bh8zYAAZcDhHLd01krZUqgQH8tGoYYamUbDGlUB4mlMPVaUaRpqDMUxzGw7DOjwoIGXodAIDgeRrUHVkGCYe8UK2HRTDIrQf2GcwuwMFseluZQBkGFwDW1T91D-G0h0WOIFUQ5EH1QrRaSkmoNFuGoDTpUxZL1VoXGkikqX8ZRaWjRkTwAz5pT+bivWfVszUs418KaTw3D4pT2LtHkxXclc2w6agakopx4vaDQhmDa432uTo9G1LRgtPeYR1TdMIB6cQkOXR8EBMMj-Gpfx4uGJx+JfdQnHIyj+K0ZpDMaBy2NyhMk2TMdYAndApwgCLysaPjqD0Ls+k8Jojj1TKjWNHDcWUOydJy5yJtQyjg3ogIgA */
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
              data: { projectName: string; type: MessageType };
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
