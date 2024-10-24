import { PartialDeep } from 'type-fest';
import type { OutputChannel } from 'vscode';
import {
  createActor,
  fromPromise,
  getNextSnapshot,
  StateValue,
  waitFor,
} from 'xstate';
import { graphMachine } from './graph.machine';

import { NxWorkspace } from '@nx-console/shared/types';
import type * as nxWorkspace from '@nx-console/vscode/nx-workspace';
import * as outputChannels from '@nx-console/vscode/output-channels';
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

const mockMachine = graphMachine.provide({
  actors: {
    generateContent: fromPromise(async () => {
      return;
    }),
  },
});

describe('graph state machine', () => {
  it('should go to the correct states with the actor', (done) => {
    const actor = createActor(mockMachine);

    const states: StateValue[] = [];
    actor.subscribe((state) => {
      states.push(state.value);

      if (state.matches('viewReady')) {
        expect(states).toMatchInlineSnapshot(`
          Array [
            "init",
            "loading",
            "loading",
            "content",
            "viewReady",
          ]
        `);
        done();
      }
    });

    actor.start();
    actor.send({
      type: 'PROJECT_SELECTED',
      data: { type: MessageType.all, projectName: '', taskName: undefined },
    });
    actor.send({ type: 'GET_CONTENT' });
    waitFor(actor, (state) => state.matches('content')).then(() => {
      actor.send({ type: 'VIEW_READY' });
    });
  });

  it('should go to loading when refreshing', () => {
    const nextState = getNextSnapshot(
      mockMachine,
      mockMachine.resolveState({ value: 'viewReady', context: {} as any }),
      { type: 'REFRESH' }
    );
    expect(nextState.value).toMatchInlineSnapshot(`"loading"`);
    expect(nextState.context).toMatchInlineSnapshot(`
      Object {
        "state": "loading",
      }
    `);
  });
});
