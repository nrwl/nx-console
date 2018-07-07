import {
  animate,
  state,
  style,
  transition,
  trigger
} from '@angular/animations';
import { Component, Input } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'ui-task-runner',
  templateUrl: './task-runner.component.html',
  styleUrls: ['./task-runner.component.scss'],
  animations: [
    trigger('growShrink', [
      state('void', style({ flex: '0 0', 'min-height': '68px' })),
      state('shrink', style({ flex: '0 0', 'min-height': '68px' })),
      state('grow', style({ flex: '1 1', 'min-height': '240px' })),
      transition(`shrink <=> grow`, animate(`300ms ease-in-out`))
    ])
  ]
})
export class TaskRunnerComponent {
  @Input() terminalWindowTitle: string;

  dryRunVisible = new BehaviorSubject(false);
  dryRunAnimationState = this.dryRunVisible.pipe(
    map(visible => (visible ? 'grow' : 'shrink'))
  );
}
