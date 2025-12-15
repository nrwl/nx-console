import z from 'zod';

// ============================================================================
// Output Schemas for Structured Content
// ============================================================================
// These schemas use .passthrough() to allow unknown properties for forward
// compatibility with new Nx versions. Core fields are strictly typed.

// Target schema - uses passthrough() to allow metadata and other unknown fields
// All fields are optional and permissive to handle varying plugin outputs
const targetSchema = z
  .object({
    executor: z.string().optional(),
    command: z.string().optional(),
    options: z.record(z.string(), z.unknown()).optional(),
    configurations: z.record(z.string(), z.unknown()).optional(),
    inputs: z.array(z.unknown()).optional(),
    outputs: z.array(z.unknown()).optional(),
    dependsOn: z.array(z.unknown()).optional(),
    cache: z.boolean().optional(),
    defaultConfiguration: z.string().optional(),
    parallelism: z.boolean().optional(),
    continuous: z.boolean().optional(),
    syncGenerators: z.array(z.unknown()).optional(),
  })
  .passthrough();

// Project schema - uses passthrough() to allow metadata and other unknown fields
// All fields are optional and permissive to handle varying plugin outputs
export const projectSchema = z
  .object({
    name: z.string().optional(),
    root: z.string().optional(),
    sourceRoot: z.string().optional(),
    projectType: z.string().optional(),
    targets: z.record(z.string(), targetSchema).optional(),
    tags: z.array(z.unknown()).optional(),
    implicitDependencies: z.array(z.unknown()).optional(),
    namedInputs: z.record(z.string(), z.unknown()).optional(),
    generators: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

// Dependency schema - all fields optional for maximum permissiveness
const dependencySchema = z
  .object({
    source: z.string().optional(),
    target: z.string().optional(),
    type: z.string().optional(),
  })
  .passthrough();

// Output schema shapes for registerTool (must be ZodRawShape, not ZodObject)
export const nxWorkspaceOutputSchema = {
  projects: z.array(projectSchema),
  dependencies: z.record(z.string(), z.array(dependencySchema)),
  nxJson: z.record(z.string(), z.unknown()).optional(),
  errors: z
    .array(
      z.object({
        message: z.string().optional(),
      }),
    )
    .optional(),
};

export const nxProjectDetailsOutputSchema = {
  ...projectSchema.shape,
  projectDependencies: z.array(z.unknown()),
  externalDependencies: z.array(z.unknown()),
};

// Full ZodObject versions for validation in tests
export const nxWorkspaceOutputValidator = z.object(nxWorkspaceOutputSchema);
export const nxProjectDetailsOutputValidator = z.object(
  nxProjectDetailsOutputSchema,
);

// Infer TypeScript types from schemas for use in tool handlers
export type NxWorkspaceOutput = z.infer<typeof nxWorkspaceOutputValidator>;
export type NxProjectDetailsOutput = z.infer<
  typeof nxProjectDetailsOutputValidator
>;
