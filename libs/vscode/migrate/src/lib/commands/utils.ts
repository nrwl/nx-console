import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export function modifyMigrationsJsonMetadata(
  modify: (migrationsJsonMetadata: any) => any
) {
  const nxWorkspacePath = getNxWorkspacePath();
  const migrationsJsonPath = join(nxWorkspacePath, 'migrations.json');
  const migrationsJson = JSON.parse(readFileSync(migrationsJsonPath, 'utf-8'));
  migrationsJson['nx-console'] = modify(migrationsJson['nx-console']);
  writeFileSync(migrationsJsonPath, JSON.stringify(migrationsJson, null, 2));
}
