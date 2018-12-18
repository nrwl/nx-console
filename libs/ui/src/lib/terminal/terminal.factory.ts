import { Terminal, ITerminalOptions } from 'xterm';

export class TerminalFactory {
  new(options?: ITerminalOptions | undefined): Terminal {
    return new Terminal(options);
  }
}
