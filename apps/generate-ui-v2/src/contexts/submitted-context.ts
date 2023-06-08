import { createContext } from '@lit-labs/context';

export const submittedContext = createContext<boolean>(Symbol('submitted'));
