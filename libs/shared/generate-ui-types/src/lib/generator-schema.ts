import { Option } from '@nx-console/shared/schema';
import { FormValues } from './messages';

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
  fixedFormValues?: FormValues;
};
