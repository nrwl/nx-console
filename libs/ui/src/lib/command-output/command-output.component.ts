import { CommandResponse, CommandRunner } from '@angular-console/utils';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  Input,
  OnDestroy,
  TemplateRef,
  ViewChild
} from '@angular/core';
import { BehaviorSubject, combineLatest, Subject } from 'rxjs';
import { map, scan, take } from 'rxjs/operators';

import { TerminalComponent } from '../terminal/terminal.component';

type View = 'details' | 'terminal';
const INITIAL_VIEW: View = 'details';

interface TerminalOutputState {
  view: View;
  unread: boolean;
  out: string;
}

interface TerminalOutputValue {
  view: View;
  out: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ui-command-output',
  templateUrl: './command-output.component.html',
  styleUrls: ['./command-output.component.scss']
})
export class CommandOutputComponent implements OnDestroy {
  @ViewChild(TerminalComponent) terminal: TerminalComponent;
  @Input()
  set commandResponse(x: CommandResponse) {
    // Guard against initial empty responses.
    if (!x) {
      return;
    }
    this.outputValue$.next(x.outChunk);
    this.detailedStatus$.next(x.detailedStatus);
    this._commandResponse = x;
  }
  get commandResponse() {
    return this._commandResponse;
  }
  @Input() emptyTemplate?: TemplateRef<void>;

  @HostListener('document:keypress', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (
      event.ctrlKey &&
      event.key === 'c' &&
      this.commandResponse &&
      this.commandResponse.status === 'in-progress'
    ) {
      this.commandRunner.stopCommandViaCtrlC(this.commandResponse.id);
    }
  }

  private readonly outputValue$ = new Subject<string>();
  private readonly detailedStatus$ = new Subject<any>();
  readonly activeView$ = new BehaviorSubject<View>(INITIAL_VIEW);

  // This is used to determine if there are unread terminal output.
  readonly terminalOutputState$ = combineLatest(
    this.activeView$,
    this.outputValue$
  ).pipe(
    map(([view, out]) => ({
      view,
      out
    })),
    scan<TerminalOutputValue, TerminalOutputState>(terminalOutputReducer, {
      view: INITIAL_VIEW,
      unread: false,
      out: ''
    })
  );

  switchToTerminalSubscription = this.detailedStatus$
    .pipe(
      map(status => !status),
      take(1) // Only do this the first time so the UI does not keep changing without user intent.
    )
    .subscribe(x => {
      if (x) {
        this.activeView$.next('terminal');
      }
    });

  _commandResponse: CommandResponse;
  hasUnreadResponse = false;

  constructor(private readonly commandRunner: CommandRunner) {}

  ngOnDestroy() {
    this.switchToTerminalSubscription.unsubscribe();
  }

  reset() {
    if (this.terminal) {
      this.terminal.reset();
    }
    this.hasUnreadResponse = false;
  }

  resizeTerminal() {
    if (this.terminal) {
      this.terminal.resizeTerminal();
    }
  }

  setActiveView(view: View) {
    this.activeView$.next(view);
  }

  isStopped() {
    const commandResponse = this.commandResponse;
    return commandResponse ? commandResponse.status === 'terminated' : true;
  }
}

function terminalOutputReducer(
  s: TerminalOutputState,
  { view, out }: TerminalOutputValue
) {
  return {
    view,
    out,
    unread: view === 'terminal' ? false : s.unread || out !== s.out
  };
}
