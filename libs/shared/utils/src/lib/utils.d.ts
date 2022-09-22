import type { NxJsonConfiguration, WorkspaceJsonConfiguration } from '@nrwl/devkit';
export declare function getPrimitiveValue(value: any): string | undefined;
export declare function toWorkspaceFormat(w: any): WorkspaceJsonConfiguration & NxJsonConfiguration;
export declare function hasKey<T>(obj: T, key: PropertyKey): key is keyof T;
export declare function formatError(message: string, err: any): string;
