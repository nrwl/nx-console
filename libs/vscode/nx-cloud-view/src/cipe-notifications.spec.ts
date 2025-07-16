import { CIPEInfo } from '@nx-console/shared-types';
import { window } from 'vscode';
import { compareCIPEDataAndSendNotification } from './cipe-notifications';

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
      | 'empty'
      | 'failWithAiFix'
      | 'progressFailedRunWithAiFix'
      | 'progressWithAiFixNoSuggestion'
      | 'progressWithAiFixWithSuggestion'
      | 'progressWithAiFixNotStarted';
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
      failWithAiFix: [
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
      // AI fix test cases
      ['empty', 'failWithAiFix', 'info'], // AI fix with suggestion appears
      ['progress', 'failWithAiFix', 'info'], // AI fix with suggestion appears
      ['empty', 'progressFailedRunWithAiFix', 'info'], // AI fix with suggestion appears
      ['progress', 'progressFailedRunWithAiFix', 'info'], // AI fix with suggestion appears
      ['progressWithAiFixNoSuggestion', 'progressFailedRunWithAiFix', 'info'], // Different AI fix with suggestion
      ['progressWithAiFixNoSuggestion', 'failWithAiFix', 'info'], // Different AI fix with suggestion
      ['progressFailedRun', 'progressWithAiFixWithSuggestion', 'info'], // Transition from no AI fix to AI fix with suggestion
      [
        'progressWithAiFixNoSuggestion',
        'progressWithAiFixWithSuggestion',
        'info',
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
      ['progressWithAiFixNotStarted', 'progressFailedRunWithAiFix', 'info'], // AI fix becomes available, notification
      [
        'progressWithAiFixNotStarted',
        'progressWithAiFixWithSuggestion',
        'info',
      ], // AI fix becomes available, notification
      ['progressWithAiFixNotStarted', 'failWithAiFix', 'info'], // AI fix becomes available, notification
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

    describe('AI Fix Suppression Logic', () => {
      it('should suppress failure notifications but show AI fix notification when AI fix becomes available', () => {
        // CIPE failure with AI fix - should suppress error notification but show AI fix notification
        compareCIPEDataAndSendNotification(
          pipelineExamples.progress,
          pipelineExamples.failWithAiFix,
        );
        expect(window.showErrorMessage).not.toHaveBeenCalled();
        expect(window.showInformationMessage).toHaveBeenCalledWith(
          'Nx Cloud suggested a fix for test-task-1 in #feature',
          'Show Suggested Fix',
          'Reject',
        );

        jest.clearAllMocks();

        // Run failure with AI fix - should suppress error notification but show AI fix notification
        compareCIPEDataAndSendNotification(
          pipelineExamples.progress,
          pipelineExamples.progressFailedRunWithAiFix,
        );
        expect(window.showErrorMessage).not.toHaveBeenCalled();
        expect(window.showInformationMessage).toHaveBeenCalledWith(
          'Nx Cloud suggested a fix for test-task-2 in #feature',
          'Show Suggested Fix',
          'Reject',
        );
      });

      it('should only suppress failure notifications without showing AI fix notification when AI fix already existed', () => {
        // When AI fix with suggestedFix already existed in old state, should not show any notification
        compareCIPEDataAndSendNotification(
          pipelineExamples.failWithAiFix, // Already has AI fix with suggestion
          pipelineExamples.failWithAiFix, // Same state
        );
        expect(window.showErrorMessage).not.toHaveBeenCalled();
        expect(window.showInformationMessage).not.toHaveBeenCalled();

        jest.clearAllMocks();

        // Transition between different AI fixes that both have suggestions - no notification
        compareCIPEDataAndSendNotification(
          pipelineExamples.progressWithAiFixWithSuggestion,
          pipelineExamples.progressFailedRunWithAiFix,
        );
        expect(window.showErrorMessage).not.toHaveBeenCalled();
        expect(window.showInformationMessage).not.toHaveBeenCalled();
      });
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
        compareCIPEDataAndSendNotification(
          pipelineExamples.progress,
          mixedRunGroups,
        );
        expect(window.showErrorMessage).not.toHaveBeenCalled();
        expect(window.showInformationMessage).toHaveBeenCalledWith(
          'Nx Cloud suggested a fix for test-task-1 in #feature',
          'Show Suggested Fix',
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

          compareCIPEDataAndSendNotification(
            pipelineExamples[from],
            pipelineExamples[to],
          );

          if (shouldNotify) {
            expect(window.showInformationMessage).toHaveBeenCalled();
          } else {
            expect(window.showInformationMessage).not.toHaveBeenCalled();
          }
          expect(window.showErrorMessage).not.toHaveBeenCalled();
        });
      });
    });
  });
});
