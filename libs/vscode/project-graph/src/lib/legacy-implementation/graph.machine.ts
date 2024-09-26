import { createProjectGraph } from '@nx-console/vscode/nx-workspace';
import { getOutputChannel } from '@nx-console/vscode/output-channels';
import {
  assign,
  createActor,
  createMachine,
  fromPromise,
  interpret,
  setup,
} from 'xstate';
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
    taskName: string | undefined;
    type: MessageType;
  } | null;
  error: string | null;
}

export const graphMachine =
  /** @xstate-layout N4IgpgJg5mDOIC5QAUBOB7AVmAxgFwAIBxVAQwAcALAYgCUBRAMQYGUAJAbQAYBdRUculgBLPMPQA7fiAAeiAKwB2ADQgAnogCMADgBsAOgCcAFkObjigMzGATEs2GAvo9VosuQiQo1ktAPIAUvQAwgAqAPos9AAyIaH0ACLcfEgggiJiktJyCLq6Nvq6mlx2XJbWNrqWhqoaCNrG2vpcio02lvLahkqGNs6uGNj4xGRU1AByfuG+gXHJ0umi4lKpOUq1iNaW+jba2h02xbpcJrr9IG5DnqOU+jiSeGASeNQAagCS9ADq4QwAggkAJrzVKLTIrUA5RStfTGKrmeSGSyKEw2DYIOGGfRKXSKYqaGwnQmWc6XDwjbx3B5PF4ggRCJZZVaICzybEORQ2aG9co6dGdbaVYzGRGGY5cOEklwXQbkrxUfTkVBgcikZXRdCkCDCCRQah0tIM8HZRBcdFcUmy4by24AG012t11AgkjA+h1ADd0ABrN32rU6qDBanPA1g5YmjGaNnIkrR3ryap6FTqRD5LE2YxlSylJTyXaW9zWm76f2OvVgVAYVCK22kPAAM3QqAAtqWHYHg88aWGjRHmVGDHiTg4OiU8ejOQVLC0RXDcSK7IWrhSFR7hGAAO60MBatRvT4-BL0FihfyAxK9jL9yFaFpYizCw5cvS9dGY7GKXH4wm9CXOaUJHQCA4GkMli28BY+yZW8EAAWkadE4O0RR9BzGwzEsPZtGjL9FGXOUSx1UQoOvGDZE2EpsQaKwUMaTQqm0dFdlhEoJTMeQHE0coygIiCFXubtnlIxkIQo3IMP0TRFBQywHDhbDNHfOFP1afNERRbpKj465KSVFU1TADUA11ETjQHM1UwQExjGaVptHaTpuhRPppXA3SFTLQMzJvcT1is+RdDZbiZJOJR9kOfC3KtDzbkrasfPInJ0ykmSrHk3RFMnQlChaGdOIaEVzB01dbiA8IlSLPBErEnJbC4NDFDjRE7CTXF0S2fQZIJCwinMQlhRKm19HXLcdz3GrIyRWyHC4ObORQqoUWUgwlDUuxDE0-MzmiqrSpGjdNwSOA8AwNRIEmgcCRRT8nzHIoMJTOp6uowl9j2RRE3kRMAMcIA */
  createMachine({
    context: { state: State.init, project: null, error: null },
    types: {
      context: {} as Context,
      events: {} as
        | { type: 'GET_CONTENT' }
        | { type: 'REFRESH' }
        | { type: 'NO_PROJECT' }
        | {
            type: 'PROJECT_SELECTED';
            data: {
              projectName: string;
              taskName: string | undefined;
              type: MessageType;
            };
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
        target: '.prepareLoading',
      },

      NO_PROJECT: {
        target: '.no_project',
      },
    },
    states: {
      init: {
        entry: 'log',
      },
      content: {
        entry: 'log',
        always: {
          guard: 'loadGraph',
          target: 'loading',
        },
        on: {
          VIEW_READY: {
            target: 'viewReady',
          },
        },
      },
      prepareLoading: {
        always: 'loading',
      },
      loading: {
        entry: ['loadingStarted', 'log'],
        invoke: {
          src: 'generateContent',
          input: ({ context, event }) => ({
            messageType: context?.project?.type,
          }),
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
  }).provide({
    actors: {
      generateContent: fromPromise(
        async ({ input }: { input: { messageType: string } }) => {
          const showAffected =
            input.messageType === MessageType.affectedProjects;
          return await createProjectGraph(showAffected);
        }
      ),
    },
    actions: {
      log: (context, event) => {
        getOutputChannel().appendLine(
          `Graph Machine - ${JSON.stringify(event)}, ${JSON.stringify(context)}`
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
      loadingFailed: assign(({ context, event }) => {
        if (event.type !== 'error.platform.loadingContent') {
          return context;
        }
        return {
          state: State.error,
          error: event.data,
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
      projectSelected: assign(({ context, event }) => {
        if (event.type !== 'PROJECT_SELECTED') {
          return context;
        }
        return {
          project: {
            projectName: event.data.projectName,
            taskName: event.data.taskName,
            type: event.data.type,
          },
        };
      }),
    },
    guards: {
      loadGraph: ({ context }) => {
        getOutputChannel().appendLine(`Graph guard - ${context.state}`);
        return context.state !== State.loaded;
      },
    },
  });

export const graphService = createActor(graphMachine);
