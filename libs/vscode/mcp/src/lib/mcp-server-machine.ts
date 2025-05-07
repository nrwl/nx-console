import { getNxMcpPort } from '@nx-console/vscode-utils';
import { assign, fromPromise, setup } from 'xstate';

export const mcpServerMachine = setup({
  types: {
    context: {} as {
      port: number | undefined;
    },
  },
  actions: {
    getPort: assign(() => {
      return {
        port: getNxMcpPort(),
      };
    }),
    stopMcpServer: () => {
      throw Error('Not implemented - should be overridden.');
    },
  },
  guards: {
    hasPort: ({ context }) => {
      return context.port !== undefined;
    },
  },
  actors: {
    startSkeletonServer: fromPromise(
      async ({
        input,
      }: {
        input: { port: number | undefined };
      }): Promise<void> => {
        throw Error('Not implemented - should be overridden.');
      },
    ),
    enhanceSkeletonServer: fromPromise(async (): Promise<void> => {
      throw Error('Not implemented - should be overridden.');
    }),
  },
}).createMachine({
  id: 'mcpServer',
  initial: 'idle',
  context: {
    port: undefined,
  },
  states: {
    idle: {
      entry: ['getPort'],
      on: {
        START: {
          target: 'skeleton',
          guard: 'hasPort',
        },
      },
    },
    skeleton: {
      invoke: {
        src: 'startSkeletonServer',
        input: ({ context }) => ({ port: context.port }),
        onDone: {
          target: 'skeleton',
        },
      },
      on: {
        ENHANCE: {
          target: 'running',
        },
        STOP: {
          actions: ['stopMcpServer'],
          target: 'idle',
        },
      },
    },
    running: {
      invoke: {
        src: 'enhanceSkeletonServer',
      },
      on: {
        STOP: {
          actions: ['stopMcpServer'],
          target: 'idle',
        },
      },
    },
  },
});
