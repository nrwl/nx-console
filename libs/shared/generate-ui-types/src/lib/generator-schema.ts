import { Option } from '@nx-console/shared/schema';
import { NxVersion } from '@nx-console/shared/nx-version';

export type GeneratorSchema = {
  collectionName: string;
  generatorName: string;
  description: string;
  options: Option[];
  context?: GeneratorContext;
};

export type GeneratorContext = {
  project?: string;
  normalizedDirectory?: string;
  directory?: string;
  prefillValues?: Record<string, string>;
  fixedFormValues?: Record<string, string>;
  nxVersion?: NxVersion;
};
