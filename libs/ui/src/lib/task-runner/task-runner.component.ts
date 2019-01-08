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
import { map, startWith, tap, shareReplay } from 'rxjs/operators';

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
      state(
        'shrink',
        style({ flex: 'initial', height: '45px', 'min-height': '45px' })
      ),
      state(
        'grow',
        style({ flex: '1 1 1e-09px', height: '*', 'min-height': '30vh' })
      ),
      transition(
        `shrink <=> grow`,
        animate(`${ANIMATION_DURATION}ms ease-in-out`)
      )
    ])
  ]
})
export class TaskRunnerComponent implements AfterContentChecked {
  @Input() terminalWindowTitle: string;

  @ContentChild(FlagsComponent) flagsComponent: FlagsComponent;
  @ContentChild(CommandOutputComponent)
  statusComponent: CommandOutputComponent | undefined;

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
      startWith([this.terminalVisible$.value, true]),
      map(([terminalVisible]) => {
        if (!terminalVisible) return 'shrink';
        return 'grow';
      }),
      tap(v => {
        const numFlags = this.flagsComponent.matExpansionPanels.length;
        const configurations = this.flagsComponent.configurations;
        const expansionPanelHeaderHeight =
          numFlags === 1 ? `${129}px` : `${49 + 129}px`;
        const configurationsHeight =
          configurations && configurations.length > 1 ? '55px' : '0px';
        console.log('configurationsHeight', configurationsHeight);
        switch (v) {
          case 'grow':
            this.flagsComponent.viewportHeight.next(
              `calc(70vh - ${expansionPanelHeaderHeight} - ${configurationsHeight})`
            );
            break;
          case 'shrink':
            this.flagsComponent.viewportHeight.next(
              `calc(100vh - ${expansionPanelHeaderHeight} - 45px)`
            );
            break;
          default:
            this.flagsComponent.viewportHeight.next(`0`);
        }
      }),
      shareReplay()
    );
  }
}
