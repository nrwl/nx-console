// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  '@@xstate/typegen': true;
  eventsCausingActions: {
    setProjectName: 'FOCUS' | 'SELECT';
    viewReady: 'VIEW_READY';
    viewDestroyed: 'VIEW_DESTROYED';
    refreshData: 'REFRESH';
    contentLoaded: 'done.invoke.loadingContent';
  };
  internalEvents: {
    'done.invoke.loadingContent': {
      type: 'done.invoke.loadingContent';
      data: unknown;
      __tip: 'See the XState TS docs to learn how to strongly type this.';
    };
    '': { type: '' };
    'xstate.init': { type: 'xstate.init' };
    'error.platform.loadingContent': {
      type: 'error.platform.loadingContent';
      data: unknown;
    };
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
  matchesStates: 'init' | 'content' | 'loading';
  tags: never;
}
