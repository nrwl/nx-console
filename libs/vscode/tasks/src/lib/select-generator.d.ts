import { GeneratorType, Option, TaskExecutionSchema } from '@nx-console/shared/schema';
export declare function getGeneratorOptions(workspacePath: string, collectionName: string, generatorName: string, generatorPath: string, workspaceType: 'ng' | 'nx'): Promise<Option[]>;
export declare function selectGenerator(workspacePath: string, workspaceType: 'nx' | 'ng', generatorType?: GeneratorType, generator?: {
    collection: string;
    name: string;
}): Promise<TaskExecutionSchema | undefined>;
