import { RunningTasksMap } from '@nx-console/shared-running-tasks';

/**
 * Interface for IDE integration that supports both direct VSCode callbacks
 * and JSON-RPC communication with standalone IDE processes
 */
export interface IdeProvider {
  /**
   * Check if IDE is currently available/connected
   */
  isAvailable(): boolean;

  focusProject(projectName: string): void;

  focusTask(projectName: string, taskName: string): void;

  showFullProjectGraph(): void;

  openGenerateUi(
    generatorName: string,
    options: Record<string, unknown>,
    cwd?: string,
  ): Promise<string>;

  getRunningTasks(): Promise<RunningTasksMap>;

  /**
   * Set up connection status change listener
   * Returns cleanup function
   */
  onConnectionChange(callback: (available: boolean) => void): () => void;

  /**
   * Clean up resources
   */
  dispose(): void;
}
