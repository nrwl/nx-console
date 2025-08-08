import type {
  RunningTasksMap,
  TaskStatus,
  UpdatedRunningTask,
} from '@nx-console/shared-running-tasks';

export type IdeCallbackMessage =
  | FocusProjectMessage
  | FocusTaskMessage
  | FullProjectGraphMessage;

export type FocusProjectMessage = {
  type: 'focus-project';
  payload: {
    projectName: string;
  };
};

export type FocusTaskMessage = {
  type: 'focus-task';
  payload: {
    projectName: string;
    taskName: string;
  };
};

export type FullProjectGraphMessage = {
  type: 'full-project-graph';
};

/**
 * JSON-RPC types for IDE communication
 */

export type IdeType = 'vscode' | 'cursor' | 'windsurf';

/**
 * Request to focus on a specific project in the IDE
 */
export interface FocusProjectRequest {
  projectName: string;
}

/**
 * Request to focus on a specific task in the IDE
 */
export interface FocusTaskRequest {
  projectName: string;
  taskName: string;
}

/**
 * Request to show the full project graph in the IDE
 */
export type ShowFullProjectGraphRequest = Record<string, never>;

/**
 * Request to open the generator UI in the IDE
 */
export interface OpenGenerateUiRequest {
  generatorName: string;
  options: Record<string, unknown>;
  cwd?: string;
}

/**
 * Response from opening the generator UI
 */
export interface OpenGenerateUiResponse {
  logFileName: string;
}

export interface GetRunningTasksResponse {
  runningTasks: RunningTasksMap;
}

/**
 * JSON-RPC method names for IDE communication
 */
export const IDE_RPC_METHODS = {
  FOCUS_PROJECT: 'ide/focusProject',
  FOCUS_TASK: 'ide/focusTask',
  SHOW_FULL_PROJECT_GRAPH: 'ide/showFullProjectGraph',
  OPEN_GENERATE_UI: 'ide/openGenerateUi',
  GET_RUNNING_TASKS: 'ide/getRunningTasks',
} as const;

/**
 * Connection status for the IDE client
 */
export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

/**
 * Interface for IDE JSON-RPC client
 */
export interface IIdeJsonRpcClient {
  connect(): Promise<void>;
  disconnect(): void;
  getStatus(): ConnectionStatus;
  focusProject(projectName: string): Promise<void>;
  focusTask(projectName: string, taskName: string): Promise<void>;
  showFullProjectGraph(): Promise<void>;
  openGenerateUi(
    generatorName: string,
    options: Record<string, unknown>,
    cwd?: string,
  ): Promise<string>;
  getRunningTasks(): Promise<RunningTasksMap>;
  sendNotification(method: string, params?: unknown): Promise<void>;
}
