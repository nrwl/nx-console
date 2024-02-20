export interface CliTaskDefinition {
  positional: string;
  command: string;
  flags: Array<string>;
  cwd?: string;
  problemMatchers?: string | string[] | undefined;
}
