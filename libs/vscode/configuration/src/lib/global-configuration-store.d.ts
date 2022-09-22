import { ConfigurationTarget, ExtensionContext } from 'vscode';
import { Store } from '@nx-console/shared/schema';
import { GlobalConfigKeys } from './configuration-keys';
export declare class GlobalConfigurationStore implements Store {
    private readonly state;
    static configurationSection: string;
    static fromContext(context: ExtensionContext): GlobalConfigurationStore;
    static get instance(): GlobalConfigurationStore;
    private constructor();
    get<T>(key: GlobalConfigKeys, defaultValue?: T): T | null;
    set<T>(key: GlobalConfigKeys, value: T): void;
    delete(key: GlobalConfigKeys): void;
    storage(key: GlobalConfigKeys): VSCState;
    get config(): import("vscode").WorkspaceConfiguration;
}
export interface VSCState {
    get<T>(key: string): T | undefined;
    get<T>(key: string, defaultValue: T): T;
    update(key: string, value: any, target?: ConfigurationTarget): void;
}
