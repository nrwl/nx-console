// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  '@@xstate/typegen': true;
  internalEvents: {
    'done.invoke.loadingContent': {
      type: 'done.invoke.loadingContent';
      data: unknown;
      __tip: 'See the XState TS docs to learn how to strongly type this.';
    };
    'error.platform.loadingContent': {
      type: 'error.platform.loadingContent';
      data: unknown;
    };
    'xstate.init': { type: 'xstate.init' };
    '': { type: '' };
  };
  invokeSrcNameMap: {
    generateContent: 'done.invoke.loadingContent';
  };
  missingImplementations: {
    actions: never;
    services: never;
    guards: never;
    delays: never;
  };
  eventsCausingActions: {
    refreshData: 'REFRESH' | 'VIEW_DESTROYED';
    projectSelected: 'PROJECT_SELECTED';
    contentLoaded: 'done.invoke.loadingContent';
    loadingFailed: 'error.platform.loadingContent';
    log:
      | 'xstate.init'
      | 'REFRESH'
      | 'GET_CONTENT'
      | 'done.invoke.loadingContent'
      | ''
      | 'error.platform.loadingContent'
      | 'VIEW_READY'
      | 'VIEW_DESTROYED';
    clearProject: 'VIEW_DESTROYED';
  };
  eventsCausingServices: {
    generateContent: '';
  };
  eventsCausingGuards: {
    loadGraph: '';
  };
  eventsCausingDelays: {};
  matchesStates:
    | 'init'
    | 'content'
    | 'loading'
    | 'error'
    | 'no_project'
    | 'viewReady'
    | 'viewDestroyed';
  tags: never;
}
