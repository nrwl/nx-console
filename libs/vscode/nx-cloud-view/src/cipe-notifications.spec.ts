import { CIPEInfo } from '@nx-console/shared-types';
import { window } from 'vscode';
import { compareCIPEDataAndSendNotification } from './cipe-notifications';

const globalConfigMock = jest.fn().mockReturnValue('all');

jest.mock('vscode', () => ({
  window: {
    showInformationMessage: jest.fn().mockResolvedValue(undefined),
    showErrorMessage: jest.fn().mockResolvedValue(undefined),
  },
  env: {
    appName: 'vscode',
  },
  commands: {
    executeCommand: jest.fn(),
  },
}));

jest.mock('@nx-console/vscode-telemetry', () => ({
  getTelemetry: () => ({
    logUsage: jest.fn(),
  }),
}));

describe('CIPE Notifications', () => {
  beforeAll(() => {
    jest
      .spyOn(
        //nx-ignore-next-line
        require('@nx-console/vscode-configuration').GlobalConfigurationStore, // eslint-disable-line @typescript-eslint/no-var-requires
        'instance',
        'get',
      )
      .mockReturnValue({
        get: globalConfigMock,
      });
  });
  beforeEach(() => {
    jest.clearAllMocks();

    globalConfigMock.mockReturnValue('all');
  });

  describe('compareCIPEDataAndSendNotification', () => {
    type PipelineExamples =
      | 'success'
      | 'fail'
      | 'progress'
      | 'progressFailedRun'
      | 'empty';
    const pipelineExamples: Record<PipelineExamples, CIPEInfo[]> = {
      success: [
        {
          ciPipelineExecutionId: '1',
          branch: 'feature',
          status: 'SUCCEEDED',
          createdAt: 100000,
          completedAt: 100001,
          commitTitle: 'fix: fix fix',
          commitUrl: 'https://github.com/commit/123',
          cipeUrl: 'https://cloud.nx.app/cipes/123',
          runGroups: [
            {
              createdAt: 10000,
              completedAt: 10001,
              runGroup: 'rungroup-123123',
              ciExecutionEnv: '123123',
              status: 'SUCCEEDED',
              runs: [
                {
                  linkId: '123123',
                  status: 'SUCCEEDED',
                  command: 'nx test',
                  runUrl: 'http://test.url',
                },
              ],
            },
          ],
        },
      ],
      fail: [
        {
          ciPipelineExecutionId: '1',
          branch: 'feature',
          status: 'FAILED',
          createdAt: 100000,
          completedAt: 100001,
          commitTitle: 'fix: fix fix',
          commitUrl: 'https://github.com/commit/123',
          cipeUrl: 'https://cloud.nx.app/cipes/123',
          runGroups: [
            {
              createdAt: 10000,
              completedAt: 10001,
              runGroup: 'rungroup-123123',
              ciExecutionEnv: '123123',
              status: 'FAILED',
              runs: [
                {
                  linkId: '123123',
                  status: 'FAILED',
                  command: 'nx test',
                  runUrl: 'http://test.url',
                },
              ],
            },
          ],
        },
      ],
      progress: [
        {
          ciPipelineExecutionId: '1',
          branch: 'feature',
          status: 'IN_PROGRESS',
          createdAt: 100000,
          completedAt: null,
          commitTitle: 'fix: fix fix',
          runGroups: [],
          commitUrl: 'https://github.com/commit/123',
          cipeUrl: 'https://cloud.nx.app/cipes/123',
        },
      ],
      progressFailedRun: [
        {
          ciPipelineExecutionId: '1',
          branch: 'feature',
          status: 'IN_PROGRESS',
          createdAt: 100000,
          completedAt: null,
          commitTitle: 'fix: fix fix',
          runGroups: [
            {
              createdAt: 10000,
              completedAt: null,
              runGroup: 'rungroup-123123',
              ciExecutionEnv: '123123',
              status: 'IN_PROGRESS',
              runs: [
                {
                  linkId: '123123',
                  status: 'FAILED',
                  command: 'nx test',
                  runUrl: 'http://test.url',
                },
              ],
            },
          ],
          commitUrl: 'https://github.com/commit/123',
          cipeUrl: 'https://cloud.nx.app/cipes/123',
        },
      ],
      empty: [],
    } as const;

    type NotificationResults = 'info' | 'error' | 'no';

    it('should not show any notifications when setting is "none"', () => {
      globalConfigMock.mockReturnValue('none');

      compareCIPEDataAndSendNotification(
        pipelineExamples.empty,
        pipelineExamples.success,
      );
      compareCIPEDataAndSendNotification(
        pipelineExamples.empty,
        pipelineExamples.fail,
      );
      compareCIPEDataAndSendNotification(
        pipelineExamples.empty,
        pipelineExamples.progressFailedRun,
      );
      compareCIPEDataAndSendNotification(
        pipelineExamples.empty,
        pipelineExamples.success,
      );
      compareCIPEDataAndSendNotification(
        pipelineExamples.empty,
        pipelineExamples.fail,
      );
      compareCIPEDataAndSendNotification(
        pipelineExamples.empty,
        pipelineExamples.progressFailedRun,
      );

      expect(window.showInformationMessage).not.toHaveBeenCalled();
      expect(window.showErrorMessage).not.toHaveBeenCalled();
    });

    const cases: [
      PipelineExamples | null,
      PipelineExamples,
      NotificationResults,
    ][] = [
      [null, 'progress', 'no'],
      [null, 'success', 'no'],
      [null, 'fail', 'no'],
      [null, 'progressFailedRun', 'no'],
      ['empty', 'progress', 'no'],
      ['empty', 'success', 'info'],
      ['empty', 'fail', 'error'],
      ['empty', 'progressFailedRun', 'error'],
      ['progress', 'progress', 'no'],
      ['progress', 'success', 'info'],
      ['progress', 'fail', 'error'],
      ['progress', 'progressFailedRun', 'error'],
      ['progressFailedRun', 'fail', 'no'],
      ['progressFailedRun', 'progressFailedRun', 'no'],
      ['fail', 'fail', 'no'],
      ['success', 'success', 'no'],
      // these are weird cases that should not happen but we'll test them anyway
      ['progressFailedRun', 'progress', 'no'],
      ['progressFailedRun', 'success', 'no'],
      ['fail', 'progress', 'no'],
      ['fail', 'success', 'no'],
      ['fail', 'progressFailedRun', 'no'],
      ['success', 'progress', 'no'],
      ['success', 'progressFailedRun', 'no'],
      ['success', 'fail', 'no'],
    ] as const;

    test.each(cases)(
      'when comparing %p with %p, should show %p notification',
      (
        oldInfo: PipelineExamples | null,
        newInfo: PipelineExamples,
        result: NotificationResults,
      ) => {
        const oldPipeline = oldInfo ? pipelineExamples[oldInfo] : null;
        const newPipeline = pipelineExamples[newInfo];
        compareCIPEDataAndSendNotification(oldPipeline, newPipeline);
        if (result === 'info') {
          expect(window.showInformationMessage).toHaveBeenCalled();
          expect(window.showErrorMessage).not.toHaveBeenCalled();
        } else if (result === 'error') {
          expect(window.showErrorMessage).toHaveBeenCalled();
          expect(window.showInformationMessage).not.toHaveBeenCalled();
        } else {
          expect(window.showErrorMessage).not.toHaveBeenCalled();
          expect(window.showInformationMessage).not.toHaveBeenCalled();
        }
      },
    );

    it('should not show success notifications when setting is "error"', () => {
      globalConfigMock.mockReturnValue('error');
      compareCIPEDataAndSendNotification(
        pipelineExamples.empty,
        pipelineExamples.success,
      );
      compareCIPEDataAndSendNotification(
        pipelineExamples.progress,
        pipelineExamples.success,
      );
      expect(window.showInformationMessage).not.toHaveBeenCalled();
      expect(window.showErrorMessage).not.toHaveBeenCalled();
    });
  });
});
