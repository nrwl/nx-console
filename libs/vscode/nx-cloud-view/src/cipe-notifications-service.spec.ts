import { CIPEInfo } from '@nx-console/shared-types';
import { window } from 'vscode';
import { CIPENotificationService } from './cipe-notification-service';

const globalConfigMock = jest.fn().mockReturnValue('all');

jest.mock('vscode', () => ({
  window: {
    showInformationMessage: jest.fn().mockResolvedValue(undefined),
    showErrorMessage: jest.fn().mockResolvedValue(undefined),
    createStatusBarItem: jest.fn().mockReturnValue({
      text: '',
      tooltip: '',
      command: {},
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
    }),
  },
  env: {
    appName: 'vscode',
  },
  commands: {
    executeCommand: jest.fn(),
  },
  StatusBarAlignment: {
    Left: 1,
    Right: 2,
  },
}));

jest.mock('./nx-cloud-fix-webview', () => ({
  fetchAndPullChanges: jest.fn(),
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
    const tenMinutesAgo = Date.now() - 1000 * 60 * 10;
    const oneMinuteAgo = Date.now() - 1000 * 60 * 1;
    type PipelineExamples =
      | 'success'
      | 'fail'
      | 'progress'
      | 'progressFailedRun'
      | 'empty'
      | 'failWithAiFix'
      | 'progressFailedRunWithAiFix'
      | 'progressWithAiFixNoSuggestion'
      | 'progressWithAiFixWithSuggestion'
      | 'progressWithAiFixNotStarted'
      | 'failWithAiFixesEnabled'
      | 'progressFailedRunWithAiFixesEnabled'
      | 'successWithAiFixesEnabled';
    const pipelineExamples: Record<PipelineExamples, CIPEInfo[]> = {
      success: [
        {
          ciPipelineExecutionId: '1',
          branch: 'feature',
          status: 'SUCCEEDED',
          createdAt: tenMinutesAgo,
          completedAt: oneMinuteAgo,
          commitTitle: 'fix: fix fix',
          commitUrl: 'https://github.com/commit/123',
          cipeUrl: 'https://cloud.nx.app/cipes/123',
          runGroups: [
            {
              createdAt: tenMinutesAgo,
              completedAt: oneMinuteAgo,
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
          createdAt: tenMinutesAgo,
          completedAt: oneMinuteAgo,
          commitTitle: 'fix: fix fix',
          commitUrl: 'https://github.com/commit/123',
          cipeUrl: 'https://cloud.nx.app/cipes/123',
          runGroups: [
            {
              createdAt: tenMinutesAgo,
              completedAt: oneMinuteAgo,
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
          createdAt: tenMinutesAgo,
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
          createdAt: tenMinutesAgo,
          completedAt: null,
          commitTitle: 'fix: fix fix',
          runGroups: [
            {
              createdAt: tenMinutesAgo,
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
      failWithAiFix: [
        {
          ciPipelineExecutionId: '1',
          aiFixesEnabled: true,
          branch: 'feature',
          status: 'FAILED',
          createdAt: tenMinutesAgo,
          completedAt: oneMinuteAgo,
          commitTitle: 'fix: fix fix',
          commitUrl: 'https://github.com/commit/123',
          cipeUrl: 'https://cloud.nx.app/cipes/123',
          runGroups: [
            {
              createdAt: tenMinutesAgo,
              completedAt: oneMinuteAgo,
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
              aiFix: {
                aiFixId: 'ai-fix-123',
                taskIds: ['test-task-1'],
                terminalLogsUrls: { 'test-task-1': 'http://logs.url' },
                suggestedFix: 'git diff content here...',
                suggestedFixDescription: 'Fix the failing test',
                suggestedFixStatus: 'COMPLETED',
                verificationStatus: 'COMPLETED',
                userAction: 'NONE',
              },
            },
          ],
        },
      ],
      progressFailedRunWithAiFix: [
        {
          ciPipelineExecutionId: '1',
          aiFixesEnabled: true,
          branch: 'feature',
          status: 'IN_PROGRESS',
          createdAt: tenMinutesAgo,
          completedAt: null,
          commitTitle: 'fix: fix fix',
          runGroups: [
            {
              createdAt: tenMinutesAgo,
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
              aiFix: {
                aiFixId: 'ai-fix-456',
                taskIds: ['test-task-2'],
                terminalLogsUrls: { 'test-task-2': 'http://logs.url' },
                suggestedFix: 'git diff content here...',
                suggestedFixDescription: 'Fix the failing test',
                suggestedFixStatus: 'COMPLETED',
                verificationStatus: 'COMPLETED',
                userAction: 'NONE',
              },
            },
          ],
          commitUrl: 'https://github.com/commit/123',
          cipeUrl: 'https://cloud.nx.app/cipes/123',
        },
      ],
      progressWithAiFixNoSuggestion: [
        {
          ciPipelineExecutionId: '1',
          aiFixesEnabled: true,
          branch: 'feature',
          status: 'IN_PROGRESS',
          createdAt: tenMinutesAgo,
          completedAt: null,
          commitTitle: 'fix: fix fix',
          runGroups: [
            {
              createdAt: tenMinutesAgo,
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
              aiFix: {
                aiFixId: 'ai-fix-789',
                taskIds: ['test-task-3'],
                terminalLogsUrls: { 'test-task-3': 'http://logs.url' },
                suggestedFix: null,
                suggestedFixDescription: null,
                suggestedFixStatus: 'IN_PROGRESS',
                verificationStatus: 'IN_PROGRESS',
                userAction: 'NONE',
              },
            },
          ],
          commitUrl: 'https://github.com/commit/123',
          cipeUrl: 'https://cloud.nx.app/cipes/123',
        },
      ],
      progressWithAiFixWithSuggestion: [
        {
          ciPipelineExecutionId: '1',
          aiFixesEnabled: true,
          branch: 'feature',
          status: 'IN_PROGRESS',
          createdAt: tenMinutesAgo,
          completedAt: null,
          commitTitle: 'fix: fix fix',
          runGroups: [
            {
              createdAt: tenMinutesAgo,
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
              aiFix: {
                aiFixId: 'ai-fix-999',
                taskIds: ['test-task-4'],
                terminalLogsUrls: { 'test-task-4': 'http://logs.url' },
                suggestedFix: 'git diff content here...',
                suggestedFixDescription: 'Fix the failing test',
                suggestedFixStatus: 'COMPLETED',
                verificationStatus: 'COMPLETED',
                userAction: 'NONE',
              },
            },
          ],
          commitUrl: 'https://github.com/commit/123',
          cipeUrl: 'https://cloud.nx.app/cipes/123',
        },
      ],
      progressWithAiFixNotStarted: [
        {
          ciPipelineExecutionId: '1',
          aiFixesEnabled: true,
          branch: 'feature',
          status: 'IN_PROGRESS',
          createdAt: tenMinutesAgo,
          completedAt: null,
          commitTitle: 'fix: fix fix',
          runGroups: [
            {
              createdAt: tenMinutesAgo,
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
              aiFix: {
                aiFixId: 'ai-fix-999',
                suggestedFixStatus: 'NOT_STARTED',
                taskIds: [],
                terminalLogsUrls: {},
                verificationStatus: 'NOT_STARTED',
                userAction: 'NONE',
              },
            },
          ],
          commitUrl: 'https://github.com/commit/123',
          cipeUrl: 'https://cloud.nx.app/cipes/123',
        },
      ],
      failWithAiFixesEnabled: [
        {
          ciPipelineExecutionId: '1',
          aiFixesEnabled: true,
          branch: 'feature',
          status: 'FAILED',
          createdAt: tenMinutesAgo,
          completedAt: oneMinuteAgo,
          commitTitle: 'fix: fix fix',
          commitUrl: 'https://github.com/commit/123',
          cipeUrl: 'https://cloud.nx.app/cipes/123',
          runGroups: [
            {
              createdAt: tenMinutesAgo,
              completedAt: oneMinuteAgo,
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
      progressFailedRunWithAiFixesEnabled: [
        {
          ciPipelineExecutionId: '1',
          aiFixesEnabled: true,
          branch: 'feature',
          status: 'IN_PROGRESS',
          createdAt: tenMinutesAgo,
          completedAt: null,
          commitTitle: 'fix: fix fix',
          runGroups: [
            {
              createdAt: tenMinutesAgo,
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
      successWithAiFixesEnabled: [
        {
          ciPipelineExecutionId: '1',
          aiFixesEnabled: true,
          branch: 'feature',
          status: 'SUCCEEDED',
          createdAt: tenMinutesAgo,
          completedAt: oneMinuteAgo,
          commitTitle: 'fix: fix fix',
          commitUrl: 'https://github.com/commit/123',
          cipeUrl: 'https://cloud.nx.app/cipes/123',
          runGroups: [
            {
              createdAt: tenMinutesAgo,
              completedAt: oneMinuteAgo,
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
    } as const;

    type NotificationResults = 'info' | 'error' | 'no';

    it('should not show any notifications when setting is "none"', () => {
      globalConfigMock.mockReturnValue('none');

      const notificationService = new CIPENotificationService();

      notificationService.compareCIPEDataAndSendNotifications(
        pipelineExamples.empty,
        pipelineExamples.success,
      );
      notificationService.compareCIPEDataAndSendNotifications(
        pipelineExamples.empty,
        pipelineExamples.fail,
      );
      notificationService.compareCIPEDataAndSendNotifications(
        pipelineExamples.empty,
        pipelineExamples.progressFailedRun,
      );
      notificationService.compareCIPEDataAndSendNotifications(
        pipelineExamples.empty,
        pipelineExamples.success,
      );
      notificationService.compareCIPEDataAndSendNotifications(
        pipelineExamples.empty,
        pipelineExamples.fail,
      );
      notificationService.compareCIPEDataAndSendNotifications(
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

      /* these are weird cases that should not happen but we'll test them anyway */
      ['progressFailedRun', 'progress', 'no'],
      ['progressFailedRun', 'success', 'no'],
      ['fail', 'progress', 'no'],
      ['fail', 'success', 'no'],
      ['fail', 'progressFailedRun', 'no'],
      ['success', 'progress', 'no'],
      ['success', 'progressFailedRun', 'no'],
      ['success', 'fail', 'no'],

      /* AI fix test cases */
      ['empty', 'failWithAiFix', 'error'], // AI fix with suggestion appears
      ['progress', 'failWithAiFix', 'error'], // AI fix with suggestion appears
      ['empty', 'progressFailedRunWithAiFix', 'error'], // AI fix with suggestion appears
      ['progress', 'progressFailedRunWithAiFix', 'error'], // AI fix with suggestion appears
      ['progressWithAiFixNoSuggestion', 'progressFailedRunWithAiFix', 'error'], // Different AI fix with suggestion
      ['progressWithAiFixNoSuggestion', 'failWithAiFix', 'error'], // Different AI fix with suggestion
      ['progressFailedRun', 'progressWithAiFixWithSuggestion', 'error'], // Transition from no AI fix to AI fix with suggestion
      [
        'progressWithAiFixNoSuggestion',
        'progressWithAiFixWithSuggestion',
        'error',
      ], // AI fix gets suggestion
      ['progressFailedRun', 'progressWithAiFixNoSuggestion', 'no'], // AI fix without suggestion doesn't notify
      [
        'progressWithAiFixWithSuggestion',
        'progressWithAiFixWithSuggestion',
        'no',
      ], // No change, no notification
      ['failWithAiFix', 'failWithAiFix', 'no'], // Same state, no notification
      ['progressWithAiFixWithSuggestion', 'progressFailedRunWithAiFix', 'no'], // Both have suggestions, no notification
      ['empty', 'progressWithAiFixNotStarted', 'no'], // AI fix not started, no notification
      ['progressWithAiFixNotStarted', 'progressFailedRunWithAiFix', 'error'], // AI fix becomes available, notification
      [
        'progressWithAiFixNotStarted',
        'progressWithAiFixWithSuggestion',
        'error',
      ], // AI fix becomes available, notification
      ['progressWithAiFixNotStarted', 'failWithAiFix', 'error'], // AI fix becomes available, notification

      /* Cipes with aiFixesEnabled should essentially be indetermined yet until we know if an AI fix comes */
      ['empty', 'failWithAiFixesEnabled', 'no'],
      ['empty', 'progressFailedRunWithAiFixesEnabled', 'no'],
      ['progress', 'failWithAiFixesEnabled', 'no'],
      ['empty', 'successWithAiFixesEnabled', 'info'], // Success should still show notification
      ['failWithAiFixesEnabled', 'failWithAiFix', 'error'],
      [
        'progressFailedRunWithAiFixesEnabled',
        'progressFailedRunWithAiFix',
        'error',
      ],
      ['progressFailedRunWithAiFixesEnabled', 'failWithAiFix', 'error'],
      ['successWithAiFixesEnabled', 'success', 'no'], // Success should've shown notification right away
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
        const notificationService = new CIPENotificationService();
        notificationService.compareCIPEDataAndSendNotifications(
          oldPipeline,
          newPipeline,
        );
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
      const notificationService = new CIPENotificationService();
      globalConfigMock.mockReturnValue('error');
      notificationService.compareCIPEDataAndSendNotifications(
        pipelineExamples.empty,
        pipelineExamples.success,
      );
      notificationService.compareCIPEDataAndSendNotifications(
        pipelineExamples.progress,
        pipelineExamples.success,
      );
      expect(window.showInformationMessage).not.toHaveBeenCalled();
      expect(window.showErrorMessage).not.toHaveBeenCalled();
    });

    describe('AI Fix Suppression Logic', () => {
      it('should suppress failure notifications but show AI fix notification when AI fix becomes available', () => {
        // CIPE failure with AI fix - should suppress error notification but show AI fix notification
        new CIPENotificationService().compareCIPEDataAndSendNotifications(
          pipelineExamples.progress,
          pipelineExamples.failWithAiFix,
        );
        expect(window.showInformationMessage).not.toHaveBeenCalled();
        expect(window.showErrorMessage).toHaveBeenCalledTimes(1);
        expect(window.showErrorMessage).toHaveBeenCalledWith(
          'CI failed. Nx Cloud AI has a fix for #feature',
          'Show Fix',
          'Reject',
        );

        jest.clearAllMocks();

        // Run failure with AI fix - should suppress error notification but show AI fix notification
        new CIPENotificationService().compareCIPEDataAndSendNotifications(
          pipelineExamples.progress,
          pipelineExamples.progressFailedRunWithAiFix,
        );
        expect(window.showInformationMessage).not.toHaveBeenCalled();
        expect(window.showErrorMessage).toHaveBeenCalledTimes(1);
        expect(window.showErrorMessage).toHaveBeenCalledWith(
          'CI failed. Nx Cloud AI has a fix for #feature',
          'Show Fix',
          'Reject',
        );
      });

      it('should only suppress failure notifications without showing AI fix notification when AI fix already existed', () => {
        const notificationService = new CIPENotificationService();
        // When AI fix with suggestedFix already existed in old state, should not show any notification
        notificationService.compareCIPEDataAndSendNotifications(
          pipelineExamples.failWithAiFix, // Already has AI fix with suggestion
          pipelineExamples.failWithAiFix, // Same state
        );
        expect(window.showErrorMessage).not.toHaveBeenCalled();
        expect(window.showInformationMessage).not.toHaveBeenCalled();

        jest.clearAllMocks();

        // Transition between different AI fixes that both have suggestions - no notification
        notificationService.compareCIPEDataAndSendNotifications(
          pipelineExamples.progressWithAiFixWithSuggestion,
          pipelineExamples.progressFailedRunWithAiFix,
        );
        expect(window.showErrorMessage).not.toHaveBeenCalled();
        expect(window.showInformationMessage).not.toHaveBeenCalled();
      });

      it('should not show failure notifications for cipes with aiFixesEnabled until we know if an AI fix comes', () => {
        const notificationService = new CIPENotificationService();
        notificationService.compareCIPEDataAndSendNotifications(
          pipelineExamples.empty,
          pipelineExamples.failWithAiFixesEnabled,
        );
        expect(window.showErrorMessage).not.toHaveBeenCalled();
        expect(window.showInformationMessage).not.toHaveBeenCalled();

        jest.clearAllMocks();

        notificationService.compareCIPEDataAndSendNotifications(
          pipelineExamples.progressFailedRunWithAiFixesEnabled,
          pipelineExamples.progressFailedRunWithAiFix,
        );
        expect(window.showInformationMessage).not.toHaveBeenCalled();
        expect(window.showErrorMessage).toHaveBeenCalledTimes(1);
        expect(window.showErrorMessage).toHaveBeenCalledWith(
          'CI failed. Nx Cloud AI has a fix for #feature',
          'Show Fix',
          'Reject',
        );
      });

      it('should show regular error notification if a new run fails and there is no AI fix after 5 minutes', () => {
        const sixMinutesAgo = Date.now() - 1000 * 60 * 6;
        const failedCipe: CIPEInfo[] = [
          {
            ...pipelineExamples.failWithAiFixesEnabled[0],
            createdAt: tenMinutesAgo,
            completedAt: sixMinutesAgo,
          },
        ];

        const notificationService = new CIPENotificationService();
        notificationService.compareCIPEDataAndSendNotifications(
          pipelineExamples.empty,
          failedCipe,
        );
        expect(window.showInformationMessage).not.toHaveBeenCalled();
        expect(window.showErrorMessage).toHaveBeenCalledTimes(1);
        expect(window.showErrorMessage).toHaveBeenCalledWith(
          'CI failed for #feature.',
          'View Commit',
          'View Results',
        );
      });

      it('should show regular error notification when transitioning to no AI fix after 5 minutes', () => {
        const sixMinutesAgo = Date.now() - 1000 * 60 * 6;

        // CIPE that was waiting for AI fix (within 5 minutes)
        const waitingCipe: CIPEInfo[] = [
          {
            ...pipelineExamples.failWithAiFixesEnabled[0],
            createdAt: tenMinutesAgo,
            completedAt: oneMinuteAgo, // Within 5 minutes
          },
        ];

        // Same CIPE but now past 5 minutes
        const failedCipe: CIPEInfo[] = [
          {
            ...pipelineExamples.failWithAiFixesEnabled[0],
            createdAt: tenMinutesAgo,
            completedAt: sixMinutesAgo, // Past 5 minutes
          },
        ];

        jest.clearAllMocks();

        // Transition from waiting to timeout - should show delayed notification
        new CIPENotificationService().compareCIPEDataAndSendNotifications(
          waitingCipe,
          failedCipe,
        );
        expect(window.showInformationMessage).not.toHaveBeenCalled();
        expect(window.showErrorMessage).toHaveBeenCalledTimes(1);
        expect(window.showErrorMessage).toHaveBeenCalledWith(
          'CI failed for #feature.',
          'View Commit',
          'View Results',
        );
      });

      it('should not show delayed notification repeatedly - only once when transitioning from waiting to no AI fix', () => {
        const sixMinutesAgo = Date.now() - 1000 * 60 * 6;

        // CIPE that previously could have had AI fix (within 5 minutes)
        const cipeWaitingForAiFix: CIPEInfo[] = [
          {
            ...pipelineExamples.failWithAiFixesEnabled[0],
            createdAt: tenMinutesAgo,
            completedAt: oneMinuteAgo, // Within 5 minutes, so still waiting
          },
        ];

        // Same CIPE but now past 5 minutes
        const cipeAfterTimeout: CIPEInfo[] = [
          {
            ...pipelineExamples.failWithAiFixesEnabled[0],
            createdAt: tenMinutesAgo,
            completedAt: sixMinutesAgo, // Past 5 minutes, no AI fix coming
          },
        ];

        // First transition: from waiting to timeout - should show delayed notification
        new CIPENotificationService().compareCIPEDataAndSendNotifications(
          cipeWaitingForAiFix,
          cipeAfterTimeout,
        );
        expect(window.showErrorMessage).toHaveBeenCalledTimes(1);
        expect(window.showErrorMessage).toHaveBeenCalledWith(
          'CI failed for #feature.',
          'View Commit',
          'View Results',
        );

        jest.clearAllMocks();

        // Subsequent checks with same state - should NOT show notification again
        new CIPENotificationService().compareCIPEDataAndSendNotifications(
          cipeAfterTimeout,
          cipeAfterTimeout,
        );
        expect(window.showErrorMessage).not.toHaveBeenCalled();
        expect(window.showInformationMessage).not.toHaveBeenCalled();

        jest.clearAllMocks();

        // Another check - should still NOT show notification
        new CIPENotificationService().compareCIPEDataAndSendNotifications(
          cipeAfterTimeout,
          cipeAfterTimeout,
        );
        expect(window.showErrorMessage).not.toHaveBeenCalled();
        expect(window.showInformationMessage).not.toHaveBeenCalled();
      });
    });

    it('should not show regular notifications twice even if run has been failed for more than 5 minutes and ai fixes are not enabled', () => {
      const sixMinutesAgo = Date.now() - 1000 * 60 * 6;
      const failedCipe: CIPEInfo[] = [
        {
          ...pipelineExamples.fail[0],
          createdAt: tenMinutesAgo,
          completedAt: sixMinutesAgo,
        },
      ];

      new CIPENotificationService().compareCIPEDataAndSendNotifications(
        failedCipe,
        failedCipe,
      );
      expect(window.showInformationMessage).not.toHaveBeenCalled();
      expect(window.showErrorMessage).not.toHaveBeenCalled();
    });

    describe('AI Fix Edge Cases', () => {
      it('should handle multiple run groups with mixed AI fix states', () => {
        const mixedRunGroups: CIPEInfo[] = [
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
              // First run group with AI fix
              {
                createdAt: 10000,
                completedAt: 10001,
                runGroup: 'rungroup-1',
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
                aiFix: {
                  aiFixId: 'ai-fix-1',
                  taskIds: ['test-task-1'],
                  terminalLogsUrls: { 'test-task-1': 'http://logs.url' },
                  suggestedFix: 'git diff content...',
                  suggestedFixDescription: 'Fix test',
                  suggestedFixStatus: 'COMPLETED',
                  verificationStatus: 'COMPLETED',
                  userAction: 'NONE',
                },
              },
              // Second run group without AI fix
              {
                createdAt: 10000,
                completedAt: 10001,
                runGroup: 'rungroup-2',
                ciExecutionEnv: '123123',
                status: 'FAILED',
                runs: [
                  {
                    linkId: '456456',
                    status: 'FAILED',
                    command: 'nx build',
                    runUrl: 'http://test2.url',
                  },
                ],
              },
            ],
          },
        ];

        // Should suppress failure notification but show AI fix notification because suggestedFix is newly available
        new CIPENotificationService().compareCIPEDataAndSendNotifications(
          pipelineExamples.progress,
          mixedRunGroups,
        );
        expect(window.showInformationMessage).not.toHaveBeenCalled();
        expect(window.showErrorMessage).toHaveBeenCalledWith(
          'CI failed. Nx Cloud AI has a fix for #feature',
          'Show Fix',
          'Reject',
        );
      });

      it('should handle transitions between different AI fix states', () => {
        // Test various state transitions
        const transitions: Array<
          [PipelineExamples, PipelineExamples, boolean]
        > = [
          ['progressFailedRun', 'progressWithAiFixNoSuggestion', false], // AI fix appears but no suggestion
          [
            'progressWithAiFixNoSuggestion',
            'progressWithAiFixWithSuggestion',
            true,
          ], // Suggestion appears
          [
            'progressWithAiFixWithSuggestion',
            'progressWithAiFixNoSuggestion',
            false,
          ], // Suggestion disappears
          [
            'progressWithAiFixWithSuggestion',
            'progressFailedRunWithAiFix',
            false,
          ], // Different AI fix with suggestion (no change)
        ];

        transitions.forEach(([from, to, shouldNotify]) => {
          jest.clearAllMocks();

          new CIPENotificationService().compareCIPEDataAndSendNotifications(
            pipelineExamples[from],
            pipelineExamples[to],
          );

          if (shouldNotify) {
            expect(window.showErrorMessage).toHaveBeenCalled();
          } else {
            expect(window.showErrorMessage).not.toHaveBeenCalled();
          }
          expect(window.showInformationMessage).not.toHaveBeenCalled();
        });
      });
    });
  });
});
