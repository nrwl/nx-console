import { GeneratorSchema } from '@nx-console/shared/generate-ui-types';
import { SchemaProcessor } from '../nx-console-plugin-types';
import { NxWorkspace } from '@nx-console/shared/types';
import { isProjectOption } from '@nx-console/shared/schema';

export const addProjectItemsToOptionProcessor: SchemaProcessor = (
  schema: GeneratorSchema,
  workspace: NxWorkspace
) => {
  return {
    ...schema,
    options: (schema.options ?? []).map((option) => {
      const projects = Object.keys(workspace.workspace.projects);
      if (isProjectOption(option) && projects.length > 0) {
        option.items = projects.sort();
      }
      return option;
    }),
  };
};
