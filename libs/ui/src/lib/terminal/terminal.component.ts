import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { Terminal } from 'xterm';

import { fromEvent } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Component({
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
    .pipe(debounceTime(350))
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
    const width = (this.code.nativeElement as HTMLElement).clientWidth - 48;

    const cols = Math.floor(width / renderer.dimensions.actualCellWidth);
    const rows = Math.floor(height / renderer.dimensions.actualCellHeight);

    if (this.term.rows !== rows || this.term.cols !== cols) {
      this.term.clear();
      this.term.resize(cols, rows);
      this.writeOutput();
    }
  }
}
