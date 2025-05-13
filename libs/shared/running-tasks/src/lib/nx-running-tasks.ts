import { TaskStatus, UpdatedRunningTask } from './running-tasks-types';

const runningTasks = new Map<
  number,
  {
    status: TaskStatus;
    tasks: Array<UpdatedRunningTask>;
  }
>();

export function startRunningTasks(taskId: number) {
  const runningTask = runningTasks.get(taskId);
  if (runningTask) {
    runningTask.status = TaskStatus.InProgress;
  } else {
    // clear all previous tasks if a new run has started
    runningTasks.clear();
    runningTasks.set(taskId, {
      status: TaskStatus.InProgress,
      tasks: [],
    });
  }
}

export function setUpdatingRunningTasks(
  taskId: number,
  updatedTasks: Array<UpdatedRunningTask>,
) {
  const runningTask = runningTasks.get(taskId);
  if (runningTask) {
    runningTask.tasks = updatedTasks;
  } else {
    runningTasks.set(taskId, {
      status: TaskStatus.InProgress,
      tasks: updatedTasks,
    });
  }
}

export function endRunningTasks(taskId: number) {
  const runningTask = runningTasks.get(taskId);
  if (runningTask) {
    runningTask.status = TaskStatus.Stopped;
    runningTask.tasks.forEach((task) => {
      // If the task is still in progress, mark it as stopped
      // Nx could have updated other tasks that were completed in the setUpdatingRunningTasks
      if (task.status === TaskStatus.InProgress) {
        task.status = TaskStatus.Stopped;
      }
    });
  }
}

export function getRunningTasks() {
  return Array.from(runningTasks.entries()).map(([processId, task]) => ({
    processId,
    ...task,
  }));
}
