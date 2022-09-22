export declare function resolveDependencyVersioning(depInput: string): Promise<{
    dep: string;
    version: string | undefined;
} | undefined>;
