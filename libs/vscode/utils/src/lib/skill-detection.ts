import { existsSync, readFileSync } from 'fs';
import { parse } from 'jsonc-parser';
import { join } from 'path';
import { isInCursor, isInVSCode } from './editor-name-helpers';

export function hasNxWorkspaceSkill(workspacePath: string): boolean {
  if (!workspacePath) return false;

  const skillPaths = [
    join(workspacePath, '.agents', 'skills', 'nx-workspace', 'SKILL.md'),
  ];

  if (isInCursor()) {
    if (hasNxClaudePlugin(workspacePath)) {
      return true;
    }
    skillPaths.push(
      join(workspacePath, '.cursor', 'skills', 'nx-workspace', 'SKILL.md'),
    );
  } else if (isInVSCode()) {
    skillPaths.push(
      join(workspacePath, '.github', 'skills', 'nx-workspace', 'SKILL.md'),
    );
  }

  if (skillPaths.some((p) => existsSync(p))) {
    return true;
  }

  return false;
}

function hasNxClaudePlugin(workspacePath: string): boolean {
  try {
    const settingsPath = join(workspacePath, '.claude', 'settings.json');
    const raw = readFileSync(settingsPath, 'utf-8');
    const parsed = parse(raw);
    return parsed?.enabledPlugins?.['nx@nx-claude-plugins'] === true;
  } catch {
    return false;
  }
}
