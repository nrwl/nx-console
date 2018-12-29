import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import ResizeObserver from 'resize-observer-polyfill';

import { TerminalFactory } from './terminal.factory';
import { Terminal } from 'xterm';
const SCROLL_BAR_WIDTH = 36;
const MIN_TERMINAL_WIDTH = 80;
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
  private term: Terminal;
  private resizeObserver?: ResizeObserver;

  @ViewChild('code', { read: ElementRef })
  private readonly code: ElementRef;

  @Input() command: string;

  @Input()
  set outChunk(s: string) {
    this.ngZone.runOutsideAngular(() => {
      if (!s) {
        return;
      }
      this.output += s;
      this.writeOutput(s);
    });
  }

  @Input()
  set out(s: string) {
    this.ngZone.runOutsideAngular(() => {
      this.output = s;
      this.writeOutput(s);
    });
  }

  constructor(
    private readonly terminalFactory: TerminalFactory,
    private readonly elementRef: ElementRef,
    private readonly ngZone: NgZone
  ) {
    ngZone.runOutsideAngular(() => {
      this.term = this.terminalFactory.new({
        disableStdin: true,
        fontSize: 14,
        cursorStyle: 'underline',
        enableBold: true,
        cursorBlink: false,
        fontFamily: 'Roboto Mono',
        theme: {
          cursor: 'rgb(0, 0, 0)'
        }
      });
    });
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.term.open(this.code.nativeElement);
      this.resizeTerminal();

      this.resizeObserver = new ResizeObserver(() => {
        this.resizeTerminal();
      });

      this.resizeObserver.observe(this.elementRef.nativeElement);
    });
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  private writeOutput(output: string) {
    this.ngZone.runOutsideAngular(() => {
      if (!this.output || !this.code) {
        return;
      }

      this.term.write(output);
    });
  }

  reset() {
    this.ngZone.runOutsideAngular(() => {
      this.output = '';
      this.term.reset();
    });
  }

  private resizeTerminal() {
    this.ngZone.runOutsideAngular(() => {
      const renderer = (this.term as any)._core.renderer;
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
      if (this.term.cols !== cols || this.term.rows !== rows) {
        this.term.resize(cols, rows);
      }
    });
  }
}
