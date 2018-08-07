import { CanActivateChild } from '@angular/router';
import { CommandRunner } from './command-runner.service';
import { Messenger } from './messenger.service';
import { Injectable } from '@angular/core';

@Injectable()
export class CancelCommandGuard implements CanActivateChild {
  constructor(
    readonly messenger: Messenger,
    readonly commandRunner: CommandRunner,
    readonly runner: CommandRunner
  ) {}

  canActivateChild(): boolean {
    if (this.commandRunner.activeCommand$.value) {
      this.runner.stopCommand();
      this.messenger.notify('Command has been canceled');
    }
    return true;
  }
}
