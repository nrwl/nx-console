import { assign, fromPromise, setup } from 'xstate';

export const nxlsClientStateMachine = setup({
  types: {
    context: {} as {
      workspacePath: string | undefined;
      error: string | undefined;
      nxlsPid: number | undefined;
    },
  },
  actions: {
    assignWorkspacePath: assign(({ context, event }) => ({
      ...context,
      workspacePath: event.value ?? context.workspacePath,
    })),
    assignError: assign(({ context, event }) => ({
      ...context,
      error: event.error,
    })),
    assignNxlsPid: assign(({ context, event }) => ({
      ...context,
      nxlsPid: event.output,
    })),
    sendRefreshNotification: ({ context }) => {
      throw Error('Not implemented - should be overridden.');
    },
  },
  actors: {
    startClient: fromPromise(
      async ({
        input,
      }: {
        input: { workspacePath: string | undefined };
      }): Promise<number | undefined> => {
        throw Error('Not implemented - should be overridden.');
      }
    ),
    stopClient: fromPromise(async (): Promise<void> => {
      throw Error('Not implemented - should be overridden.');
    }),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QDsAeAbWBhdBLMyALgHS4TpgDEAygCoCCASrQNoAMAuoqAA4D2sXIVx9k3EKkQA2AKxtiATgAsMgEwK2UgMwyFU1TIA0IAJ6ItbeTJlL1WgBwXbqnQF9XxtJhz4ipclTUAKK0APoA6gDyjADS1AAK9FhBoYm0ABLsXEgg-ILCouKSCEoAjADsxPa6WmU2CqVKWqrGZiWl8lqNzVpasqpSSkPunhjYeAQksIQAhgBOwshQlBCiYKTIAG58ANbrXuO+U7MLuEsIZ9sAxjMFyFlZ4nlCImI5xR32UsRKbB2lgzYMik9i+rXMqkqkIUwNqDVKFjYWhGIAOPkmxGm80WyzAczmfDmxB46FuADNCQBbYhoiZ+LGnc6XPg3O4PThPAQvQrvaRfYi9GoyLTlJHlcrghCqNj2AWaBr2GGlBT2JQo2lHTEnHE0EIRaJxRLJVL0DKPHLPO5FRDVLQC0oyDoKDSO+ylUqSsqdbouPpqQZqjyosbovxzACuyGQZ2WdEi8XNvC5Vt5CHdwMU5QcUksWeVSklboFqnUJfsqk+MnK9nVIbpJAjUZjurCUViCSSKTSmQ5FuTr2tacFxAqoo62lVZS0nq0CmI2jY0vU5Skgxcte89a1fB4PGbq2Q62Zexpdc10x3e6ZWxZt1e7OySfyA9TBlKxFUjlVA0G1WUUklOxM1XNghi6FUZWRIMNQxC9d2bPECSJElySpU9N3PQhLxjC4b1Ze9OETXJ+x5UBijfD8v1sVclD-JQANMRBpXfcp1FKL49FYiwpA3Q5YKw+ClhbfV2yNLtTR7R9iOfUiJCY1RiF0RVhVBKQs3scoEU9Dp7SaWjpVY8oFHKGR3GgvgIDgcQYKITkZLeMjEAAWgMH4-lAqR3WaTzPwlRiECcmRFGdZ0mhdcoVGdXjQxIMgKDs7kHLkkoFAUqtlHHRpUtYyUuiCnR6gRDShlVaKtwZHEEpTRyEA099VRFGxSgMYy2AUXLF0U5pmv6awpAUMrNUbaMliql8aoRAEBTdWcymqbQ-LaZpZSaUUGhsDjFR46Cz347DRr7ezB1sQD+oFEzNJm-qXFMsygA */
  id: 'nxlsClient',
  initial: 'idle',
  context: {
    workspacePath: undefined,
    error: undefined,
    nxlsPid: undefined,
  },
  states: {
    idle: {
      on: {
        START: {
          target: 'starting',
          actions: ['assignWorkspacePath'],
        },
        SET_WORKSPACE_PATH: {
          actions: ['assignWorkspacePath'],
        },
      },
    },
    starting: {
      invoke: {
        src: 'startClient',
        input: ({ context }) => ({ workspacePath: context.workspacePath }),
        onDone: {
          target: 'running',
          actions: ['assignNxlsPid'],
        },
        onError: {
          target: 'idle',
          actions: ['assignError'],
        },
      },
      on: {
        SET_WORKSPACE_PATH: {
          actions: ['assignWorkspacePath'],
        },
      },
    },
    running: {
      on: {
        STOP: {
          target: 'stopping',
        },
        SET_WORKSPACE_PATH: {
          actions: ['sendRefreshNotification'],
        },
      },
    },
    stopping: {
      invoke: {
        src: 'stopClient',
        onDone: {
          target: 'idle',
          actions: ['assignError'],
        },
        onError: {
          target: 'idle',
          actions: ['assignError'],
        },
      },
      on: {
        SET_WORKSPACE_PATH: {
          actions: ['assignWorkspacePath'],
        },
      },
    },
  },
});
