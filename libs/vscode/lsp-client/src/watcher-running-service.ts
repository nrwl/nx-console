import { Disposable } from 'vscode-languageserver';
import { NxlsClient } from './nxls-client';
import {
  NxWatcherOperationalNotification,
  NxWatcherStatus,
} from '@nx-console/language-server-types';
import { EventEmitter } from 'vscode';

export class WatcherRunningService implements Disposable {
  static INSTANCE: WatcherRunningService | undefined;
  static get instance(): WatcherRunningService {
    if (!WatcherRunningService.INSTANCE) {
      throw new Error('WatcherRunningService instance is not initialized yet.');
    }
    return WatcherRunningService.INSTANCE;
  }

  private _status: NxWatcherStatus | undefined = undefined;
  private _listener: Disposable | null = null;

  public get status(): NxWatcherStatus | undefined {
    return this._status;
  }

  public get isOperational(): boolean | undefined {
    if (this._status === undefined) {
      return undefined;
    }
    return this._status === 'operational';
  }

  private readonly _onStatusChange: EventEmitter<NxWatcherStatus> =
    new EventEmitter();
  readonly onStatusChange = this._onStatusChange.event;

  constructor(nxlsClient: NxlsClient) {
    WatcherRunningService.INSTANCE = this;
    this._listener = nxlsClient.onNotification(
      NxWatcherOperationalNotification,
      ({ status }) => {
        if (this._status === status) {
          return;
        }
        this._status = status;
        this._onStatusChange.fire(status);
      },
    );
  }

  dispose() {
    this._listener?.dispose();
  }
}
