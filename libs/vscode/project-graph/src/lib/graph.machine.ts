import { createMachine, assign, interpret } from 'xstate';
import { MessageType } from './graph-message-type';
import { createProjectGraph } from './create-project-graph';

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
  /** @xstate-layout N4IgpgJg5mDOIC5QAUBOB7AVmAxgFwAIBxVAQwAcALAOgEsA7WvAYiIFEAVAfQGEB5AHIc2QxKHLpYTWunpiQAD0QBmAIwAWagHZVANlWqADFt1bDu9VoA0IAJ6IAtACZNOi+sNOArCYtqtAL4BNmhYuIQkFDQ4snhg9CwASmwAYskAygAS8hJSeDJySIqIXspe1E5lFl66NYaq1naIBgCc1C1e9V5OuspaXqpOgcEgodj4xGRU1DEJ8Sw5ktKy8koIaq56Bsam5pY29ggOqgAc5U566l7qJ6rKlsotQSEY4xFTNAA26KQQDFDMCCyMB0egAN3QAGsQd9fv8eLF5os8gVVo5VG0TroWrcWldOspDOplCcDogToYKicyupKlp1LpDCces9Rq9wpMotRYX96ACwKgMKhqORPqQ8AAzdCoAC23J+vKgCLmCWRy0KoDWx0x2Nx+MMhOJpKaCCchnKWmppT6WnuNyZrLGHMi0wFQtYnF4gmEoiKuXVaPWGm0WyMJjMFkahyc3ipNO8Hi6Mcd7ImLsozBSfB4AFV0mr8isimsvOUsSd1B4rvT+sbDg4qhVLlcTrd1C0cSmwmmPsx0mwADJsHgcAuo4slMu6CtVnyWLx1xyV5RN6rqVQDCv6XRdt6cqjMABqAEk2AB1LjJACCABEAJpjouaxC6XTtBdOFo9Ykxlp3MlHKUlIXBYuguDGGLeLuzq9ie55cDebDpBwiR8HebA3o+GrFAgljUJ0LTmCSBoeLUXgAQ4+haKuljmF+pQnE8rL0OgEBwPITo9lyDBMFhgYYhaeiGHirZaB2LRRo4hIhn4YEnJaEkScMLzdu8XKzHEqp+kshbYSW0l-hogxlJ4xjkSaFyqO+9SMoRlpeHZ0FcdMPL-HxE5HB4VkeIxDTTp+PSLrh1GWmUDnrhuFytk5amuoK0ruc+CCQRUYFKXoDlEtcAEXG0ThWgyBGWho6gxfulCJThDi0uUPl-iYzJftOFHeCcq7dAaGhUU4QRBEAA */
  createMachine(
    {
      context: {
        state: State.init,
        project: undefined,
        viewStatus: ViewStatus.destroyed,
      },
      tsTypes: {} as import('./graph.machine.typegen').Typegen0,
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
      id: 'Project Graph',
      initial: 'init',
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
          always: {
            cond: 'loadGraph',
            target: 'loading',
          },
          on: {
            REFRESH: {
              actions: 'refreshData',
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
        loadingFailed: assign({
          state: () => State.error,
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
