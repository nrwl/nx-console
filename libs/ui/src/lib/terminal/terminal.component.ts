import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { Terminal } from 'xterm';

@Component({
  selector: 'ui-terminal',
  templateUrl: './terminal.component.html',
  styleUrls: ['../../../../../node_modules/xterm/dist/xterm.css']
})
export class TerminalComponent implements AfterViewInit {
  term = new Terminal({disableStdin: true, fontSize: 12, cols: 120});

  @ViewChild("code", { read: ElementRef }) code: ElementRef;

  @Input()
  set input(s: string) {
    if (this.code && s) {
      if (s.indexOf('\n') > -1) {
        s.split('\n').forEach(ss => {
          this.term.writeln(ss);
        });
      } else {
        this.term.write(s);
      }
    }
  }

  ngAfterViewInit(): void {
    this.term.open(this.code.nativeElement);
  }

  clear() {
    this.term.clear();
  }
}
