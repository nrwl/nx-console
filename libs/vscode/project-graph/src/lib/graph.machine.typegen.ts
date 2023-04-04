
  // This file was automatically generated. Edits will be overwritten

  export interface Typegen0 {
        '@@xstate/typegen': true;
        internalEvents: {
          "": { type: "" };
"done.invoke.loadingContent": { type: "done.invoke.loadingContent"; data: unknown; __tip: "See the XState TS docs to learn how to strongly type this." };
"error.platform.loadingContent": { type: "error.platform.loadingContent"; data: unknown };
"xstate.init": { type: "xstate.init" };
        };
        invokeSrcNameMap: {
          "generateContent": "done.invoke.loadingContent";
        };
        missingImplementations: {
          actions: never;
          delays: never;
          guards: never;
          services: never;
        };
        eventsCausingActions: {
          "clearProject": "VIEW_DESTROYED";
"contentLoaded": "done.invoke.loadingContent";
"loadingFailed": "error.platform.loadingContent";
"loadingStarted": "";
"log": "" | "GET_CONTENT" | "PROJECT_SELECTED" | "REFRESH" | "VIEW_DESTROYED" | "VIEW_READY" | "done.invoke.loadingContent" | "error.platform.loadingContent" | "xstate.init";
"projectSelected": "PROJECT_SELECTED";
"refreshData": "REFRESH" | "VIEW_DESTROYED";
        };
        eventsCausingDelays: {
          
        };
        eventsCausingGuards: {
          "loadGraph": "";
        };
        eventsCausingServices: {
          "generateContent": "";
        };
        matchesStates: "content" | "error" | "init" | "loading" | "no_project" | "viewDestroyed" | "viewReady";
        tags: never;
      }
  