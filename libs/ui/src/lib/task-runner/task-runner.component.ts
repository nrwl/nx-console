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
import { BehaviorSubject, merge, Subscription, EMPTY } from 'rxjs';
import { map, delay } from 'rxjs/operators';
import { FlagsComponent } from '../flags/flags.component';
import { CommandOutputComponent } from '../command-output/command-output.component';

const ANIMATION_DURATION = 300;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ui-task-runner',
  templateUrl: './task-runner.component.html',
  styleUrls: ['./task-runner.component.scss'],
  animations: [
    trigger('growShrink', [
      state('void', style({ flex: '0 0', 'min-height': '45px' })),
      state('shrink', style({ flex: '0 0', 'min-height': '45px' })),
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
  @ContentChild(CommandOutputComponent)
  statusComponent: CommandOutputComponent | undefined;

  terminalVisible$ = new BehaviorSubject(true);
  terminalAnimationState = this.terminalVisible$.pipe(
    map(visible => (visible ? 'grow' : 'shrink'))
  );
  resizeSubscription: Subscription | undefined;

  ngAfterContentInit() {
    const TIME_BUFFER = 50;
    const DELAY = ANIMATION_DURATION + TIME_BUFFER;
    const flagsComponentResize$ = this.flagsComponent
      ? this.flagsComponent.resizeFlags.pipe(delay(DELAY))
      : EMPTY;
    this.resizeSubscription = merge(
      flagsComponentResize$,
      this.terminalVisible$.pipe(delay(DELAY))
    ).subscribe(() => {
      if (this.statusComponent) {
        this.statusComponent.resizeTerminal();
      }
    });
  }

  ngOnDestroy() {
    if (this.resizeSubscription) {
      this.resizeSubscription.unsubscribe();
    }
  }
}
