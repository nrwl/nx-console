import { CommandOutputComponent } from '@angular-console/ui';
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
  HostListener,
  QueryList,
  ViewChildren
} from '@angular/core';
import { ContextualActionBarService } from '@nrwl/angular-console-enterprise-frontend';
import { combineLatest, Observable, BehaviorSubject } from 'rxjs';
import {
  distinctUntilChanged,
  map,
  shareReplay,
  startWith,
  switchMap,
  take,
  tap
} from 'rxjs/operators';

const TERMINAL_PADDING = 44;
const COMMAND_HEIGHT = 64;

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
      transition(`contract <=> *`, animate(`250ms ease-in-out`)),
      transition(`:enter`, animate(`250ms ease-in-out`)),
      transition(`:leave`, animate(`250ms ease-in-out`))
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
      transition(`* <=> *`, animate(`250ms ease-in-out`))
    ])
  ]
})
export class ActionBarComponent {
  @ViewChildren(CommandOutputComponent)
  activeTerminals?: QueryList<CommandOutputComponent>;

  actionIdToActiveView = {};

  // For use within the action bar's template.
  CommandStatus = CommandStatus;

  // Whether to show list of actions If there are multiple actions,
  actionsExpanded = new BehaviorSubject(false);

  // The action showing its terminal output if one exists.
  expandedAction?: {
    id: string;
    command: Observable<CommandResponse>;
  };

  // The calculated height of the expanded action's terminal.
  terminalHeight: string;

  // The user's list of recently run commands.
  commands$ = this.commandRunner.listAllCommands().pipe(shareReplay());

  showActionBar$ = combineLatest(
    this.commands$,
    this.contextualActionBarService.contextualActions$.pipe(startWith(null))
  ).pipe(
    map(([commands, contextualActions]) => {
      if (contextualActions) {
        return false;
      }
      return commands.length > 0;
    }),
    tap(show => {
      if (!show) {
        this.actionsExpanded.next(false);
      }
    }),
    shareReplay()
  );

  showActionToolbar$ = combineLatest(this.showActionBar$, this.commands$).pipe(
    map(([showActionBar, commands]) => {
      return Boolean(showActionBar && commands.length > 1);
    })
  );

  showActionList$ = combineLatest(
    this.showActionBar$,
    this.commands$,
    this.actionsExpanded
  ).pipe(
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

  @HostListener('document:keypress', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (!this.actionsExpanded.value && event.ctrlKey && event.key === 'c') {
      this.commands$.pipe(take(1)).subscribe(commands => {
        if (commands.length === 1 && commands[0].status === 'in-progress') {
          this.commandRunner.stopCommandViaCtrlC(commands[0].id);
        }
      });
    }
  }

  constructor(
    readonly commandRunner: CommandRunner,
    private readonly contextualActionBarService: ContextualActionBarService
  ) {
    this.commands$
      .pipe(
        map(commands => commands.length),
        distinctUntilChanged(),
        map(numCommands => {
          const actionBarHeight = numCommands > 1 ? COMMAND_HEIGHT : 0;
          return `calc(100vh - ${TERMINAL_PADDING +
            actionBarHeight +
            COMMAND_HEIGHT * numCommands}px)`;
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
}
