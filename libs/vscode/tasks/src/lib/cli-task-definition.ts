export interface CliTaskDefinition {
  positional: string;
  command: string;
  flags: Array<string>;
  cwd?: string;
}
