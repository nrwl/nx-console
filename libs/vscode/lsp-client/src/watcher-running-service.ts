import { Disposable } from 'vscode-languageserver';
import { NxlsClient } from './nxls-client';
import { NxWatcherOperationalNotification } from '@nx-console/language-server-types';
import { EventEmitter } from 'vscode';

export class WatcherRunningService implements Disposable {
  static INSTANCE: WatcherRunningService | undefined;
  static get instance(): WatcherRunningService {
    if (!WatcherRunningService.INSTANCE) {
      throw new Error('WatcherRunningService instance is not initialized yet.');
    }
    return WatcherRunningService.INSTANCE;
  }

  private _isOperational = false;
  private _listener: Disposable | null = null;

  public get isOperational(): boolean {
    return this._isOperational;
  }

  private readonly _onOperationalStateChange: EventEmitter<boolean> =
    new EventEmitter();
  readonly onOperationalStateChange = this._onOperationalStateChange.event;

  constructor(nxlsClient: NxlsClient) {
    WatcherRunningService.INSTANCE = this;
    nxlsClient.onNotification(
      NxWatcherOperationalNotification,
      ({ isOperational }) => {
        if (this._isOperational === isOperational) {
          return;
        }
        this._isOperational = isOperational;
        this._onOperationalStateChange.fire(isOperational);
      },
    );
  }

  dispose() {
    this._listener?.dispose();
  }
}
