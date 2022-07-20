import { assign, createMachine, interpret } from 'xstate';
import { createProjectGraph } from './create-project-graph';
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

export const graphMachine =
  /** @xstate-layout N4IgpgJg5mDOIC5QAUBOB7AVmAxgFwAIBxVAQwAcALAOgEsA7WvAYiIFEAVAfQGEB5AHIc2QxKHLpYTWunpiQAD0QAOAKwAGagHYALACY9AZgCcOw4f16dAGhABPRAEZVq6sffGAbMr2OtWr0cAXyDbNCxcQhIKGhxZPDB6FgA1AEk2AHUuACU2AEEAEQBNeQkpPBk5JEVEY3VDanVVHS0DQ3V1XU9jWwcELWbGjsdDVT1PEeU-ELCMbHxiMipqOKTEllLJaVl5JQQ1TV0203NLG3tEK1cdD2Umw0c6z2aZkHD5qKWaABt0UggGFBmBBZGA6PQAG7oADWYN+-0BPHi6025Uqu0QOh0ymoqhMnUMunMjh8vUxzmoN3cnhMFk8elanle70iixi1HhAPoQLAqAwqGo5G+pDwADN0KgALYcv5cqBItZJVHbKqgPZYnF4upaQlmB6ki4IZqOIYdYwjVTKOrqZTMuas6LLXn81icXiCYSiaplFUY-YabSWEx6s5ko2eTQaDp6dTeTwTbF2iILR00CG0MAAd2yYH+dmYaUyXAKbAAyhxsnwimwCsqKjtqursbj8Tqifq9GH6cZcR1Oi0JvTnEmPmzlumswU4HgMHZIK7uPwhCIOHX0Y2VAGjkYThYDOc+t3ex1dFpB74maE3vaU19mLkAGK5UsACTXDbViFUWjDdTcHmMVRHF8HQNFUEcHTvZBKwAKTYHhuFLNgABl4OEWtvS2etVRqI1RmoQxPFaR4rUcHRPFAsNlAsU16lUIj-CaLQQiveh0AgOB5BZW92QYJh3xwvYdRNbcAiaBkLEMMMyJ7ADzX8MYrGoiCeOWVYEiVTC0Q-XDHFjTw3EJFwdE6KN4zDfQcQAxxvEeM9jFtK9uM+dlOUBAS-W-CyBm0KNFN0BzwKcm8XKdPkJQ8jcEG6E0HKaGzjFGCivDDYzKQ8fwHkAwwVNCtMM2zXMID6cQsPXT8EAZTRfHUYw9G-Xw9DUTww10TR43jLQyO6ZQaUvWZkzy6gJ0zKdYBndA5wgSKKvjdqurqy16RpdRHC7Ixj1q6jHiaepcrHSgZtw8xUv-OTzt6ligiAA */
  createMachine(
    {
      context: { state: State.init, project: null },
      tsTypes: {} as import('./graph.machine.typegen').Typegen0,
      schema: {
        context: {} as {
          state: State;
          project: {
            type: MessageType;
            projectName: string;
          } | null;
        },
        services: {} as {
          generateContent: {
            data: void;
          };
        },
        events: {} as
          | { type: 'GET_CONTENT' }
          | { type: 'REFRESH' }
          | {
              type: 'PROJECT_SELECTED';
              data: { projectName: string; type: MessageType };
            }
          | { type: 'VIEW_READY' }
          | { type: 'VIEW_DESTROYED' },
      },
      id: 'Project Graph',
      initial: 'init',
      on: {
        REFRESH: {
          actions: 'refreshData',
          target: 'content',
        },
        PROJECT_SELECTED: {
          actions: 'projectSelected',
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
          entry: assign({ state: State.loading }),
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
          on: {
            GET_CONTENT: {
              target: 'content',
            },
          },
        },
        viewReady: {
          on: {
            VIEW_DESTROYED: {
              target: 'viewDestroyed',
            },
          },
        },
        viewDestroyed: {
          entry: ['refreshData', 'clearProject'],
          on: {
            GET_CONTENT: {
              target: 'content',
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
        refreshData: assign({ state: () => State.init }),
        contentLoaded: assign({
          state: () => State.loaded,
        }),
        loadingFailed: assign({
          state: () => State.error,
        }),
        clearProject: assign({
          project: (_) => null,
        }),
        projectSelected: assign({
          project: (context, { data }) => ({
            projectName: data.projectName,
            type: data.type,
          }),
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
