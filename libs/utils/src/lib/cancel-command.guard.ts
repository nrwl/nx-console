import { CanActivateChild } from '@angular/router';
import { CommandRunner } from './command-runner.service';
import { Messenger } from './messenger.service';
import { Injectable } from '@angular/core';
import { Settings } from './settings.service';

@Injectable()
export class CancelCommandGuard implements CanActivateChild {
  constructor(
    readonly messenger: Messenger,
    readonly commandRunner: CommandRunner,
    readonly settings: Settings
  ) {}

  canActivateChild(): boolean {
    if (this.settings.showBackgroundTasks()) {
      return true;
    }
    if (this.commandRunner.activeCommand$.value) {
      this.commandRunner.stopActiveCommand();
      this.messenger.notify('Command has been canceled');
    }
    return true;
  }
}
