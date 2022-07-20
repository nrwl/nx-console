import { interpret, StateValue } from 'xstate';
import { waitFor } from 'xstate/lib/waitFor';
import { graphMachine, State, ViewStatus } from './graph.machine';

const mockMachine = graphMachine.withConfig({
  services: {
    generateContent: async () => {
      return;
    },
  },
});

describe('graph state machine', () => {
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
        "project": null,
        "state": "loading",
      }
    `);
  });
});
