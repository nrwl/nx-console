import {
  animate,
  state,
  style,
  transition,
  trigger
} from '@angular/animations';
import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  Input,
  OnDestroy
} from '@angular/core';
import { BehaviorSubject, empty, merge, Subscription } from 'rxjs';
import { map, delay } from 'rxjs/operators';
import { FlagsComponent } from '../flags/flags.component';
import { TerminalComponent } from '../terminal/terminal.component';

const ANIMATION_DURATION = 300;

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
      transition(
        `shrink <=> grow`,
        animate(`${ANIMATION_DURATION}ms ease-in-out`)
      )
    ])
  ]
})
export class TaskRunnerComponent implements AfterContentInit, OnDestroy {
  @Input() terminalWindowTitle: string;

  @ContentChild(FlagsComponent) flagsComponent: FlagsComponent | undefined;
  @ContentChild(TerminalComponent) terminalComponent: TerminalComponent;

  terminalVisible = new BehaviorSubject(true);
  terminalAnimationState = this.terminalVisible.pipe(
    map(visible => (visible ? 'grow' : 'shrink'))
  );
  resizeSubscription: Subscription | undefined;

  ngAfterContentInit() {
    const DELAY = ANIMATION_DURATION + 50;
    const flagsComponentResize$ = this.flagsComponent
      ? this.flagsComponent.resize.pipe(delay(DELAY))
      : empty();
    this.resizeSubscription = merge(
      flagsComponentResize$,
      this.terminalVisible.pipe(delay(DELAY))
    ).subscribe(() => {
      this.terminalComponent.resizeTerminal();
    });
  }

  ngOnDestroy() {
    if (this.resizeSubscription) {
      this.resizeSubscription.unsubscribe();
    }
  }
}
