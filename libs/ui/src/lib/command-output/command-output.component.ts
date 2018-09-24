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
const COMMAND_REGEXP = /^\w+\s+([a-zA-Z0-9-_]+?)(\s+.*)?$/;

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
  @Input() commandResponse: CommandResponse;
  @Input() emptyTemplate?: TemplateRef<void>;
  @Input() rawOutputVisibilityChange?: (isVisible: boolean) => void;

  rawOutputVisible = false;
  private readOutputLineCount = 0;

  getType() {
    const cmd =
      this.command ||
      (this.commandResponse ? this.commandResponse.command : '');
    const match = cmd.match(COMMAND_REGEXP);
    if (match) {
      return match[1];
    } else {
      return '';
    }
  }

  getCommand() {
    return (
      this.command || (this.commandResponse ? this.commandResponse.command : '')
    );
  }

  getOutput() {
    return this.commandResponse ? this.commandResponse.out : '';
  }

  getUnreadOutputCount() {
    const total = this.getOutputLineCount();
    const readSoFar = this.readOutputLineCount;
    const diff = total - readSoFar;
    return diff === 0 ? '' : `${diff < 10 ? diff : '9+'}`;
  }

  private getOutputLineCount() {
    // Remove initial line from count.
    return this.getOutput().split(/[\r\n]/).length - 1;
  }

  reset() {
    if (this.terminal) {
      this.readOutputLineCount = 0;
      this.terminal.reset();
    }
  }

  resizeTerminal() {
    if (this.terminal) {
      this.terminal.resizeTerminal();
    }
  }

  onRawOutputToggle() {
    this.rawOutputVisible = !this.rawOutputVisible;
    if (this.rawOutputVisible) {
      this.readOutputLineCount = this.getOutputLineCount();
    }
    setTimeout(() => this.resizeTerminal(), ANIMATION_DURATION);
  }

  isStopped() {
    const commandResponse = this.commandResponse;
    return commandResponse ? commandResponse.status === 'terminated' : true;
  }
}
