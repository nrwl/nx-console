/**
 * Telemetry Events are defined here. They are
 * - grouped by namespace, separated with dots
 * - kebab-cased
 */

export type TelemetryEvents =
  // activation
  | 'extension-activate'
  | 'extension-deactivate'
  // misc
  | 'misc.refresh-workspace'
  | 'misc.add-dependency'
  | 'misc.show-project-configuration'
  | 'misc.open-pdv'
  | 'misc.open-project-details-codelens'
  | 'misc.exception'
  // cloud
  | 'cloud.connect'
  | 'cloud.open-app'
  | 'cloud.generate-ci-workflow'
  | 'cloud.finish-setup'
  | 'cloud.show-affected-docs'
  | 'cloud.show-cipe-notification'
  | 'cloud.view-cipe'
  | 'cloud.view-cipe-commit'
  | 'cloud.view-run'
  | 'cloud.explain-cipe-error'
  | 'cloud.fix-cipe-error'
  // graph
  | 'graph.show-all'
  | 'graph.show-affected'
  | 'graph.focus-project'
  | 'graph.show-task'
  | 'graph.show-task-group'
  | 'graph.select-project'
  | 'graph.interaction-open-project-edge-file'
  | 'graph.interaction-run-help'
  // tasks
  | 'tasks.run'
  | 'tasks.copy-to-clipboard'
  | 'tasks.run-many'
  // generate
  | 'generate.quickpick'
  | 'generate.ui'
  | 'generate.move'
  | 'generate.remove'
  // cli
  | 'cli.list'
  | 'cli.migrate'
  | 'cli.affected'
  | 'cli.init'
  // ai
  | 'ai.chat-message'
  | 'ai.feedback-good'
  | 'ai.feedback-bad'
  | 'ai.response-interaction'
  | 'ai.tool-call'
  | 'ai.add-mcp';

export type TelemetryData = {
  source?: TelemetryEventSource;
  file?: 'project.json' | 'other';
  tool?: string;
  [key: string]: any;
};
export type TelemetryEventSource =
  | 'command'
  | 'projects-view'
  | 'explorer-context-menu'
  | 'graph-interaction'
  | 'pdv-interaction'
  | 'codelens'
  | 'nx-commands-panel'
  | 'welcome-view'
  | 'migrate-angular-prompt'
  | 'editor-toolbar'
  | 'notification'
  | 'cloud-view';

export interface NxConsoleTelemetryLogger {
  logUsage(eventName: TelemetryEvents, data?: TelemetryData): void;
}
