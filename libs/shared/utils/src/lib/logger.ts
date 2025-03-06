export interface Logger {
  log(message: string, ...args: any[]): void;
}

export const consoleLogger: Logger = {
  log: console.log,
};
