import { existsSync } from 'fs';
import { join } from 'path';
import { isInCursor, isInVSCode } from './editor-name-helpers';

export function hasNxWorkspaceSkill(workspacePath: string): boolean {
  if (!workspacePath) return false;

  let skillPath: string | null = null;

  if (isInCursor()) {
    skillPath = join(workspacePath, '.cursor', 'skills', 'nx-workspace', 'SKILL.md');
  } else if (isInVSCode()) {
    skillPath = join(workspacePath, '.github', 'skills', 'nx-workspace', 'SKILL.md');
  }

  return skillPath ? existsSync(skillPath) : false;
}
