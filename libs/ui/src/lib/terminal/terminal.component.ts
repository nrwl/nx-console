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
import * as FontFaceObserver from 'fontfaceobserver';
import ResizeObserver from 'resize-observer-polyfill';
import { BehaviorSubject, ReplaySubject, Subject } from 'rxjs';
import { first, debounceTime } from 'rxjs/operators';
import { Terminal } from 'xterm';

import { TerminalFactory } from './terminal.factory';

const SCROLL_BAR_WIDTH = 36;
const MIN_TERMINAL_WIDTH = 80;
const TERMINAL_CONFIG = {
  disableStdin: true,
  fontSize: 14,
  enableBold: true,
  cursorBlink: false,
  theme: {
    cursor: 'rgb(0, 0, 0)'
  }
};

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
  private readonly term = new ReplaySubject<Terminal>();
  private resizeObserver?: ResizeObserver;

  @ViewChild('code', { read: ElementRef })
  private readonly code: ElementRef;

  currentCols = new BehaviorSubject<number>(80);

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

  constructor(
    private readonly terminalFactory: TerminalFactory,
    private readonly elementRef: ElementRef,
    private readonly ngZone: NgZone
  ) {
    ngZone.runOutsideAngular(() => {
      const robotoMono = new FontFaceObserver('Roboto Mono');
      robotoMono
        .load()
        .then(() => {
          this.term.next(
            this.terminalFactory.new({
              ...TERMINAL_CONFIG,
              fontFamily: 'Roboto Mono'
            })
          );
        })
        .catch(() => {
          this.term.next(this.terminalFactory.new(TERMINAL_CONFIG));
        });
    });
  }

  resizeTerminalSubject = new Subject<void>();

  parentElement: HTMLElement;
  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      const nativeElement = this.elementRef.nativeElement as HTMLElement;
      this.parentElement = nativeElement.parentElement || nativeElement;
      this.term.pipe(first()).subscribe(term => {
        this.resizeTerminalSubject
          .asObservable()
          .pipe(debounceTime(100))
          .subscribe(() => {
            this.resizeTerminal(term);
          });
        this.resizeTerminalSubject.next();

        term.open(this.code.nativeElement);

        this.resizeObserver = new ResizeObserver(() => {
          this.resizeTerminalSubject.next();
        });

        this.resizeObserver.observe(this.parentElement);
      });
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

      this.term.pipe(first()).subscribe(term => {
        term.write(output);
      });
    });
  }

  reset() {
    this.output = '';
    this.term.pipe(first()).subscribe(term => {
      term.reset();
    });
  }

  private resizeTerminal(term: Terminal) {
    const renderer = (term as any)._core.renderer;
    if (!renderer) {
      return;
    }

    const height = this.parentElement.clientHeight;
    const width = this.parentElement.clientWidth - SCROLL_BAR_WIDTH;

    const cols = Math.max(
      MIN_TERMINAL_WIDTH,
      Math.floor(width / renderer.dimensions.actualCellWidth)
    );
    const rows = Math.floor(height / renderer.dimensions.actualCellHeight);

    // If dimensions did not change, no need to reset.
    if (term.cols !== cols || term.rows !== rows) {
      term.resize(cols, rows);
      this.currentCols.next(cols);
    }
  }
}
