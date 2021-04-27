import {
  TaskExecutionSchema,
  WORKSPACE_GENERATOR_NAME_REGEX,
} from '@nx-console/schema';

export const formatTask = (architect: TaskExecutionSchema): string => {
  const positionals = architect.positional.match(
    WORKSPACE_GENERATOR_NAME_REGEX
  );
  if (architect.command === 'generate' && positionals && positionals.length) {
    architect = {
      ...architect,
      cliName: 'nx',
      command: `workspace-${positionals[1]}`,
      positional: positionals[2],
    };
  }
  return `${architect.cliName} ${architect.command} ${architect.positional}`;
};
