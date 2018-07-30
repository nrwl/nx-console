/**
 * Copyright (c) 2012-2015, Christopher Jeffrey, Peter Sunde (MIT License)
 * Copyright (c) 2016, Daniel Imms (MIT License).
 */

import * as path from 'path';
import { Terminal as BaseTerminal } from './terminal';
import { ITerminal, IPtyOpenOptions, IPtyForkOptions } from './interfaces';
import { ArgvOrCommandLine } from './types';

let Terminal: any;
if (process.platform === 'win32') {
  Terminal = require('./windowsTerminal').WindowsTerminal;
} else {
  Terminal = require('./unixTerminal').UnixTerminal;
}

/**
 * Forks a process as a pseudoterminal.
 * @param file The file to launch.
 * @param args The file's arguments as argv (string[]) or in a pre-escaped
 * CommandLine format (string). Note that the CommandLine option is only
 * available on Windows and is expected to be escaped properly.
 * @param options The options of the terminal.
 * @see CommandLineToArgvW https://msdn.microsoft.com/en-us/library/windows/desktop/bb776391(v=vs.85).aspx
 * @see Parsing C++ Comamnd-Line Arguments https://msdn.microsoft.com/en-us/library/17w5ykft.aspx
 * @see GetCommandLine https://msdn.microsoft.com/en-us/library/windows/desktop/ms683156.aspx
 */
export function spawn(
  file?: string,
  args?: ArgvOrCommandLine,
  opt?: IPtyForkOptions
): ITerminal {
  return new Terminal(file, args, opt);
}

/** @deprecated */
export function fork(
  file?: string,
  args?: ArgvOrCommandLine,
  opt?: IPtyForkOptions
): ITerminal {
  return new Terminal(file, args, opt);
}

/** @deprecated */
export function createTerminal(
  file?: string,
  args?: ArgvOrCommandLine,
  opt?: IPtyForkOptions
): ITerminal {
  return new Terminal(file, args, opt);
}

export function open(options: IPtyOpenOptions): ITerminal {
  return Terminal.open(options);
}

/**
 * Expose the native API when not Windows, note that this is not public API and
 * could be removed at any time.
 */
export const native =
  process.platform !== 'win32'
    ? require(path.join('..', 'build', 'Release', 'pty.node'))
    : null;
