import { NotificationType, NotificationType2 } from 'vscode-jsonrpc';
import {
  MessagingNotification,
  MessagingNotification2,
} from '../messaging-notification';
import {
  endRunningTasks,
  setUpdatingRunningTasks,
  startRunningTasks,
  UpdatedRunningTask,
} from '@nx-console/shared-running-tasks';

export const NxStartedRunningTasks: MessagingNotification<number> = {
  type: new NotificationType('nx/startedRunningTasks'),
  handler: (processId) => {
    console.log('Started running tasks:', processId);
    startRunningTasks(processId);
  },
};

export const NxEndedRunningTasks: MessagingNotification<number> = {
  type: new NotificationType('nx/endedRunningTasks'),
  handler: (process) => {
    console.log('Ended running tasks:', process);
    endRunningTasks(process);
  },
};

export const NxUpdatedRunningTasks: MessagingNotification2<
  number,
  Array<UpdatedRunningTask>
> = {
  type: new NotificationType2('nx/updateRunningTasks'),
  handler: (process, updatedRunningTasks) => {
    console.log('Updated running tasks:', process, updatedRunningTasks);
    setUpdatingRunningTasks(process, updatedRunningTasks);
  },
};
