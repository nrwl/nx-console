import { Option } from './index';
import { Schema } from 'nx/src/utils/params';
export interface GeneratorDefaults {
    [name: string]: string;
}
export declare function normalizeSchema(s: Schema, workspaceType: 'ng' | 'nx', projectDefaults?: GeneratorDefaults): Promise<Option[]>;
