import { CIPEInfo } from '@nx-console/shared/types';
import * as cipeNotifications from './cipe-notifications';
import { compareCIPEDataAndSendNotification } from './cipe-notifications';
import { window } from 'vscode';

const globalConfigMock = jest.fn().mockReturnValue('all');

jest.mock('vscode', () => ({
  window: {
    showInformationMessage: jest.fn().mockResolvedValue(undefined),
    showErrorMessage: jest.fn().mockResolvedValue(undefined),
  },
  commands: {
    executeCommand: jest.fn(),
  },
}));

jest.mock('@nx-console/vscode/telemetry', () => ({
  getTelemetry: () => ({
    logUsage: jest.fn(),
  }),
}));

describe('CIPE Notifications', () => {
  beforeAll(() => {
    jest
      .spyOn(
        //nx-ignore-next-line
        require('@nx-console/vscode/configuration').GlobalConfigurationStore, // eslint-disable-line @typescript-eslint/no-var-requires
        'instance',
        'get'
      )
      .mockReturnValue({
        get: globalConfigMock,
      });
  });
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(cipeNotifications as any, 'getDefaultBranch')
      .mockReturnValue('main');
  });

  describe('compareCIPEDataAndSendNotification', () => {
    type PipelineExamples =
      | 'success'
      | 'fail'
      | 'progress'
      | 'progressFailedRun';
    const pipelineExamples: Record<PipelineExamples, CIPEInfo> = {
      success: {
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
      fail: {
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
      progress: {
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
      progressFailedRun: {
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
    } as const;

    type NotificationResults = 'info' | 'error' | 'no';

    it('should not show any notifications when setting is "none"', () => {
      globalConfigMock.mockReturnValue('none');

      compareCIPEDataAndSendNotification(undefined, [pipelineExamples.success]);
      compareCIPEDataAndSendNotification(undefined, [pipelineExamples.fail]);
      compareCIPEDataAndSendNotification(undefined, [
        pipelineExamples.progressFailedRun,
      ]);
      compareCIPEDataAndSendNotification(
        [pipelineExamples.progress],
        [pipelineExamples.success]
      );
      compareCIPEDataAndSendNotification(
        [pipelineExamples.progress],
        [pipelineExamples.fail]
      );
      compareCIPEDataAndSendNotification(
        [pipelineExamples.progress],
        [pipelineExamples.progressFailedRun]
      );

      expect(window.showInformationMessage).not.toHaveBeenCalled();
      expect(window.showErrorMessage).not.toHaveBeenCalled();
    });
    it('should not show any notifications for default branch', () => {
      globalConfigMock.mockReturnValue('all');

      compareCIPEDataAndSendNotification(undefined, [
        { ...pipelineExamples.success, branch: 'main' },
      ]);
      compareCIPEDataAndSendNotification(undefined, [
        { ...pipelineExamples.fail, branch: 'main' },
      ]);
      compareCIPEDataAndSendNotification(undefined, [
        { ...pipelineExamples.progressFailedRun, branch: 'main' },
      ]);
      compareCIPEDataAndSendNotification(
        [{ ...pipelineExamples.progress, branch: 'main' }],
        [{ ...pipelineExamples.success, branch: 'main' }]
      );
      compareCIPEDataAndSendNotification(
        [{ ...pipelineExamples.progress, branch: 'main' }],
        [{ ...pipelineExamples.fail, branch: 'main' }]
      );
      compareCIPEDataAndSendNotification(
        [{ ...pipelineExamples.progress, branch: 'main' }],
        [{ ...pipelineExamples.progressFailedRun, branch: 'main' }]
      );

      expect(window.showInformationMessage).not.toHaveBeenCalled();
      expect(window.showErrorMessage).not.toHaveBeenCalled();
    });

    const cases: [
      PipelineExamples | undefined,
      PipelineExamples,
      NotificationResults
    ][] = [
      [undefined, 'progress', 'no'],
      [undefined, 'success', 'info'],
      [undefined, 'fail', 'error'],
      [undefined, 'progressFailedRun', 'error'],
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
        oldInfo: PipelineExamples | undefined,
        newInfo: PipelineExamples,
        result: NotificationResults
      ) => {
        const oldPipeline = oldInfo ? [pipelineExamples[oldInfo]] : undefined;
        const newPipeline = pipelineExamples[newInfo];
        compareCIPEDataAndSendNotification(oldPipeline, [newPipeline]);
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
      }
    );

    it('should not show success notifications when setting is "error"', () => {
      globalConfigMock.mockReturnValue('error');
      compareCIPEDataAndSendNotification(undefined, [pipelineExamples.success]);
      compareCIPEDataAndSendNotification(
        [pipelineExamples.progress],
        [pipelineExamples.success]
      );
      expect(window.showInformationMessage).not.toHaveBeenCalled();
      expect(window.showErrorMessage).not.toHaveBeenCalled();
    });
  });
});
