import { PosixFS } from '@yarnpkg/fslib';
export declare const crossFs: PosixFS;
export declare const files: {
    [path: string]: string[];
};
export declare const fileContents: {
    [path: string]: any;
};
export declare function readAndParseJson(filePath: string): Promise<any>;
export declare function clearJsonCache(filePath: string, basedir?: string): boolean;
export declare function readAndCacheJsonFile(filePath: string | undefined, basedir?: string): Promise<{
    path: string;
    json: any;
}>;
/**
 * Caches already created json contents to a file path
 */
export declare function cacheJson(filePath: string, basedir?: string, content?: any): {
    json: any;
    path: string;
};
