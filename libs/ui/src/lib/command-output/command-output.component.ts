import { CommandResponse, CommandRunner } from '@angular-console/utils';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  Input,
  OnDestroy,
  TemplateRef,
  ViewChild,
  Output,
  EventEmitter
} from '@angular/core';
import { BehaviorSubject, combineLatest, Subject } from 'rxjs';
import { map, scan, take } from 'rxjs/operators';

import { TerminalComponent } from '../terminal/terminal.component';

export type StatusComponentView = 'details' | 'terminal';
const INITIAL_VIEW: StatusComponentView = 'details';

interface TerminalOutputState {
  view: StatusComponentView;
  unread: boolean;
  out: string;
}

interface TerminalOutputValue {
  view: StatusComponentView;
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
  @Input() set activeView(view: StatusComponentView) {
    this.activeView$.next(view);
    this.activeViewSet.next(view);
  }
  get activeView() {
    return this.activeView$.value;
  }

  @Output() readonly activeViewSet = new EventEmitter<StatusComponentView>();

  private readonly detailedStatus$ = new Subject<any>();
  readonly activeView$ = new BehaviorSubject<StatusComponentView>(INITIAL_VIEW);

  switchToTerminalSubscription = this.detailedStatus$
    .pipe(
      map(status => !status),
      take(1) // Only do this the first time so the UI does not keep changing without user intent.
    )
    .subscribe(x => {
      if (x) {
        this.activeView = 'terminal';
      }
    });

  _commandResponse: CommandResponse;
  hasUnreadResponse = false;

  constructor(private readonly commandRunner: CommandRunner) {}

  ngOnDestroy() {
    this.switchToTerminalSubscription.unsubscribe();
  }

  toggleActiveView() {
    const activeView = this.activeView;
    this.activeView = activeView === 'terminal' ? 'details' : 'terminal';
  }

  reset() {
    if (this.terminal) {
      this.terminal.reset();
    }
    this.hasUnreadResponse = false;
  }

  isStopped() {
    const commandResponse = this.commandResponse;
    return commandResponse ? commandResponse.status === 'terminated' : true;
  }
}
