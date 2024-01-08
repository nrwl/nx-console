import { GeneratorSchema } from '@nx-console/shared/generate-ui-types';
import { SchemaProcessor } from '../nx-console-plugin-types';
import { NxWorkspace } from '@nx-console/shared/types';

export const prefillProjectAndDirProcessor: SchemaProcessor = (
  schema: GeneratorSchema,
  workspace: NxWorkspace
) => {
  schema.context = schema.context ?? {};
  schema.context.prefillValues = schema.context.prefillValues ?? {};

  // before nx 17, path/directory options are inconsistent so we don't prefill project & directory simultaneously
  // keep in mind that we normalize directory by appsDir & libsDir
  if (workspace.nxVersion.major < 17) {
    if (schema.context?.project) {
      schema.context.prefillValues = {
        ...(schema.context.prefillValues ?? {}),
        project: schema.context.project,
        projectName: schema.context.project,
        directory: '',
      };
    } else if (schema.context?.normalizedDirectory) {
      schema.context.prefillValues = {
        ...(schema.context.prefillValues ?? {}),
        directory: schema.context.normalizedDirectory,
      };
    }
  }

  // after nx 18 the format options will be removed.
  // That means we should prefill cwd unless there's still a project / projectName option
  if (workspace.nxVersion.major >= 18) {
    if (
      schema.options.find(
        (o) => o.name === 'project' || o.name === 'projectName'
      )
    ) {
      prefillProject();
    } else {
      prefillDirectoryAsCwd();
    }
  }

  // after nx 17, we prefill the cwd
  // project is also prefilled if there is no nameAndDirectoryFormat (which ignores project)
  prefillDirectoryAsCwd();
  if (
    schema.options.find(
      (o) => o.name === 'project' || o.name === 'projectName'
    ) &&
    schema.options.every((o) => o.name !== 'nameAndDirectoryFormat')
  ) {
    prefillProject();
  }

  return schema;

  function prefillDirectoryAsCwd() {
    if (schema.context?.directory && schema.context?.prefillValues) {
      schema.context.prefillValues = {
        ...schema.context.prefillValues,
        cwd: schema.context?.directory,
      };
    } else if (schema.context?.project && schema.context?.prefillValues) {
      const projectRoot =
        workspace.workspace.projects[schema.context.project].root;
      schema.context.prefillValues = {
        ...schema.context.prefillValues,
        cwd: projectRoot,
      };
    }
  }

  function prefillProject() {
    if (schema.context?.project) {
      schema.context.prefillValues = {
        ...(schema.context.prefillValues ?? {}),
        project: schema.context.project,
        projectName: schema.context.project,
      };
    }
  }
};
