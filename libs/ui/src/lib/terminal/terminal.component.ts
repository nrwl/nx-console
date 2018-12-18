import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { fromEvent } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { TerminalFactory } from './terminal.factory';

const DEBOUNCE_TIME = 300;
const SCROLL_BAR_WIDTH = 48;
const MIN_TERMINAL_WIDTH = 20;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ui-terminal',
  templateUrl: './terminal.component.html',
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    'terminal.component.scss',
    '../../../../../node_modules/xterm/dist/xterm.css'
  ]
})
export class TerminalComponent implements AfterViewInit, OnDestroy {
  private output = '';
  private readonly term = this.terminalFactory.new({
    disableStdin: true,
    fontSize: 14
  });
  private readonly resizeSubscription = fromEvent(window, 'resize')
    .pipe(debounceTime(DEBOUNCE_TIME))
    .subscribe(() => {
      this.resizeTerminal();
    });

  @ViewChild('code', { read: ElementRef })
  private readonly code: ElementRef;

  @Input() command: string;

  @Input()
  set outChunk(s: string) {
    if (!s) {
      return;
    }
    this.output += s;
    this.writeOutput(s);
  }

  @Input()
  set out(s: string) {
    this.output = s;
    this.writeOutput(s);
  }

  constructor(private readonly terminalFactory: TerminalFactory) {}

  ngAfterViewInit(): void {
    this.term.open(this.code.nativeElement);
    this.resizeTerminal();
  }

  ngOnDestroy() {
    this.resizeSubscription.unsubscribe();
  }

  private writeOutput(output: string) {
    if (!this.output || !this.code) {
      return;
    }
    this.term.write(output);
  }

  private writeFullCachedOutput() {
    if (!this.output || !this.code) {
      return;
    }
    this.term.write(this.output);
  }

  reset() {
    this.output = '';
    this.term.reset();
  }

  resizeTerminal() {
    setTimeout(() => {
      const renderer = (this.term as any).renderer;
      if (!renderer) {
        return;
      }
      const height = (this.code.nativeElement as HTMLElement).clientHeight;
      const width =
        (this.code.nativeElement as HTMLElement).clientWidth - SCROLL_BAR_WIDTH;
      const cols = Math.max(
        MIN_TERMINAL_WIDTH,
        Math.floor(width / renderer.dimensions.actualCellWidth)
      );
      const rows = Math.floor(height / renderer.dimensions.actualCellHeight);
      // If dimensions did not change, no need to reset.
      if (this.term.rows !== rows || this.term.cols !== cols) {
        renderer.clear();
        this.term.reset();
        this.term.resize(cols, rows);
        this.writeFullCachedOutput();
      }
    });
  }
}
