import { createActor, fromPromise } from 'xstate';
import { machine } from './pdv-state-machine';
import type { PDVData } from '@nx-console/shared/types';

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
      })
    );
    actor.start();

    expect(actor.getSnapshot().matches('initialLoading')).toBe(true);
    expect(renderLoading).toHaveBeenCalled();
  });
});
