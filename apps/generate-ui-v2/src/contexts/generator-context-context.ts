import { ContextConsumer, createContext } from '@lit-labs/context';
import { GeneratorContext } from '@nx-console/shared/generate-ui-types';
import { LitElement } from 'lit';
import { state } from 'lit/decorators.js';

export const generatorContextContext = createContext<
  GeneratorContext | undefined
>(Symbol('generatorContext'));

export declare class GeneratorContextContextInterface {
  generatorContext: GeneratorContext | undefined;
}

type Constructor<T> = new (...args: any[]) => T;

export const GeneratorContextContext = <T extends Constructor<LitElement>>(
  superClass: T
) => {
  class GeneratorContextContextElement extends superClass {
    @state() generatorContext: GeneratorContext | undefined;

    constructor(...rest: any[]) {
      super();
      // we can't use the @consume decorator due to mixin typing quirks
      new ContextConsumer(this, {
        context: generatorContextContext,
        callback: (generatorContext) =>
          (this.generatorContext = generatorContext),
        subscribe: true,
      });
    }
  }

  return GeneratorContextContextElement as Constructor<GeneratorContextContextInterface> &
    T;
};
