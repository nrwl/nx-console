import { DetailedStatusCalculator } from './detailed-status-calculator';
import { PseudoTerminal } from './run-command';

export interface CommandInformation {
  id: string;
  type: string;
  workspace: string;
  command: string;
  status: string; // TOOD: vsavkin should convert status into an enum
  outChunk: string;
  out: string;
  factory: Function;
  commandRunning: PseudoTerminal | null;
  detailedStatusCalculator: DetailedStatusCalculator<any>;
}

export class Commands {
  recent = [] as CommandInformation[];
  history = [] as CommandInformation[];

  constructor(
    private readonly MAX_RECENT: number,
    private readonly MAX_HISTORY: number
  ) {}

  addCommand(
    type: string,
    id: string,
    workspace: string,
    command: string,
    factory: any,
    detailedStatusCalculator: DetailedStatusCalculator<any>,
    addToRecent: boolean = true
  ) {
    const item = {
      id,
      type,
      workspace,
      command,
      status: 'waiting',
      out: '',
      outChunk: '',
      factory,
      detailedStatusCalculator,
      commandRunning: null
    };
    this.insertIntoHistory(item);
    if (addToRecent) {
      this.insertIntoRecent(item);
    }
  }

  restartCommand(id: string) {
    const c = this.findMatchingCommand(id, this.recent);
    if (c) {
      if (c.status === 'in-progress') {
        this.stopCommands([c]);
      }
      const restarted = {
        ...c,
        status: 'in-progress',
        out: '',
        outChunk: '',
        commandRunning: c.factory()
      };
      this.insertIntoHistory(restarted);
      this.insertIntoRecent(restarted);
      restarted.detailedStatusCalculator.reset();
    }
  }

  stopCommands(commands: CommandInformation[]) {
    commands.forEach(c => {
      if (c.status === 'in-progress') {
        c.status = 'terminated';
        c.detailedStatusCalculator.setStatus('terminated');
        if (c.commandRunning) {
          c.commandRunning.kill();
          c.commandRunning = null;
        }
      }
    });
  }

  startCommand(id: string) {
    const command = this.findMatchingCommand(id, this.history);
    if (command) {
      command.commandRunning = command.factory();
      command.status = 'in-progress';
    }
  }

  addOut(id: string, out: string) {
    const c = this.findMatchingCommand(id, this.history);
    if (c) {
      c.out += out;
      c.outChunk += out;
      try {
        c.detailedStatusCalculator.addOut(out);
      } catch (e) {
        // Because detailedStatusCalculator are implemented
        // without the build event protocol for now, they may fail.
        // Console must remain working after their failure.
        console.error('detailedStatusCalculator.addOut failed', e.message);
      }
    }
  }

  // TOOD: vsavkin should convert status into an enum
  setFinalStatus(id: string, status: string) {
    const c = this.findMatchingCommand(id, this.history);
    if (c && (c.status === 'in-progress' || c.status === 'waiting')) {
      this.setStatus(id, status);
    }
  }

  // TOOD: vsavkin should convert status into an enum
  setStatus(id: string, status: string) {
    const c = this.findMatchingCommand(id, this.history);
    if (c) {
      c.status = status;
      try {
        c.detailedStatusCalculator.setStatus(c.status as any);
      } catch (e) {
        // Because detailedStatusCalculator are implemented
        // without the build event protocol for now, they may fail.
        // Console must remain working after their failure.
        console.error('detailedStatusCalculator.setStatus failed', e);
      }
    }
  }

  removeCommand(id: string) {
    const command = this.findMatchingCommand(id, this.recent);
    if (command) {
      this.stopCommands([command]);
    }
    this.recent = this.withoutCommandWithId(id, this.recent);
  }

  removeAllCommands() {
    const commandInfos = this.recent;
    this.recent = [];
    this.stopCommands(commandInfos);
  }

  findMatchingCommand(id: string, commands: CommandInformation[]) {
    return [...commands].reverse().find(c => c.id === id);
  }

  private insertIntoRecent(c: CommandInformation) {
    const sameIdIndex = this.recent.findIndex(r => r.id === c.id);
    if (sameIdIndex > -1) {
      this.recent = [
        ...this.recent.slice(0, sameIdIndex),
        c,
        ...this.recent.slice(sameIdIndex + 1)
      ];
    } else if (this.recent.length === this.MAX_RECENT) {
      if (!this.hasCompletedCommands(this.recent)) {
        throw new Error(
          `Cannot run more than ${this.MAX_RECENT} commands in parallel`
        );
      }
      this.recent = [...this.withoutFirstCompletedCommand(this.recent), c];
    } else {
      this.recent = [...this.recent, c];
    }
  }

  private insertIntoHistory(c: CommandInformation) {
    const preservedHistory =
      this.history.length === this.MAX_HISTORY
        ? this.history.slice(1)
        : this.history;
    this.history = [...preservedHistory, c];
  }

  private hasCompletedCommands(commands: CommandInformation[]) {
    return !!commands.find(c => this.isCompleted(c));
  }

  private withoutFirstCompletedCommand(commands: CommandInformation[]) {
    const index = commands.findIndex(c => this.isCompleted(c));
    return [...commands.slice(0, index), ...commands.slice(index + 1)];
  }

  private withoutCommandWithId(id: string, commands: CommandInformation[]) {
    const index = commands.findIndex(c => c.id === id);
    return [...commands.slice(0, index), ...commands.slice(index + 1)];
  }

  private isCompleted(c: CommandInformation): boolean {
    return (
      c.status === 'successful' ||
      c.status === 'failed' ||
      c.status === 'terminated'
    );
  }
}
