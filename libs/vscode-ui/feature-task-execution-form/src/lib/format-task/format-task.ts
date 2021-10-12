import {
  TaskExecutionSchema,
  WORKSPACE_GENERATOR_NAME_REGEX,
} from '@nx-console/schema';

export const formatTask = (
  architect: TaskExecutionSchema,
  configuration?: string
): string => {
  const positionals = architect.positional?.match(
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

  return configuration
    ? `${architect.cliName} ${architect.command} ${
        architect.positional
      } ${getConfigurationFlag(configuration)}`
    : `${architect.cliName} ${architect.command} ${architect.positional}`;
};

export const getConfigurationFlag = (configuration?: string): string => {
  if (!configuration || !configuration.length) {
    return '';
  } else if (configuration === 'production') {
    return '--prod';
  } else {
    return `-c=${configuration}`;
  }
};
