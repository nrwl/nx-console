import {
  animate,
  state,
  style,
  transition,
  trigger
} from '@angular/animations';
import {
  AfterContentChecked,
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  Input
} from '@angular/core';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map, shareReplay, startWith, tap } from 'rxjs/operators';

import { CommandOutputComponent } from '../command-output/command-output.component';
import { CONTEXTUAL_ACTION_BAR_HEIGHT } from '../contextual-action-bar/contextual-action-bar.component';
import { FlagsComponent } from '../flags/flags.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ui-task-runner',
  templateUrl: './task-runner.component.html',
  styleUrls: ['./task-runner.component.scss'],
  animations: [
    trigger('growShrink', [
      state(
        'shrink',
        style({ flex: '0 0 0', height: '45px', 'min-height': '45px' })
      ),
      state(
        'grow',
        style({ flex: '1 1 0', height: '*', 'min-height': '30vh' })
      ),
      transition(
        `shrink <=> grow`,
        animate(`600ms cubic-bezier(0.4, 0.0, 0.2, 1)`)
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
        const expansionPanelHeaderHeight = numFlags === 1 ? 110 : 49 + 110;
        const configurationsHeight =
          configurations && configurations.length > 1 ? 55 : 0;
        switch (v) {
          case 'grow':
            this.flagsComponent.viewportHeight.next(
              `calc(70vh - ${expansionPanelHeaderHeight +
                configurationsHeight +
                CONTEXTUAL_ACTION_BAR_HEIGHT}px)`
            );
            break;
          case 'shrink':
            this.flagsComponent.viewportHeight.next(
              `calc(100vh - ${expansionPanelHeaderHeight +
                CONTEXTUAL_ACTION_BAR_HEIGHT}px)`
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
