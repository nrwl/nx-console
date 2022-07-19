// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  '@@xstate/typegen': true;
  eventsCausingActions: {
    refreshData: 'REFRESH';
    projectSelected: 'PROJECT_SELECTED';
    contentLoaded: 'done.invoke.loadingContent';
    loadingFailed: 'error.platform.loadingContent';
  };
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
    '': { type: '' };
    'xstate.init': { type: 'xstate.init' };
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
    | 'viewReady'
    | 'viewDestroyed';
  tags: never;
}
