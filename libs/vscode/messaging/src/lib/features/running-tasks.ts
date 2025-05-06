import { NotificationType } from 'vscode-jsonrpc';
import { MessagingNotification } from '../messaging-notification';

enum TaskStatus {
  // Explicit statuses that can come from the task runner
  Success,
  Failure,
  Skipped,
  LocalCacheKeptExisting,
  LocalCache,
  RemoteCache,
  NotStarted,
  InProgress,
  Shared,
  Stopped,
}

interface UpdatedRunningTask {
  name: string;
  status: TaskStatus;
  output: string;
}

export const NxStartedRunningTasks: MessagingNotification<number> = {
  type: new NotificationType('nx/startedRunningTasks'),
  handler: (count) => {
    console.log('Started running tasks:', count);
  },
};

export const NxEndedRunningTasks: MessagingNotification<number> = {
  type: new NotificationType('nx/endedRunningTasks'),
  handler: (count) => {
    console.log('Ended running tasks:', count);
  },
};

export const NxUpdatedRunningTasks: MessagingNotification<
  Array<UpdatedRunningTask>
> = {
  type: new NotificationType('nx/updatedRunningTasks'),
  handler: (updatedRunningTasks) => {
    console.log('Updated running tasks:', updatedRunningTasks);
  },
};
