import { TaskStatus, UpdatedRunningTask } from './running-tasks-types';

export type RunningTasksMap = Record<
  string,
  UpdatedRunningTask & { connectionId: string; overallRunStatus: TaskStatus }
>;
const runningTasksByTaskId: RunningTasksMap = {};
export function startRunningTasks(_connectionId: string, _processId: number) {
  // empty for now
}

export function setUpdatingRunningTasks(
  connectionId: string,
  updatedTasks: Array<UpdatedRunningTask>,
) {
  for (const task of updatedTasks) {
    const currentlyRunningTask = runningTasksByTaskId[task.name];
    if (currentlyRunningTask) {
      currentlyRunningTask.status = task.status;
      currentlyRunningTask.output = task.output;
    } else {
      const newRunningTask = {
        ...task,
        connectionId,
        overallRunStatus: TaskStatus.InProgress,
      };
      runningTasksByTaskId[task.name] = newRunningTask;
    }
  }
}

export function endRunningTasks(connectionId: string) {
  for (const task of Object.values(runningTasksByTaskId)) {
    if (task.connectionId === connectionId) {
      task.overallRunStatus = TaskStatus.Stopped;
      // If the task is still in progress, mark it as stopped
      // Nx could have updated other tasks that were completed in the setUpdatingRunningTasks
      if (task.status === TaskStatus.InProgress) {
        task.status = TaskStatus.Stopped;
      }
    }
  }
}

export function getRunningTasksMap(): RunningTasksMap {
  return runningTasksByTaskId;
}
