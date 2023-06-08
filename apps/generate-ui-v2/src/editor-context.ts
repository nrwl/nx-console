import { createContext } from '@lit-labs/context';
import { LitElement } from 'lit';
import { state } from 'lit/decorators.js';
import { consume, ContextConsumer } from '@lit-labs/context';

export const editorContext = createContext<'vscode' | 'intellij'>(
  Symbol('editor')
);

export declare class EditorContextInterface {
  editor: 'vscode' | 'intellij';
}

type Constructor<T> = new (...args: any[]) => T;

export const EditorContext = <T extends Constructor<LitElement>>(
  superClass: T
) => {
  class EditorContextElement extends superClass {
    @state() editor: 'vscode' | 'intellij';

    constructor(...rest: any[]) {
      super();
      // we can't use the @consume decorator due to mixin typing quirks
      new ContextConsumer(this, {
        context: editorContext,
        callback: (value) => {
          this.editor = value;
        },
        subscribe: false,
      });
    }
  }

  return EditorContextElement as Constructor<EditorContextInterface> & T;
};
