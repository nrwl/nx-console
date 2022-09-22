export declare function forEachAncestorDirectory(directory: string, callback: (directory: string) => Promise<string | undefined>): Promise<string | undefined>;
export declare function findConfig(searchPath: string, configName: string): Promise<string | undefined>;
