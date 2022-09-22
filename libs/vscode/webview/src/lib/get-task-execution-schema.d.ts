import { GeneratorType, TaskExecutionSchema } from '@nx-console/shared/schema';
import { Uri } from 'vscode';
import { CliTaskProvider } from '@nx-console/vscode/tasks';
export declare function getTaskExecutionSchema(cliTaskProvider: CliTaskProvider, command?: string, contextMenuUri?: Uri, generatorType?: GeneratorType, incomingGenerator?: string): Promise<TaskExecutionSchema | void>;
