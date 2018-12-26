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
import { fromEvent, Subscription } from 'rxjs';

import { TerminalFactory } from './terminal.factory';
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
  private resizeSubscription?: Subscription;

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

  constructor(
    private readonly terminalFactory: TerminalFactory,
    private readonly ngZone: NgZone
  ) {}

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.term.open(this.code.nativeElement);
      this.resizeTerminal();

      this.resizeSubscription = fromEvent(window, 'resize').subscribe(() => {
        this.ngZone.runOutsideAngular(() => this.resizeTerminal());
      });
    });
  }

  ngOnDestroy() {
    if (this.resizeSubscription) {
      this.resizeSubscription.unsubscribe();
    }
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
  }
}
