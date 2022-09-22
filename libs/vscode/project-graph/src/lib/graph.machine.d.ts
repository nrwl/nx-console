import { MessageType } from './graph-message-type';
export declare const enum State {
    init = "init",
    loading = "loading",
    loaded = "loaded",
    error = "error"
}
export declare const enum ViewStatus {
    ready = "ready",
    destroyed = "destroyed"
}
interface Context {
    state: State;
    project: {
        projectName: string;
        type: MessageType;
    } | null;
}
export declare const graphMachine: import("xstate").StateMachine<Context, any, {
    type: 'GET_CONTENT';
} | {
    type: 'REFRESH';
} | {
    type: 'NO_PROJECT';
} | {
    type: 'PROJECT_SELECTED';
    data: {
        projectName: string;
        type: MessageType;
    };
} | {
    type: 'VIEW_READY';
} | {
    type: 'VIEW_DESTROYED';
}, {
    value: any;
    context: Context;
}, import("xstate").BaseActionObject, {
    generateContent: {
        data: void;
    };
}, import("xstate").ResolveTypegenMeta<import("./graph.machine.typegen").Typegen0, {
    type: 'GET_CONTENT';
} | {
    type: 'REFRESH';
} | {
    type: 'NO_PROJECT';
} | {
    type: 'PROJECT_SELECTED';
    data: {
        projectName: string;
        type: MessageType;
    };
} | {
    type: 'VIEW_READY';
} | {
    type: 'VIEW_DESTROYED';
}, import("xstate").BaseActionObject, {
    generateContent: {
        data: void;
    };
}>>;
export declare const graphService: import("xstate").Interpreter<Context, any, {
    type: 'GET_CONTENT';
} | {
    type: 'REFRESH';
} | {
    type: 'NO_PROJECT';
} | {
    type: 'PROJECT_SELECTED';
    data: {
        projectName: string;
        type: MessageType;
    };
} | {
    type: 'VIEW_READY';
} | {
    type: 'VIEW_DESTROYED';
}, {
    value: any;
    context: Context;
}, import("xstate").ResolveTypegenMeta<import("./graph.machine.typegen").Typegen0, {
    type: 'GET_CONTENT';
} | {
    type: 'REFRESH';
} | {
    type: 'NO_PROJECT';
} | {
    type: 'PROJECT_SELECTED';
    data: {
        projectName: string;
        type: MessageType;
    };
} | {
    type: 'VIEW_READY';
} | {
    type: 'VIEW_DESTROYED';
}, import("xstate").BaseActionObject, {
    generateContent: {
        data: void;
    };
}>>;
export {};
