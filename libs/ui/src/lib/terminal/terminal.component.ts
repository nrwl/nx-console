import { Settings } from '@angular-console/utils';
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
import { first } from 'rxjs/operators';
import { Terminal } from 'xterm';
import { fit } from 'xterm/lib/addons/fit/fit';

import { TerminalFactory } from './terminal.factory';

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

  @ViewChild('code', { read: ElementRef, static: true })
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
    private readonly settings: Settings,
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
              fontFamily: 'Roboto Mono',
              windowsMode: Boolean(
                this.settings.isWindows() && !this.settings.isWsl()
              )
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
      this.term.pipe(first()).subscribe(term => {
        term.open(this.code.nativeElement);

        this.resizeObserver = new ResizeObserver(() => {
          fit(term);
        });

        this.resizeObserver.observe(this.code.nativeElement);
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
}
