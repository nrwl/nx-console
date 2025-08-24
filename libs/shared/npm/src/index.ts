export * from './lib/workspace-dependencies';
export * from './lib/find-nx-package-path';
export * from './lib/package-details';
export * from './lib/pnp-dependencies';
export { checkIsNxWorkspace } from './lib/check-is-nx-workspace';
export { getNxExecutionCommand } from './lib/get-nx-execution-command';

export {
  detectPackageManager,
  getPackageManagerCommand,
  getPackageManagerVersion,
} from './lib/local-nx-utils/package-manager-command';
export {
  detectCorepackPackageManager,
  shouldUseCorepack,
  extractPackageManagerName,
} from './lib/local-nx-utils/corepack-detection';
export * from './lib/local-nx-utils/read-json';
export * from './lib/local-nx-utils/parse-target-string';
export * from './lib/local-nx-utils/find-matching-projects';
export * from './lib/local-nx-utils/get-local-workspace-plugins';
export * from './lib/nx-json';
export * from './lib/local-nx-utils/cache-dir';
