import type { PDVData } from '@nx-console/shared/types';
import { assign, enqueueActions, fromPromise, setup } from 'xstate';

export const machine = setup({
  types: {
    context: {} as Partial<PDVData> & {
      multiSelectedProject: string | undefined;
    },
  },
  actors: {
    loadPDVData: fromPromise(async () => {
      return {} as PDVData | undefined;
    }),
  },
  actions: {
    renderLoading: () => {
      //
    },
    renderPDV: () => {
      //
    },
    reRenderPDV: (_: unknown, params: { pdvData: string | undefined }) => {
      //
    },
    renderError: () => {
      //
    },
    renderMultiPDV: () => {
      //
    },
    renderNoGraphError: () => {
      //
    },
    assignLoadPDVData: assign(({ context, event }) => {
      const multiProjects = Object.keys(
        event['output'].pdvDataSerializedMulti ?? {}
      );
      const multiSelectedProject =
        context['multiSelectedProject'] ??
        (multiProjects.length > 0 ? multiProjects[0] : undefined);
      return {
        ...event['output'],
        multiSelectedProject,
      };
    }),
    transitionConditionally: enqueueActions(({ context, enqueue }) => {
      if (
        !context.resultType ||
        context.resultType === 'NO_GRAPH_ERROR' ||
        !context.graphBasePath
      ) {
        enqueue.raise({ type: 'NO_GRAPH_ERROR' });
        return;
      }
      if (context.resultType === 'SUCCESS') {
        enqueue.raise({ type: 'PDV_DATA_LOAD_SUCCESS' });
        return;
      }
      if (context.resultType === 'SUCCESS_MULTI') {
        enqueue.raise({ type: 'PDV_DATA_LOAD_MULTI_SUCCESS' });
        return;
      }
      if (context.resultType === 'ERROR') {
        enqueue.raise({ type: 'PDV_DATA_LOAD_ERROR' });
        return;
      }
    }),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAcBOB7AVmAxgFwBEw8BDASwBtYBiABQIDUB9AgQQBVWmAZAeVYJMAygFUAwmICiQoQG0ADAF1EKdLDJ4y6AHYqQAD0QBWAGwA6ABxGAnNaPyT8gIwAmRxesAaEAE9EAdicnM2t5IwAWFyD-cKCLAGYAX0TvNCxcQmJyKjpGFg4uPgEmSQAlUt5ShWUkEGQ1DS1dWsMEeJczI3sg+VCjeOsLcP9vPwQneSGzfxdQl3mLBIcTZNSMbHwiUkoaemY2Th5+QQBZEW52AElhcSkZar169U0dPVaAWhMjMyd-f3twuEjC5whYnNYRr5EE5hhYzJFXNEEl8Vik6usMltsjQAHK8JgAcVKrFoAAkSuVKg9ak9Gq8WtCgfCor94v1-PE-otRoh2nCwiYLPIXPI2YKTP5Vuj0pssjszGRtI0SBRuOgSBBFVBqBAdGAFdoAG7oADW+rSG0y2yoBuVqvVmu0UAQiuNOBIL201WpqmeTTeiHeTiMcP6VnioqGQRcFh5CA8ZhcM2sJhc9lFEdMUotmLlNtgAAt0AB3LV7ailSQAMUrQlJPrqDU9AbaNh+i0WdhiLK8UIQM3kZhMKaT9hmHPm2YxsutsDMhZLZcYZlQYAAZqvC1qdXqDcazWYczPsfOi6WnXsV+vNwWtS6jeh3Z7vUpHk3-QyEOFbImYdZ4iYTjDhYgpGHGIZwoB4TDiKIbWGmU4ylaJ4LueUB7CcACuFCaNQZwXNctAVAAUpIYjsMIkjcGR7CSAQDa0s2n6AtYibAhCHGLPIfwmHGvxGMEAEQu0-hhPI8jDIhlpYvKqFLgwWE4WQFbVrW9avjS770qArRsqxTidgZUYIrxfbBsCZi9BMXT+AkLIuFJuazqei4XowimaFeG5wLeTo7to+quqa5rTshslnvJHlkF5N53kFT5NC+NS+nSzQ6Yg36sVE34OHMXwgeEfGRIO4nWNB8QWG4JhApKaJHmF+YRU6kioBgqAqTW0jqcljZ+tpBi8m2RmdkY3bRJCYxBJy8JWMMjgSWJSR1aFMmNa5UAtW1MU+duuoBXuwWHiteZznJzWtegqDbVuTr3m6HqJUoDFaWlA1fvBljxDCbL+BK8QVU4fHid84Siv+wJfBMDnLUhq2nU1UA4ugBKoCQyAFptl0dWpz19a9ulDR2tjtLYoLDHGX0dPYAGcr0v0mBK4SOce4XrUjKNoxjF1Xau3k3dqe2BQ+B71XDLloezqPo5jPPXjtt3xQ9OhJW+eMtt+HQJDCDjpq4CR8UKzIitVXxpjES1oto6AQHAjzHbOqupS27wuF9llfLEbhBBMEJxu8sSWf0BnhBVkyAlmMPSSdtqaCqaoalqjtMelCBBgk7sRK4gE9L7fZRP4Q7OBGbKjiBlXMw18PrXsScfinX3BMNHijQi4JxkC4TwqmIemLYlUSqiayw9HZ3ocuZAQBQYC1-1un+KxyZVQZgRsvEcYMx0xt-K7MLzzGFdi6Pl687FToz-jGWLCEMagjEHixAMcaBFTwrAbMzhAktQ9R85R-udhmhz4tgbu2DwRlYgmT4jGb4VgV7WF+ByeB0Nv5ORQgjDCADooTynkAz8nIF6zFmLZf8SZ4FFX-IXGEHhAKzASNYA+I90H-yUtdXyUBcEp1BHCeCQwQzzHmBJPiER4iWAhMMYGtkGYMN-gjGWHC3ogKbl2Vufw4wWECGxICxCHDiQqtItB60ZYKkntPTSas8Hz2mIQhmy8nAlyBrZEIdghgDH7s4fRrM0JGJPvLdhZinbMSvjw2+oIyp2NjGZVwWV4FhO-CYdoUQPFrQlsjKWXM2ryN0kEUBHgSGkyGBNDK5g3DCRjMQgRMIklVxSRzaW3NjE4P8cnBRljF7QQlKYVMcY0ydw-txXoSYQ52CqeLLUktObeLlvzTJl9uE3wqoEbiEZ-gUwkmYL64lRKLHwdBZIyQgA */
  id: 'projectDetails',
  initial: 'initialLoading',
  context: {
    resultType: undefined,
    pdvDataSerialized: undefined,
    errorMessage: undefined,
    errorsSerialized: undefined,
    graphBasePath: undefined,
    pdvDataSerializedMulti: undefined,
    multiSelectedProject: undefined,
  },
  states: {
    initialLoading: {
      entry: ['renderLoading'],
      invoke: {
        src: 'loadPDVData',
        onDone: {
          actions: ['assignLoadPDVData', 'transitionConditionally'],
        },
      },
    },
    showingPDV: {
      entry: 'renderPDV',
      initial: 'idle',
      on: {
        REFRESH: {
          target: '.refreshing',
        },
      },
      states: {
        idle: {},
        refreshing: {
          invoke: {
            src: 'loadPDVData',
            onDone: {
              actions: [
                'assignLoadPDVData',
                enqueueActions(({ context, enqueue }) => {
                  if (context.resultType === 'SUCCESS') {
                    enqueue({
                      type: 'reRenderPDV',
                      params: {
                        pdvData: context.pdvDataSerialized,
                      },
                    });
                  } else {
                    enqueue('transitionConditionally');
                  }
                }),
              ],
            },
          },
        },
      },
    },
    showingPDVMulti: {
      entry: 'renderMultiPDV',
      on: {
        MULTI_PROJECT_SELECTED: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              multiSelectedProject: event['project'],
            })),
            'renderMultiPDV',
          ],
        },
        REFRESH: {
          target: '.refreshing',
        },
      },
      initial: 'idle',
      states: {
        idle: {},
        refreshing: {
          invoke: {
            src: 'loadPDVData',
            onDone: {
              actions: [
                'assignLoadPDVData',
                enqueueActions(({ context, enqueue }) => {
                  if (context.resultType === 'SUCCESS_MULTI') {
                    enqueue({
                      type: 'reRenderPDV',
                      params: {
                        pdvData:
                          context.multiSelectedProject &&
                          context.pdvDataSerializedMulti
                            ? context.pdvDataSerializedMulti[
                                context.multiSelectedProject
                              ]
                            : undefined,
                      },
                    });
                  } else {
                    enqueue('transitionConditionally');
                  }
                }),
              ],
            },
          },
        },
      },
    },
    showingError: {
      entry: 'renderError',
      on: {
        REFRESH: {
          target: '.refreshing',
        },
      },
      initial: 'idle',
      states: {
        idle: {},
        refreshing: {
          invoke: {
            src: 'loadPDVData',
            onDone: {
              actions: ['assignLoadPDVData', 'transitionConditionally'],
            },
          },
        },
      },
    },
    showingNoGraphError: {
      entry: 'renderNoGraphError',
      on: {
        REFRESH: {
          target: '.refreshing',
        },
      },
      initial: 'idle',
      states: {
        idle: {},
        refreshing: {
          invoke: {
            src: 'loadPDVData',
            onDone: {
              actions: ['assignLoadPDVData', 'transitionConditionally'],
            },
          },
        },
      },
    },
  },
  on: {
    PDV_DATA_LOAD_SUCCESS: {
      target: '.showingPDV',
    },
    PDV_DATA_LOAD_ERROR: {
      target: '.showingError',
    },
    PDV_DATA_LOAD_MULTI_SUCCESS: {
      target: '.showingPDVMulti',
    },
    NO_GRAPH_ERROR: {
      target: '.showingNoGraphError',
    },
  },
});
