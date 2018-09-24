import {
  state,
  style,
  trigger,
  transition,
  animate
} from '@angular/animations';
import { Component, ViewChildren, QueryList } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import {
  map,
  shareReplay,
  tap,
  distinctUntilChanged,
  startWith
} from 'rxjs/operators';
import {
  CommandRunner,
  CommandResponse,
  CommandStatus
} from '@angular-console/utils';
import { ContextualActionBarService } from '@nrwl/angular-console-enterprise-frontend';
import { CommandOutputComponent } from '@angular-console/ui';

const TERMINAL_PADDING = 44;
const COMMAND_HEIGHT = 64;

@Component({
  selector: 'angular-console-action-bar',
  templateUrl: './action-bar.component.html',
  styleUrls: ['./action-bar.component.scss'],
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

  // Show/hide a particular items terminal output.
  toggleItemExpansion(actionId: string) {
    if (this.expandedAction && actionId === this.expandedAction.id) {
      this.expandedAction = undefined;
    } else {
      this.expandedAction = {
        id: actionId,
        command: this.commandRunner.getCommand(actionId).pipe(shareReplay())
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
        map(commands => commands.length),
        distinctUntilChanged(),
        map(numCommands => {
          const actionBarHeight = numCommands > 1 ? COMMAND_HEIGHT : 0;
          return `calc(100vh - ${TERMINAL_PADDING +
            actionBarHeight +
            COMMAND_HEIGHT * numCommands}px)`;
        }),
        tap(() => {
          setTimeout(() => {
            if (this.activeTerminals && this.activeTerminals.first) {
              this.activeTerminals.first.resizeTerminal();
            }
          }, 250);
        })
      )
      .subscribe(height => {
        this.terminalHeight = height;
      });
  }
}
