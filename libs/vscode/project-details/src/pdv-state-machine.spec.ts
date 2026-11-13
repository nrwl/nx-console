import { createActor, fromPromise, waitFor } from 'xstate';
import { machine } from './pdv-state-machine';
import type { PDVData } from '@nx-console/shared-types';

describe('PdvStateMachine', () => {
  it('should render loading initially', () => {
    const renderLoading = jest.fn();
    const actor = createActor(
      machine.provide({
        actors: {
          loadPDVData: fromPromise(async () => {
            return {
              pdvDataSerialized: '',
              resultType: 'SUCCESS',
              graphBasePath: '',
            } as PDVData | undefined;
          }),
        },
        actions: {
          renderLoading: () => renderLoading(),
        },
      }),
    );
    actor.start();

    expect(actor.getSnapshot().matches('initialLoading')).toBe(true);
    expect(renderLoading).toHaveBeenCalled();
  });
});

describe('PDV responses crossing JSON-RPC', () => {
  const wireData = (data: Partial<PDVData>): PDVData =>
    JSON.parse(JSON.stringify(data));

  it('replaces old response fields when a repaired error is followed by a missing project', async () => {
    const responses = [
      wireData({
        resultType: 'ERROR',
        graphBasePath: '/graph',
        errorsSerialized: '[{"message":"Unable to read nx.json"}]',
        errorMessage: 'Invalid workspace',
      }),
      wireData({
        resultType: 'SUCCESS',
        graphBasePath: '/graph',
        pdvDataSerialized: '{"project":"hello"}',
      }),
      wireData({
        resultType: 'ERROR',
        graphBasePath: '/graph',
        errorMessage: 'No project found at apps/hello/project.json',
      }),
      wireData({
        resultType: 'SUCCESS',
        graphBasePath: '/graph',
        pdvDataSerialized: '{"project":"hello"}',
      }),
    ];
    const renderError = jest.fn();
    const actor = createActor(
      machine.provide({
        actors: { loadPDVData: fromPromise(async () => responses.shift()) },
        actions: { renderError: ({ context }) => renderError(context) },
      }),
    );
    actor.start();
    try {
      await waitFor(actor, (state) => state.matches('showingError'));
      expect(actor.getSnapshot().context.errorsSerialized).toContain(
        'Unable to read nx.json',
      );
      actor.send({ type: 'REFRESH' });
      await waitFor(actor, (state) => state.matches('showingPDV'));
      expect(actor.getSnapshot().context.errorsSerialized).toBeUndefined();
      expect(actor.getSnapshot().context.errorMessage).toBeUndefined();
      actor.send({ type: 'REFRESH' });
      await waitFor(actor, (state) => state.matches('showingError'));
      expect(renderError).toHaveBeenLastCalledWith(
        expect.objectContaining({
          errorMessage: 'No project found at apps/hello/project.json',
          errorsSerialized: undefined,
          pdvDataSerialized: undefined,
        }),
      );
      actor.send({ type: 'REFRESH' });
      await waitFor(actor, (state) => state.matches('showingPDV'));
      expect(actor.getSnapshot().context.errorMessage).toBeUndefined();
    } finally {
      actor.stop();
    }
  });
});
