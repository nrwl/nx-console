import { AjvJsonSchemaValidator } from '@modelcontextprotocol/client/validators/ajv';
import { workspaceRoot } from 'nx/src/devkit-exports';
import { relaxProjectSchema, loadNxOutputSchemas } from './output-schemas';

// The shape @nx/cypress 24 infers for an atomized `e2e-ci` target.
const atomizedE2eProject = {
  name: 'e2e',
  root: 'e2e',
  targets: {
    'e2e-ci': {
      executor: 'nx:noop',
      inputs: ['default', { externalDependencies: ['cypress'] }],
      dependsOn: [
        {
          target: 'e2e-ci--src/e2e/app.cy.ts',
          params: 'forward',
          options: 'forward',
        },
      ],
    },
  },
};

describe('loadNxOutputSchemas', () => {
  const validator = new AjvJsonSchemaValidator();

  it('accepts dependsOn entries that forward options', async () => {
    const { nxWorkspaceOutputSchema, nxProjectDetailsOutputSchema } =
      await loadNxOutputSchemas(workspaceRoot);

    // Make sure the real project schema was loaded, not the permissive fallback.
    expect(nxWorkspaceOutputSchema['definitions']).toBeDefined();

    const workspaceResult = validator.getValidator(nxWorkspaceOutputSchema)({
      projects: [atomizedE2eProject],
      dependencies: {},
    });
    expect(workspaceResult.errorMessage).toBeUndefined();
    expect(workspaceResult.valid).toBe(true);

    const projectDetailsResult = validator.getValidator(
      nxProjectDetailsOutputSchema,
    )({
      ...atomizedE2eProject,
      projectDependencies: [],
      externalDependencies: [],
    });
    expect(projectDetailsResult.errorMessage).toBeUndefined();
    expect(projectDetailsResult.valid).toBe(true);
  });

  it('still rejects values of the wrong type', async () => {
    const { nxWorkspaceOutputSchema } =
      await loadNxOutputSchemas(workspaceRoot);

    const result = validator.getValidator(nxWorkspaceOutputSchema)({
      projects: [
        { ...atomizedE2eProject, targets: { 'e2e-ci': { dependsOn: [42] } } },
      ],
      dependencies: {},
    });
    expect(result.valid).toBe(false);
  });
});

describe('relaxProjectSchema', () => {
  it('drops additionalProperties: false, turns oneOf into anyOf and keeps everything else', () => {
    expect(
      relaxProjectSchema({
        type: 'object',
        additionalProperties: false,
        properties: {
          a: {
            oneOf: [{ type: 'string' }, { additionalProperties: false }],
          },
          b: { additionalProperties: { type: 'string' } },
          c: { additionalProperties: true },
        },
      }),
    ).toEqual({
      type: 'object',
      properties: {
        a: { anyOf: [{ type: 'string' }, {}] },
        b: { additionalProperties: { type: 'string' } },
        c: { additionalProperties: true },
      },
    });
  });
});
