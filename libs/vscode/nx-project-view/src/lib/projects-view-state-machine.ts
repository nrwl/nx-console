import type { NxError, NxWorkspace } from '@nx-console/shared-types';
import { assign, enqueueActions, fromPromise, setup } from 'xstate';

export type ProjectsViewState =
  | 'loading'
  | 'init-failed'
  | 'no-workspace'
  | 'no-dependencies'
  | 'errors'
  | 'no-projects'
  | 'ready';

export type WorkspaceLoadResult = {
  workspace: NxWorkspace | undefined;
  hasDependencies: boolean;
};

export const projectsViewMachine = setup({
  types: {
    context: {} as {
      nxlsError?: string;
      workspaceErrors?: NxError[];
      hasPartialErrors: boolean;
    },
  },
  actors: {
    waitForNxls: fromPromise(async () => {
      return;
    }),
    loadWorkspaceData: fromPromise(async (): Promise<WorkspaceLoadResult> => {
      return { workspace: undefined, hasDependencies: true };
    }),
  },
  actions: {
    setViewContext: (_: unknown, params: { state: ProjectsViewState }) => {
      // placeholder - will be provided by consumer
    },
    refreshTreeView: () => {
      // placeholder - will be provided by consumer
    },
    assignNxlsError: assign(({ event }) => ({
      nxlsError: (event as { error?: string }).error,
      workspaceErrors: undefined,
      hasPartialErrors: false,
    })),
    assignWorkspaceData: assign(({ event }) => {
      const workspace = (event as { output?: WorkspaceLoadResult }).output
        ?.workspace;
      return {
        workspaceErrors: workspace?.errors,
        hasPartialErrors:
          (workspace?.errors?.length ?? 0) > 0 &&
          Object.keys(workspace?.projectGraph?.nodes ?? {}).length > 0,
      };
    }),
    transitionConditionally: enqueueActions(({ context, event, enqueue }) => {
      const result = (event as { output?: WorkspaceLoadResult }).output;
      const workspace = result?.workspace;

      if (!workspace) {
        enqueue.raise({ type: 'NO_WORKSPACE' });
        return;
      }

      const projectCount = Object.keys(
        workspace.projectGraph?.nodes ?? {},
      ).length;
      const hasErrors = (workspace.errors?.length ?? 0) > 0;

      if (hasErrors && projectCount === 0) {
        enqueue.raise({ type: 'ERRORS_ONLY' });
        return;
      }

      if (projectCount === 0 && !result?.hasDependencies) {
        enqueue.raise({ type: 'NO_DEPENDENCIES' });
        return;
      }

      if (projectCount === 0) {
        enqueue.raise({ type: 'NO_PROJECTS' });
        return;
      }

      enqueue.raise({ type: 'READY' });
    }),
  },
}).createMachine({
  id: 'projectsView',
  initial: 'loading',
  context: {
    nxlsError: undefined,
    workspaceErrors: undefined,
    hasPartialErrors: false,
  },
  states: {
    loading: {
      entry: { type: 'setViewContext', params: { state: 'loading' } },
      invoke: {
        src: 'waitForNxls',
        onDone: 'fetchingWorkspace',
        onError: {
          target: 'initFailed',
          actions: 'assignNxlsError',
        },
      },
    },
    fetchingWorkspace: {
      invoke: {
        src: 'loadWorkspaceData',
        onDone: {
          actions: ['assignWorkspaceData', 'transitionConditionally'],
        },
        onError: {
          target: 'noWorkspace',
        },
      },
    },
    initFailed: {
      entry: { type: 'setViewContext', params: { state: 'init-failed' } },
      on: {
        REFRESH: 'loading',
      },
    },
    noWorkspace: {
      entry: { type: 'setViewContext', params: { state: 'no-workspace' } },
      on: {
        REFRESH: 'loading',
      },
    },
    noDependencies: {
      entry: {
        type: 'setViewContext',
        params: { state: 'no-dependencies' },
      },
      on: {
        REFRESH: 'loading',
      },
    },
    errors: {
      entry: { type: 'setViewContext', params: { state: 'errors' } },
      initial: 'idle',
      states: {
        idle: {},
        refreshing: {
          invoke: {
            src: 'loadWorkspaceData',
            onDone: {
              actions: ['assignWorkspaceData', 'transitionConditionally'],
            },
          },
        },
      },
      on: {
        REFRESH: '.refreshing',
      },
    },
    noProjects: {
      entry: { type: 'setViewContext', params: { state: 'no-projects' } },
      initial: 'idle',
      states: {
        idle: {},
        refreshing: {
          invoke: {
            src: 'loadWorkspaceData',
            onDone: {
              actions: ['assignWorkspaceData', 'transitionConditionally'],
            },
          },
        },
      },
      on: {
        REFRESH: '.refreshing',
      },
    },
    ready: {
      entry: [
        { type: 'setViewContext', params: { state: 'ready' } },
        'refreshTreeView',
      ],
      initial: 'idle',
      states: {
        idle: {},
        refreshing: {
          invoke: {
            src: 'loadWorkspaceData',
            onDone: {
              actions: [
                'assignWorkspaceData',
                enqueueActions(({ context, event, enqueue }) => {
                  const result = (event as { output?: WorkspaceLoadResult })
                    .output;
                  const workspace = result?.workspace;
                  const projectCount = Object.keys(
                    workspace?.projectGraph?.nodes ?? {},
                  ).length;
                  const hasErrors = (workspace?.errors?.length ?? 0) > 0;

                  if (!workspace) {
                    enqueue.raise({ type: 'NO_WORKSPACE' });
                    return;
                  }

                  if (hasErrors && projectCount === 0) {
                    enqueue.raise({ type: 'ERRORS_ONLY' });
                    return;
                  }

                  if (projectCount === 0 && !result?.hasDependencies) {
                    enqueue.raise({ type: 'NO_DEPENDENCIES' });
                    return;
                  }

                  if (projectCount === 0) {
                    enqueue.raise({ type: 'NO_PROJECTS' });
                    return;
                  }

                  enqueue({ type: 'refreshTreeView' });
                }),
              ],
            },
          },
        },
      },
      on: {
        REFRESH: '.refreshing',
      },
    },
  },
  on: {
    NO_WORKSPACE: '.noWorkspace',
    NO_DEPENDENCIES: '.noDependencies',
    ERRORS_ONLY: '.errors',
    NO_PROJECTS: '.noProjects',
    READY: '.ready',
  },
});
