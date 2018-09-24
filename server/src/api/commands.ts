import * as os from 'os';
import { DetailedStatusCalculator } from './detailed-status-calculator';

interface CommandInformation {
  id: string;
  type: string;
  workspace: string;
  command: string;
  status: string; // TOOD: vsavkin should convert status into an enum
  outChunk: string;
  out: string;
  factory: Function;
  commandRunning: any;
  detailedStatusCalculator: DetailedStatusCalculator<any>;
}

export class RecentCommands {
  commandInfos = [] as CommandInformation[];

  constructor(private readonly MAX_COMMANDS: number) {}

  addCommand(
    type: string,
    id: string,
    workspace: string,
    command: string,
    factory: any,
    detailedStatusCalculator: DetailedStatusCalculator<any>
  ) {
    if (this.commandInfos.length >= this.MAX_COMMANDS) {
      if (!this.hasCompletedCommands(this.commandInfos)) {
        throw new Error(
          `Cannot run more than ${this.MAX_COMMANDS} commands in parallel`
        );
      }
      this.commandInfos = this.withoutFirstCompletedCommand(this.commandInfos);
    }

    this.commandInfos = [
      {
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
      },
      ...this.commandInfos
    ];
  }

  restartCommand(id: string) {
    const c = this.findMatchingCommand(id, this.commandInfos);
    if (c) {
      if (c.status === 'in-progress') {
        this.stopCommands(this.getCommandById(id));
      }
      c.out = '';
      c.outChunk = '';
      c.status = 'in-progress';
      c.commandRunning = c.factory();
      c.detailedStatusCalculator.reset();
    }
  }

  addOut(id: string, out: string) {
    const c = this.findMatchingCommand(id, this.commandInfos);
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
    const c = this.findMatchingCommand(id, this.commandInfos);
    if (c) {
      if (c.status === 'in-progress' || c.status === 'waiting') {
        c.status = status;
      }
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

  getCommandById(id: string) {
    return this.commandInfos.filter(c => c.id === id);
  }

  stopCommands(commands: CommandInformation[]) {
    commands.forEach(c => {
      if (c.status === 'in-progress') {
        c.status = 'terminated';
        c.detailedStatusCalculator.setStatus('terminated');
        if (os.platform() === 'win32') {
          c.commandRunning.kill();
        } else {
          c.commandRunning.kill('SIGKILL');
        }
        c.commandRunning = null;
      }
    });
  }

  removeAllCommands() {
    const commandInfos = this.commandInfos;
    this.commandInfos = [];
    this.stopCommands(commandInfos);
  }

  removeCommand(id: string) {
    const commandToRemove = this.getCommandById(id);
    this.commandInfos = this.withoutCommandWithId(id, this.commandInfos);
    this.stopCommands(commandToRemove);
  }

  private hasCompletedCommands(commands: CommandInformation[]) {
    return !!this.commandInfos.find(c => this.isCompleted(c));
  }

  private withoutFirstCompletedCommand(commands: CommandInformation[]) {
    const index = this.commandInfos.findIndex(c => this.isCompleted(c));
    return [
      ...this.commandInfos.slice(0, index),
      ...this.commandInfos.slice(index + 1)
    ];
  }

  private withoutCommandWithId(id: string, commands: CommandInformation[]) {
    const index = this.commandInfos.findIndex(c => c.id === id);
    return [
      ...this.commandInfos.slice(0, index),
      ...this.commandInfos.slice(index + 1)
    ];
  }

  private findMatchingCommand(id: string, commands: CommandInformation[]) {
    return this.commandInfos.find(c => c.id === id);
  }

  private isCompleted(c: CommandInformation): boolean {
    return (
      c.status === 'successful' ||
      c.status === 'failed' ||
      c.status === 'terminated'
    );
  }
}
