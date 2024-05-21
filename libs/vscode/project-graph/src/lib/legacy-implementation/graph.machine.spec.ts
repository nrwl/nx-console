import { interpret, StateValue } from 'xstate';
import { waitFor } from 'xstate/lib/waitFor';
import { graphMachine } from './graph.machine';
import { PartialDeep } from 'type-fest';
import type { OutputChannel } from 'vscode';

import type * as nxWorkspace from '@nx-console/vscode/nx-workspace';
import * as outputChannels from '@nx-console/vscode/output-channels';
import { NxWorkspace } from '@nx-console/shared/types';
import { MessageType } from './graph-message-type';

jest.mock(
  '@nx-console/vscode/output-channels',
  (): PartialDeep<typeof outputChannels> => ({
    getOutputChannel: () => {
      return {
        appendLine: jest.fn(() => {
          // do nothing
        }),
      } as unknown as OutputChannel;
    },
  })
);

jest.mock(
  '@nx-console/vscode/nx-workspace',
  (): PartialDeep<typeof nxWorkspace> => {
    return {
      async getNxWorkspace(_?: boolean): Promise<NxWorkspace> {
        return {
          isEncapsulatedNx: false,
          workspacePath: 'temp',
        } as NxWorkspace;
      },
    };
  }
);

const mockMachine = graphMachine.withConfig({
  services: {
    generateContent: async () => {
      return;
    },
  },
});

xdescribe('graph state machine', () => {
  it('should go to the correct states with the interpreter', (done) => {
    const interpreter = interpret(mockMachine);

    const states: StateValue[] = [];
    interpreter.onTransition((state) => {
      states.push(state.value);

      if (state.matches('viewReady')) {
        expect(states).toMatchInlineSnapshot(`
          Array [
            "init",
            "loading",
            "content",
            "viewReady",
          ]
        `);
        done();
      }
    });

    interpreter.start();
    interpreter.send({
      type: 'PROJECT_SELECTED',
      data: { type: MessageType.all, projectName: '', taskName: undefined },
    });
    interpreter.send('GET_CONTENT');
    waitFor(interpreter, (state) => state.matches('content')).then(() => {
      interpreter.send('VIEW_READY');
    });
  });

  it('should go to loading when refreshing', () => {
    const nextState = mockMachine.transition('viewReady', 'REFRESH');
    expect(nextState.value).toMatchInlineSnapshot(`"loading"`);
    expect(nextState.context).toMatchInlineSnapshot(`
      Object {
        "error": null,
        "project": null,
        "state": "loading",
      }
    `);
  });
});
