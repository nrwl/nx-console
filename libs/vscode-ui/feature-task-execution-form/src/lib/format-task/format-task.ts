import {
  TaskExecutionSchema,
  WORKSPACE_GENERATOR_NAME_REGEX,
} from '@nx-console/schema';

export const formatTask = (
  architect: TaskExecutionSchema,
  configuration?: string
): string => {
  architect = handleWorkspaceGenerators(architect);

  const commandBuilder = [
    architect.cliName,
    surroundWithQuotesIfHasWhiteSpace(architect.command),
    surroundWithQuotesIfHasWhiteSpace(architect.positional),
  ];
  if (configuration) {
    commandBuilder.push(getConfigurationFlag(configuration));
  }
  return commandBuilder.join(' ');
};

export const getConfigurationFlag = (configuration?: string): string => {
  if (!configuration || !configuration.length) {
    return '';
  } else {
    return `--configuration ${configuration}`;
  }
};

function handleWorkspaceGenerators(
  architect: TaskExecutionSchema
): TaskExecutionSchema {
  const positionals = architect.positional?.match(
    WORKSPACE_GENERATOR_NAME_REGEX
  );
  let newArchitect = { ...architect };
  if (
    newArchitect.command === 'generate' &&
    positionals &&
    positionals.length
  ) {
    newArchitect = {
      ...architect,
      cliName: 'nx',
      command: `workspace-${positionals[1]}`,
      positional: positionals[2],
    };
  }
  return newArchitect;
}

function surroundWithQuotesIfHasWhiteSpace(target: string): string {
  if (target.match(/\s/g)) {
    return `"${target}"`;
  }
  return target;
}
