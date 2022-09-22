import { CodeLens, CodeLensProvider, Disposable, ExtensionContext, Range } from 'vscode';
import { TextDocument } from 'vscode';
import { ProjectLocations } from './find-workspace-json-target';
export declare class TargetCodeLens extends CodeLens {
    workspaceType: 'nx' | 'ng';
    project: string;
    target: string;
    configuration?: string | undefined;
    constructor(range: Range, workspaceType: 'nx' | 'ng', project: string, target: string, configuration?: string | undefined);
}
export declare class ProjectCodeLens extends CodeLens {
    project: string;
    projectPath: string;
    constructor(range: Range, project: string, projectPath: string);
}
export declare class WorkspaceCodeLensProvider implements CodeLensProvider {
    private readonly context;
    /**
     * CodeLensProvider is disposed and re-registered on setting changes
     */
    codeLensProvider: Disposable | null;
    /**
     * The WorkspaceCodeLensProvider adds clickable nx run targets in the workspace config file.
     * It is enabled by default and can be disabled with the `enableWorkspaceConfigCodeLens` setting.
     * @param context instance of ExtensionContext from activate
     */
    constructor(context: ExtensionContext);
    /**
     * Provides a CodeLens set for a matched document
     * @param document a document matched by the pattern passed to registerCodeLensProvider
     * @returns ProjectCodeLens Range locations and properties for the document
     */
    provideCodeLenses(document: TextDocument): Promise<CodeLens[] | undefined>;
    buildProjectLenses(project: ProjectLocations[string], document: TextDocument, lens: CodeLens[], projectName: string, workspacePath: string): Promise<void>;
    private buildTargetLenses;
    /**
     * Resolves and sets the command on visible CodeLens
     * @param lens lens to be resolve
     * @returns ProjectCodeLens with command
     */
    resolveCodeLens(lens: CodeLens): CodeLens | Promise<CodeLens> | null;
    /**
     * Checks the enableWorkspaceConfigCodeLens setting and registers this as a CodeLensProvider.
     * @param context instance of ExtensionContext from activate
     */
    registerWorkspaceCodeLensProvider(context: ExtensionContext): void;
    /**
     * Watches for settings/configuration changes and enables/disables the CodeLensProvider
     * @param context instance of ExtensionContext from activate
     */
    watchWorkspaceCodeLensConfigChange(context: ExtensionContext): void;
}
