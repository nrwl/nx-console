import {
  animate,
  state,
  style,
  transition,
  trigger
} from '@angular/animations';
import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  Input,
  AfterContentChecked,
  ViewChild,
  ElementRef,
  NgZone,
  OnDestroy,
  ContentChildren,
  QueryList
} from '@angular/core';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map, startWith, tap } from 'rxjs/operators';

import {
  CommandOutputComponent,
  StatusComponentView
} from '../command-output/command-output.component';
import { FlagsComponent } from '../flags/flags.component';

const ANIMATION_DURATION = 300;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ui-task-runner',
  templateUrl: './task-runner.component.html',
  styleUrls: ['./task-runner.component.scss'],
  animations: [
    trigger('growShrink', [
      state('void', style({ height: '45px', 'min-height': '45px' })),
      state('shrink', style({ height: '45px', 'min-height': '45px' })),
      state('flag-open', style({ height: '30vh' })),
      state('grow-one-flag', style({ height: 'calc(100vh - 114px)' })),
      state('grow-two-flag', style({ height: 'calc(100vh - 164px)' })),
      transition(`* <=> void`, []),
      transition(`* <=> *`, animate(`${ANIMATION_DURATION}ms ease-in-out`))
    ])
  ]
})
export class TaskRunnerComponent implements AfterContentChecked {
  @Input() terminalWindowTitle: string;

  @ContentChild(FlagsComponent) flagsComponent: FlagsComponent;
  @ContentChild(CommandOutputComponent)
  statusComponent: CommandOutputComponent | undefined;

  @Input() set terminalVisible(visible: boolean) {
    this.terminalVisible$.next(visible);
  }

  terminalVisible$ = new BehaviorSubject(true);
  terminalAnimationState: Observable<string>;

  toggleActiveView() {
    if (this.statusComponent) {
      const activeView = this.statusComponent.activeView;
      this.statusComponent.activeView =
        activeView === 'terminal' ? 'details' : 'terminal';
    }
  }

  constructor() {}

  ngAfterContentChecked() {
    // Wait until the flags component has rendered its expansion panels.
    if (
      this.terminalAnimationState ||
      !this.flagsComponent ||
      !this.flagsComponent.matExpansionPanels
    ) {
      return;
    }

    const flagsVisible$ = combineLatest(
      ...this.flagsComponent.matExpansionPanels.map(p =>
        p.expandedChange.pipe(startWith(p.expanded))
      )
    ).pipe(
      startWith(this.flagsComponent.matExpansionPanels.map(p => p.expanded)),
      map(values => values.some(v => v))
    );

    this.terminalAnimationState = combineLatest(
      this.terminalVisible$,
      flagsVisible$
    ).pipe(
      map(([terminalVisible, flagsVisible]) => {
        if (!terminalVisible) return 'shrink';
        if (flagsVisible) return 'flags-visible';
        const numFlags = this.flagsComponent.matExpansionPanels.length;
        if (numFlags === 1) {
          return 'grow-one-flag';
        } else {
          return 'grow-two-flag';
        }
      }),
      tap(v => {
        const numFlags = this.flagsComponent.matExpansionPanels.length;
        const expansionPanelHeaderHeight = `${numFlags * 50 + 124}px`;
        switch (v) {
          case 'flags-visible':
            this.flagsComponent.viewportHeight.next(
              `calc(70vh - ${expansionPanelHeaderHeight})`
            );
            break;
          case 'grow-one-flag':
            this.flagsComponent.viewportHeight.next('0');
            break;
          case 'shrink':
            this.flagsComponent.viewportHeight.next(
              `calc(100vh - ${expansionPanelHeaderHeight})`
            );
            break;
        }
      })
    );
  }
}
