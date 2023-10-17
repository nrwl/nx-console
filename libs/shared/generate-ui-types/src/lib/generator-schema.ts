import { Option } from '@nx-console/shared/schema';
import { NxVersion } from '@nx-console/shared/types';

export type GeneratorSchema = {
  collectionName: string;
  generatorName: string;
  description: string;
  options: Option[];
  context?: GeneratorContext;
};

export type GeneratorContext = {
  project?: string;
  directory?: string;
  prefillValues?: Record<string, string>;
  fixedFormValues?: Record<string, string>;
  nxVersion?: NxVersion;
};
