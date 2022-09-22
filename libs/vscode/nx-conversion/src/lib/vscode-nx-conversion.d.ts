import { ExtensionContext } from 'vscode';
/**
 * Singleton class for helping with Nx Conversion.
 *
 * Get instances with `NxConversion.instance`
 */
export declare class NxConversion {
    private _context;
    private static _instance;
    static get instance(): NxConversion;
    private static set instance(value);
    private _listener;
    private constructor();
    static createInstance(context: ExtensionContext): NxConversion;
    trackEvent(eventName: string): Promise<void>;
}
