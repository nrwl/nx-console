import { interpret, StateValue } from 'xstate';
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

      if (state.matches('content')) {
        expect(states).toMatchInlineSnapshot(`
          Array [
            "init",
            "loading",
            "content",
          ]
        `);
        done();
      }
    });
    interpreter.start();
    interpreter.send('GET_CONTENT');
  });

  it('should go to loading when refreshing', () => {
    let nextState = mockMachine.transition('content', 'REFRESH');
    expect(nextState.value).toMatchInlineSnapshot(`"loading"`);
    expect(nextState.context).toMatchInlineSnapshot(`
      Object {
        "project": undefined,
        "state": "loading",
        "viewStatus": "destroyed",
      }
    `);
  });

  it('should set relative view related details', () => {
    let nextState = mockMachine.transition('content', 'VIEW_READY');
    expect(nextState.context.viewStatus).toBe(ViewStatus.ready);

    nextState = mockMachine.transition(nextState, 'VIEW_DESTROYED');
    expect(nextState.context.viewStatus).toBe(ViewStatus.destroyed);
  });
});
