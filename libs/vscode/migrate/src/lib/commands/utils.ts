import { MigrationsJsonMetadata } from '@nx-console/shared-types';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export function modifyMigrationsJsonMetadata(
  modify: (
    migrationsJsonMetadata: MigrationsJsonMetadata
  ) => MigrationsJsonMetadata
) {
  const nxWorkspacePath = getNxWorkspacePath();
  const migrationsJsonPath = join(nxWorkspacePath, 'migrations.json');
  const migrationsJson = JSON.parse(readFileSync(migrationsJsonPath, 'utf-8'));
  migrationsJson['nx-console'] = modify(migrationsJson['nx-console']);
  writeFileSync(migrationsJsonPath, JSON.stringify(migrationsJson, null, 2));
}

export function readMigrationsJsonMetadata(): MigrationsJsonMetadata {
  const workspacePath = getNxWorkspacePath();
  const migrationsJsonPath = join(workspacePath, 'migrations.json');
  const migrationsJson = JSON.parse(readFileSync(migrationsJsonPath, 'utf-8'));
  return migrationsJson['nx-console'];
}
