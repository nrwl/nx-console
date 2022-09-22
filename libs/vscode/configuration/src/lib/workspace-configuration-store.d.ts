import { Store } from '@nx-console/shared/schema';
import { ExtensionContext, Memento } from 'vscode';
import { WorkspaceConfigKeys } from './configuration-keys';
/**
 * Configuration store that has config related to the opened workspace in vscode
 */
export declare class WorkspaceConfigurationStore implements Store {
    private readonly state;
    static fromContext(context: ExtensionContext): WorkspaceConfigurationStore;
    /**
     * Returns the instance of WorkspaceConfigurationStore
     */
    static get instance(): WorkspaceConfigurationStore;
    constructor(state: Memento);
    delete(key: WorkspaceConfigKeys): void;
    get<T>(key: WorkspaceConfigKeys, defaultValue: T): T;
    set<T>(key: WorkspaceConfigKeys, value: T): void;
}
