import { FileUtils } from '../utils/file-utils';
import { readJsonFile } from '../utils/utils';
import { Commands } from './commands';
import { createDetailedStatusCalculator } from './detailed-status-calculator';
import { Telemetry } from '../telemetry';

// todo(matt) should be handled by Commands
let commandRunIndex = 0;

export interface RunResult {
  id: string;
}

export enum ExecutableType {
  add = 'add',
  new = 'new',
  generate = 'generate',
  npm = 'npm',
  ng = 'ng'
}

// TODO(matt): next step of this refactoring is 1 level of inheritance to
// handle differences in name / path behaviour for different executables
export class Executable {
  private readonly isNvm: boolean;

  private _path = '';
  private _name: string;

  get name() {
    return this.isNvm ? 'nvm' : this._name;
  }

  set name(name: string) {
    this._name = name;
  }

  get path() {
    return this.isNvm ? `nvm exec ${this._path}` : this._path;
  }

  set path(path: string) {
    this._path = path;
  }

  hasPath(): boolean {
    return this._path !== '';
  }

  constructor(
    name: string,
    private readonly telemetry: Telemetry,
    private readonly buildTerminal: PseudoTerminalFactory,
    private readonly fileUtils: FileUtils,
    private readonly commands: Commands
  ) {
    this._name = name;
    this.isNvm = fileUtils.supportsNvm() && fileUtils.useNvm();
  }

  run(
    type: ExecutableType,
    cwd: string,
    cmds: string[],
    addToRecent: boolean = true
  ): RunResult {
    if (!this.hasPath()) {
      throw new Error('setPath of this executable before running');
    }

    const workspace = workspaceName(type, cwd);
    const statusCalculator = createDetailedStatusCalculator(cwd, cmds);

    const id = `${this.name} ${cmds.join(' ')} ${commandRunIndex++}`;
    let command = `${this.path} ${cmds.join(' ')}`;

    // We currently don't support the windows implementation of NVM.
    if (this.isNvm) {
      command = `nvm exec ${command}`;
      cmds = ['exec', this.path, ...cmds];
    }

    const factory = () => {
      const start = process.hrtime();

      const commandRunning = this.buildTerminal({
        displayCommand: command,
        name: id,
        program: this.path,
        args: cmds,
        cwd,
        isDryRun: !addToRecent,
        isWsl: this.fileUtils.isWsl()
      });

      if (commandRunning.onDidWriteData) {
        commandRunning.onDidWriteData(data => {
          this.commands.addOut(id, data);
        });
      }

      commandRunning.onExit(code => {
        const seconds = process.hrtime(start)[0];
        // don't record dry runs
        if (addToRecent) {
          this.telemetry.commandRun(type, seconds);
        }
        this.commands.setFinalStatus(id, code === 0 ? 'successful' : 'failed');
      });

      return commandRunning;
    };

    this.commands.addCommand(
      type,
      id,
      workspace,
      command,
      factory,
      statusCalculator,
      addToRecent
    );
    this.commands.startCommand(id);

    return { id };
  }
}

function workspaceName(type: ExecutableType, cwd: string): string | null {
  let name = null;

  if (type !== ExecutableType.new) {
    const json = readJsonFile('./package.json', cwd).json;
    name = json.name;
  }

  return name;
}

export interface PseudoTerminal {
  onDidWriteData?(callback: (data: string) => void): void;

  onExit(callback: (code: number) => void): void;

  setCols?(cols: number): void;

  kill(): void;
}

export interface PseudoTerminalConfig {
  /** Human-readable string which will be used to represent the terminal in the UI. */
  name: string;
  program: string;
  args: string[];
  isDryRun: boolean;
  cwd: string;
  displayCommand: string;
  isWsl: boolean;
}

export type PseudoTerminalFactory = (
  config: PseudoTerminalConfig
) => PseudoTerminal;
