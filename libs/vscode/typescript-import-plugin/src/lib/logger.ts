import type ts from 'typescript/lib/tsserverlibrary';

export class Logger {
  public static create(info: ts.server.PluginCreateInfo) {
    return new Logger(info.project.projectService.logger);
  }

  private constructor(private readonly _logger: ts.server.Logger) {}

  log(message: string): void {
    this._logger.info(`NX Imports Plugin: ${message}`);
  }
}
