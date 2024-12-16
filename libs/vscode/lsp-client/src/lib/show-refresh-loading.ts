import { NxWorkspaceRefreshNotification } from '@nx-console/language-server/types';

import { Disposable, window } from 'vscode';

import { NxWorkspaceRefreshStartedNotification } from '@nx-console/language-server/types';
import { ProgressLocation } from 'vscode';
import { getNxlsClient } from './nxls-client';

const currentLoadingLocations: Set<string> = new Set();

export function showRefreshLoadingAtLocation(
  location:
    | ProgressLocation
    | {
        viewId: string;
      }
): Disposable {
  const client = getNxlsClient();
  const locationString = JSON.stringify(location);

  const onNotificationDisposable = client.onNotification(
    NxWorkspaceRefreshStartedNotification,
    async () => {
      if (currentLoadingLocations.has(locationString)) {
        return;
      }
      currentLoadingLocations.add(locationString);
      const refreshPromise = new Promise<void>((resolve) => {
        const disposable = client.onNotification(
          NxWorkspaceRefreshNotification,
          () => {
            disposable?.dispose();
            resolve();
          }
        );
      });

      await window.withProgress(
        {
          location,
          cancellable: false,
          title: 'Refreshing Nx workspace',
        },
        async () => {
          await refreshPromise;
        }
      );

      currentLoadingLocations.delete(locationString);
    }
  );

  return new Disposable(() => {
    currentLoadingLocations.delete(locationString);
    onNotificationDisposable.dispose();
  });
}
