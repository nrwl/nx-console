export enum TaskStatus {
  // Explicit statuses that can come from the task runner
  Success = 'Success',
  Failure = 'Failure',
  Skipped = 'Skipped',
  LocalCacheKeptExisting = 'LocalCacheKeptExisting',
  LocalCache = 'LocalCache',
  RemoteCache = 'RemoteCache',
  NotStarted = 'NotStarted',
  InProgress = 'InProgress',
  Shared = 'Shared',
  Stopped = 'Stopped',
}

export interface UpdatedRunningTask {
  name: string;
  status: TaskStatus;
  output: string;
}
