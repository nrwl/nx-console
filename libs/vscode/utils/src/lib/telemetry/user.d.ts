import { Store } from '@nx-console/shared/schema';
export declare type UserState = 'untracked' | 'tracked';
export declare class User {
    readonly id: string;
    state: UserState;
    static fromStorage(store: Store): User;
    constructor(id: string, state?: UserState);
    tracked(): void;
    untracked(): void;
    isTracked(): boolean;
    isUntracked(): boolean;
}
