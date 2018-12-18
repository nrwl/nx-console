import { BrowserWindow } from 'electron';
import { authUtils } from '@nrwl/angular-console-enterprise-electron';
import { Subject } from 'rxjs';

const SILENT_CONFIG = {
  width: 1,
  height: 1,
  alwaysOnTop: false,
  resizable: false,
  transparent: true
};

const VISIBLE_CONFIG = {
  width: 800,
  height: 600,
  alwaysOnTop: true,
  resizable: false
};

export function getAuthenticatorFactory(
  parentWindow: BrowserWindow | undefined
): (config: { silent: boolean }) => authUtils.AuthenticatorFactory {
  return config => url => {
    const windowConfig = config.silent
      ? {
          ...SILENT_CONFIG,
          parent: parentWindow
        }
      : {
          ...VISIBLE_CONFIG,
          parent: parentWindow
        };

    const redirectSubject = new Subject<string>();

    const authWindow: BrowserWindow = new BrowserWindow(windowConfig);
    authWindow.loadURL(url);
    authWindow.webContents.on(
      'did-get-redirect-request' as any,
      (_event: any, _oldURL: string, newURL: string) => {
        redirectSubject.next(newURL);
      }
    );
    authWindow.on('close', () => {
      if (!redirectSubject.isStopped) {
        redirectSubject.error(new Error('User terminated authentication'));
      }
    });

    redirectSubject.subscribe(
      () => {},
      () => {},
      () => {
        if (!authWindow.isDestroyed()) {
          authWindow.destroy();
        }
      }
    );

    return redirectSubject;
  };
}
