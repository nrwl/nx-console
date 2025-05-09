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
  }
}

export function getRunningTasks() {
  return Array.from(runningTasks.entries()).map(([processId, task]) => ({
    processId,
    ...task,
  }));
}
