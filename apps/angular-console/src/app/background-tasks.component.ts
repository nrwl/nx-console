import { Component } from '@angular/core';
import { CommandRunner, Settings } from '@angular-console/utils';
import { first } from 'rxjs/operators';

/**
 * Delete this component once background tasks functionality is fully implemented
 */
@Component({
  selector: 'angular-console-background-tasks',
  template: `
    <div *ngIf="settings.showBackgroundTasks()" style="top: 500px; background-color: green; width: 800px;">
      <h1>background tasks</h1>
      <div *ngFor="let task of allCommands|async">
        <div>id: {{ task.id }}</div>
        <div>status: {{ task.status }}</div>
        <div>workspace: {{ task.workspace }}</div>
        <div>command: {{ task.command }}</div>
        <div>
          <button *ngIf="task.status == 'inprogress'" (click)="stop(task.id)">stop</button>
          <button *ngIf="task.status !== 'inprogress'" (click)="restart(task.id)">restart</button>
          <button (click)="open(task.id)">open</button>
          <button (click)="remove(task.id)">remove</button>
        </div>
      </div>
    </div>
  `
})
export class BackgroundTasksComponent {
  allCommands = this.runner.listAllCommands();

  constructor(public settings: Settings, public runner: CommandRunner) {}

  stop(id: string) {
    this.runner.stopCommand(id);
  }

  restart(id: string) {
    this.runner.restartCommand(id);
  }

  remove(id: string) {
    this.runner.removeCommand(id);
  }

  open(id: string) {
    this.runner
      .getCommand(id)
      .pipe(first())
      .subscribe(v => {
        console.log(JSON.stringify(v, null, 2));
      });
  }
}
