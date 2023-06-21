import { createContext } from '@lit-labs/context';
import { GeneratorContext } from '@nx-console/shared/generate-ui-types';

export const generatorContextContext = createContext<
  GeneratorContext | undefined
>(Symbol('generatorContext'));
