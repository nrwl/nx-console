import {
  animate,
  state,
  style,
  transition,
  trigger
} from '@angular/animations';
import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ui-task-runner',
  templateUrl: './task-runner.component.html',
  styleUrls: ['./task-runner.component.scss'],
  animations: [
    trigger('growShrink', [
      state('void', style({ flex: '0 0', 'min-height': '32px' })),
      state('shrink', style({ flex: '0 0', 'min-height': '32px' })),
      state('grow', style({ flex: '1 1', 'min-height': '240px' })),
      transition(`shrink <=> grow`, animate(`300ms ease-in-out`))
    ])
  ]
})
export class TaskRunnerComponent {
  @Input() terminalWindowTitle: string;

  terminalVisible = new BehaviorSubject(true);
  terminalAnimationState = this.terminalVisible.pipe(
    map(visible => (visible ? 'grow' : 'shrink'))
  );
}
