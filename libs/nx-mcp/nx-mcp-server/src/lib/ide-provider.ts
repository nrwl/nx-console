/**
 * Interface for IDE integration that supports both direct VSCode callbacks
 * and JSON-RPC communication with standalone IDE processes
 */
export interface IdeProvider {
  /**
   * Check if IDE is currently available/connected
   */
  isAvailable(): boolean;

  /**
   * Focus on a specific project in the IDE
   */
  focusProject(projectName: string): Promise<void>;

  /**
   * Focus on a specific task for a project in the IDE
   */
  focusTask(projectName: string, taskName: string): Promise<void>;

  /**
   * Show the full project graph in the IDE
   */
  showFullProjectGraph(): Promise<void>;

  /**
   * Open the generator UI in the IDE
   */
  openGenerateUi(
    generatorName: string,
    options: Record<string, unknown>,
    cwd?: string,
  ): Promise<string>;

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