import { CodeLens, CodeLensProvider, ExtensionContext, ProviderResult, TextDocument } from 'vscode';
export declare class AddDependencyCodelensProvider implements CodeLensProvider {
    constructor(context: ExtensionContext);
    provideCodeLenses(document: TextDocument): ProviderResult<CodeLens[]>;
    /**
     * Registers this as a CodeLensProvider.
     * @param context instance of ExtensionContext from activate
     */
    registerAddDependencyCodeLensProvider(context: ExtensionContext): void;
}
