import { Option } from '@nx-console/shared/schema';
/**
 * Returns undefined if the user wants to cancel the command.
 * Returns an empty array to run the command without flags.
 * Returns an array populated with flags if the user provides them.
 */
export declare function selectFlags(command: string, options: Option[], workspaceType: 'ng' | 'nx', userSetFlags?: {
    [key: string]: string;
}): Promise<string[] | undefined>;
