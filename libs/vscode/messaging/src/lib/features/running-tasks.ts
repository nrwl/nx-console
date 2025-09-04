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
import { vscodeLogger } from '@nx-console/vscode-output-channels';

export const NxStartedRunningTasks: MessagingNotification<number> = {
  type: new NotificationType('nx/startedRunningTasks'),
  handler: (connectionId) => (processId) => {
    vscodeLogger.log('Started running tasks:', connectionId, processId);
    startRunningTasks(connectionId, processId);
  },
};

export const NxEndedRunningTasks: MessagingNotification<number> = {
  type: new NotificationType('nx/endedRunningTasks'),
  handler: (connectionId) => (process) => {
    vscodeLogger.log('Ended running tasks:', connectionId, process);
    endRunningTasks(connectionId);
  },
  onClose(id) {
    endRunningTasks(id);
  },
};

export const NxUpdatedRunningTasks: MessagingNotification2<
  number,
  Array<UpdatedRunningTask>
> = {
  type: new NotificationType2('nx/updateRunningTasks'),
  handler: (connectionId) => (process, updatedRunningTasks) => {
    vscodeLogger.log(
      'Updated running tasks:',
      connectionId,
      process,
      updatedRunningTasks,
    );
    setUpdatingRunningTasks(connectionId, updatedRunningTasks);
  },
};
