import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
  ViewEncapsulation,
  ChangeDetectionStrategy
} from '@angular/core';
import { fromEvent } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { Terminal } from 'xterm';

const DEBOUNCE_TIME = 300;
const SCROLL_BAR_WIDTH = 48;

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
  term = new Terminal({ disableStdin: true, fontSize: 12 });

  resizeSubscription = fromEvent(window, 'resize')
    .pipe(debounceTime(DEBOUNCE_TIME))
    .subscribe(() => {
      this.resizeTerminal();
    });

  @ViewChild('code', { read: ElementRef })
  code: ElementRef;

  output: string;

  @Input() command: string;

  @Input()
  set input(s: string) {
    this.output = s;
    this.writeOutput();
  }

  writeOutput() {
    const s = this.output;
    if (this.code) {
      this.term.write(s);
    }
  }

  ngAfterViewInit(): void {
    this.term.open(this.code.nativeElement);
    this.resizeTerminal();
  }

  ngOnDestroy() {
    this.resizeSubscription.unsubscribe();
  }

  clear() {
    this.term.clear();
  }

  resizeTerminal() {
    const renderer = (this.term as any).renderer;
    renderer.clear();

    const height = (this.code.nativeElement as HTMLElement).clientHeight;
    const width =
      (this.code.nativeElement as HTMLElement).clientWidth - SCROLL_BAR_WIDTH;

    const cols = Math.floor(width / renderer.dimensions.actualCellWidth);
    const rows = Math.floor(height / renderer.dimensions.actualCellHeight);

    if (this.term.rows !== rows || this.term.cols !== cols) {
      this.term.clear();
      this.term.resize(cols, rows);
      this.writeOutput();
    }
  }
}
