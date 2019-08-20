import {
  CommandOutputComponent,
  CONTEXTUAL_ACTION_BAR_HEIGHT
} from '@angular-console/ui';
import {
  CommandResponse,
  CommandRunner,
  CommandStatus
} from '@angular-console/utils';
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
  OnDestroy,
  QueryList,
  ViewChildren
} from '@angular/core';
import { ContextualActionBarService } from '@nrwl/angular-console-enterprise-frontend';
import { BehaviorSubject, combineLatest, Observable, Subject } from 'rxjs';
import {
  distinctUntilChanged,
  map,
  shareReplay,
  startWith,
  switchMap,
  takeUntil
} from 'rxjs/operators';

@Component({
  selector: 'angular-console-action-bar',
  templateUrl: './action-bar.component.html',
  styleUrls: ['./action-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('growShrink', [
      state('void', style({ height: 0, opacity: 0 })),
      state('contract', style({ height: 0, opacity: 0 })),
      state('*', style({ height: '*', opacity: 1 })),
      transition(
        `contract <=> *`,
        animate(`300ms cubic-bezier(0.4, 0.0, 0.2, 1)`)
      ),
      transition(`:enter`, animate(`300ms cubic-bezier(0.4, 0.0, 0.2, 1)`)),
      transition(`:leave`, animate(`300ms cubic-bezier(0.4, 0.0, 0.2, 1)`))
    ]),
    trigger('growShrinkTerminal', [
      state(
        'void',
        style({
          height: 0,
          opacity: 0
        })
      ),
      state(
        '*',
        style({
          height: '{{terminalHeight}}', // use interpolation
          opacity: 1
        }),
        { params: { terminalHeight: '0' } }
      ),
      transition(`* <=> *`, animate(`300ms cubic-bezier(0.4, 0.0, 0.2, 1)`))
    ])
  ]
})
export class ActionBarComponent implements OnDestroy {
  @ViewChildren(CommandOutputComponent)
  activeTerminals?: QueryList<CommandOutputComponent>;
  actionIdToActiveView = {};
  CommandStatus = CommandStatus;
  destroyed$ = new Subject();

  // Whether to show list of actions If there are multiple actions,
  readonly actionsExpandedSubject = new BehaviorSubject(false);
  readonly actionsExpanded$ = this.actionsExpandedSubject.asObservable();

  // The action showing its terminal output if one exists.
  expandedAction?: {
    id: string;
    command: Observable<CommandResponse>;
  };

  // The calculated height of the expanded action's terminal.
  terminalHeight: string;

  // The user's list of recently run commands.
  commands$ = this.commandRunner.listAllCommands().pipe(shareReplay());

  showActionBar$ = combineLatest([
    this.commands$,
    this.contextualActionBarService.contextualActions$.pipe(startWith(null))
  ]).pipe(
    map(([pCommands, actions]) => Boolean(actions === null && pCommands.length))
  );

  showActionToolbar$ = combineLatest([
    this.showActionBar$,
    this.commands$
  ]).pipe(
    map(([showActionBar, commands]) => {
      return Boolean(showActionBar && commands.length > 1);
    })
  );

  showActionList$ = combineLatest([
    this.showActionBar$,
    this.commands$,
    this.actionsExpandedSubject
  ]).pipe(
    map(([showActionBar, commands, actionsExpanded]) => {
      return Boolean(
        showActionBar && (actionsExpanded || commands.length === 1)
      );
    })
  );

  commandRun$ = new BehaviorSubject<void>(undefined);

  // Show/hide a particular items terminal output.
  toggleItemExpansion(actionId: string, cols: number = 80) {
    if (this.expandedAction && actionId === this.expandedAction.id) {
      this.expandedAction = undefined;
    } else {
      this.expandedAction = {
        id: actionId,
        command: this.commandRun$.pipe(
          switchMap(() =>
            this.commandRunner.getCommand(actionId, new BehaviorSubject(cols))
          )
        )
      };
    }
  }

  trackByCommandId(_: number, command: CommandResponse) {
    return command.id;
  }

  constructor(
    readonly commandRunner: CommandRunner,
    private readonly contextualActionBarService: ContextualActionBarService
  ) {
    this.commands$
      .pipe(
        takeUntil(this.destroyed$),
        map(commands => commands.length),
        distinctUntilChanged(),
        map(numCommands => {
          const actionBarVisible = numCommands > 1;
          const actionBarHeight = actionBarVisible
            ? CONTEXTUAL_ACTION_BAR_HEIGHT
            : 0;
          return `calc(100vh - ${actionBarHeight +
            CONTEXTUAL_ACTION_BAR_HEIGHT * numCommands}px)`;
        })
      )
      .subscribe(height => {
        this.terminalHeight = height;
      });
  }

  handleRestart(cmd: CommandResponse) {
    if (this.activeTerminals && this.activeTerminals.first) {
      this.activeTerminals.first.reset();
    }
    this.commandRunner.restartCommand(cmd.id);
    this.commandRun$.next(undefined);
  }

  ngOnDestroy() {
    this.destroyed$.next();
    this.destroyed$.complete();
  }
}
