import { Store } from '@nrwl/angular-console-enterprise-electron';
import { RecentAction } from '@angular-console/schema';

function getRecentActionsKey(projectPath: string): string {
  return `recentActions:${projectPath}`;
}

export function readRecentActions(
  store: Store,
  projectPath: string
): RecentAction[] {
  const actions: any[] = store.get(getRecentActionsKey(projectPath));
  return (actions || []).filter(action => action && !!action.actionName);
}

export function storeTriggeredAction(
  store: Store,
  projectPath: string,
  actionName: string,
  schematicName?: string
) {
  const MAX_RECENT_ACTIONS = 5;
  const existingActions = readRecentActions(store, projectPath);
  store.set(
    getRecentActionsKey(projectPath),
    [
      { actionName, schematicName },
      ...existingActions.filter(
        action =>
          action.actionName !== actionName ||
          action.schematicName !== schematicName
      )
    ].slice(0, MAX_RECENT_ACTIONS)
  );
}
