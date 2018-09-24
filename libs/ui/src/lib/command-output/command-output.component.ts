import {
  ChangeDetectionStrategy,
  Component,
  Input,
  TemplateRef,
  ViewChild
} from '@angular/core';
import {
  animate,
  state,
  style,
  transition,
  trigger
} from '@angular/animations';
import { TerminalComponent } from '../terminal/terminal.component';
import { CommandResponse } from '@angular-console/utils';

const ANIMATION_DURATION = 250;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ui-command-output',
  templateUrl: './command-output.component.html',
  styleUrls: ['./command-output.component.scss'],
  animations: [
    trigger('growShrink', [
      state('void', style({ width: '100vw' })),
      state('shrink', style({ width: '30vw' })),
      state('grow', style({ width: '100vw' })),
      transition(
        `shrink <=> grow`,
        animate(`${ANIMATION_DURATION}ms ease-in-out`)
      )
    ])
  ]
})
export class CommandOutputComponent {
  @ViewChild(TerminalComponent) terminal: TerminalComponent;
  @Input() command: string;
  @Input()
  set commandResponse(x: CommandResponse) {
    if (x && x.outChunk && !this.rawOutputVisible) {
      this.hasUnreadResponse = true;
    }
    this._commandResponse = x;
  }
  get commandResponse() {
    return this._commandResponse;
  }
  @Input() emptyTemplate?: TemplateRef<void>;
  @Input() rawOutputVisibilityChange?: (isVisible: boolean) => void;

  _commandResponse: CommandResponse;
  rawOutputVisible = false;
  hasUnreadResponse = false;

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

  onRawOutputToggle() {
    this.rawOutputVisible = !this.rawOutputVisible;
    if (this.rawOutputVisible) {
      this.hasUnreadResponse = false;
    }
    setTimeout(() => this.resizeTerminal(), ANIMATION_DURATION);
  }

  isStopped() {
    const commandResponse = this.commandResponse;
    return commandResponse ? commandResponse.status === 'terminated' : true;
  }
}
