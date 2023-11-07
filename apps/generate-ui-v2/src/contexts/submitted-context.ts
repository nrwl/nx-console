import { createContext } from '@lit/context';

export const submittedContext = createContext<boolean>(Symbol('submitted'));
