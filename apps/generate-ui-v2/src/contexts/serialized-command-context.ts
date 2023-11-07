import { createContext } from '@lit/context';

export const serializedCommandContext = createContext<string | undefined>(
  Symbol('serialized-command')
);
