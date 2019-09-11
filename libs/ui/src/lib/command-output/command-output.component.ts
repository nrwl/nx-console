import { CommandResponse, CommandRunner } from '@angular-console/utils';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
  TemplateRef,
  ViewChild
} from '@angular/core';
import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import { map, take } from 'rxjs/operators';

import { TerminalComponent } from '../terminal/terminal.component';

export type StatusComponentView = 'details' | 'terminal';
const INITIAL_VIEW: StatusComponentView = 'details';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ui-command-output',
  templateUrl: './command-output.component.html',
  styleUrls: ['./command-output.component.scss']
})
export class CommandOutputComponent implements OnDestroy {
  @ViewChild(TerminalComponent, { static: false }) terminal: TerminalComponent;
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

  switchToTerminalSubscription?: Subscription;

  _commandResponse: CommandResponse;
  hasUnreadResponse = false;

  constructor(private readonly commandRunner: CommandRunner) {
    this.switchToTerminalSubscription = this.detailedStatus$
      .pipe(
        map(status => !status),
        take(1) // Only do this the first time so the UI does not keep changing without user intent.
      )
      .subscribe(x => {
        if (x) {
          this.activeView = 'terminal';
        }
      });
  }

  ngOnDestroy() {
    if (this.switchToTerminalSubscription) {
      this.switchToTerminalSubscription.unsubscribe();
    }
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
}
