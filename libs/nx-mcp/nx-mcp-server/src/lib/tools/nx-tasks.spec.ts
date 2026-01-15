import { nxCurrentlyRunningTaskOutput } from './nx-tasks';
import { IdeProvider } from '../ide-provider';
import { RunningTasksMap, TaskStatus } from '@nx-console/shared-running-tasks';
describe('nxCurrentlyRunningTaskOutput - bottom-up pagination', () => {
  const TASK_OUTPUT_CHUNK_SIZE = 10000;
  function generateOutput(size: number): string {
    const line =
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n';
    let output = '';
    while (output.length < size) {
      output += line;
    }
    return output;
  }
  let mockIdeProvider: IdeProvider;
  let mockRunningTasks: RunningTasksMap;
  let taskOutputHandler: ReturnType<typeof nxCurrentlyRunningTaskOutput>;
  beforeEach(() => {
    const largeOutput = generateOutput(25000); // 25KB output
    const smallOutput = 'Small task output\n'.repeat(10);
    const uniqueOutput =
      'START\n' + 'x'.repeat(TASK_OUTPUT_CHUNK_SIZE * 2.5) + '\nEND';
    mockRunningTasks = {
      'large-task-id': {
        name: 'build:production',
        status: 'running' as TaskStatus,
        continuous: false,
        output: largeOutput,
        connectionId: 'test-connection',
        overallRunStatus: 'running' as TaskStatus,
      },
      'small-task-id': {
        name: 'test:unit',
        status: 'completed' as TaskStatus,
        continuous: false,
        output: smallOutput,
        connectionId: 'test-connection',
        overallRunStatus: 'completed' as TaskStatus,
      },
      'unique-task-id': {
        name: 'serve:app',
        status: 'running' as TaskStatus,
        continuous: true,
        output: uniqueOutput,
        connectionId: 'test-connection',
        overallRunStatus: 'running' as TaskStatus,
      },
      'empty-task-id': {
        name: 'empty:task',
        status: 'completed' as TaskStatus,
        continuous: false,
        output: '',
        connectionId: 'test-connection',
        overallRunStatus: 'completed' as TaskStatus,
      },
    };
    mockIdeProvider = {
      isAvailable: () => true,
      focusProject: jest.fn(),
      focusTask: jest.fn(),
      showFullProjectGraph: jest.fn(),
      getRunningTasks: jest.fn().mockResolvedValue(mockRunningTasks),
      onConnectionChange: jest.fn(() => {
        // Return cleanup function
        return () => {
          // Cleanup logic
        };
      }),
      dispose: jest.fn(),
    };
    taskOutputHandler = nxCurrentlyRunningTaskOutput(
      undefined,
      mockIdeProvider,
    );
  });
  it('should return most recent chunk (from end) on page 0 for large output', async () => {
    const result = await taskOutputHandler({
      taskId: 'large-task-id',
    });
    expect(result.content.length).toBe(2);
    const taskOutput = result.content[0]?.text;
    expect(taskOutput).toContain('TaskId: build:production');
    expect(taskOutput).toContain('(status: running)');
    expect(taskOutput).toContain('Output:');
    expect(taskOutput).toContain('...[older output on page 1]');
    expect(taskOutput).not.toContain('(currently on page');
    const paginationMessage = result.content[1]?.text;
    expect(paginationMessage).toContain('Next page token: 1');
    expect(paginationMessage).toContain('retrieve older output');
    // Page 0 should contain the last part of the output
    const largeOutput = mockRunningTasks['large-task-id'].output;
    const lastChars = largeOutput.slice(-100);
    expect(taskOutput).toContain(lastChars);
  });
  it('should return older content on page 1', async () => {
    const page0 = await taskOutputHandler({
      taskId: 'unique-task-id',
      pageToken: 0,
    });
    const page1 = await taskOutputHandler({
      taskId: 'unique-task-id',
      pageToken: 1,
    });
    const page0Text = page0.content[0]?.text;
    const page1Text = page1.content[0]?.text;
    expect(page0Text).toContain('TaskId: serve:app');
    expect(page1Text).toContain('TaskId: serve:app');
    // Page 0 should contain END marker (most recent)
    expect(page0Text).toContain('END');
    // Page 1 should not contain END marker (older content)
    expect(page1Text).not.toContain('END');
    // Page 1 should have "older output on page 2" indicator
    expect(page1Text).toContain('...[older output on page 2]');
    // Page 1 should have "currently on page 1" indicator
    expect(page1Text).toContain('(currently on page 1)');
  });
  it('should not paginate when output fits in one chunk', async () => {
    const result = await taskOutputHandler({
      taskId: 'small-task-id',
    });
    expect(result.content).toHaveLength(1);
    const taskOutput = result.content[0]?.text;
    expect(taskOutput).toContain('TaskId: test:unit');
    expect(taskOutput).toContain('(status: completed)');
    expect(taskOutput).not.toContain('Next page token');
    expect(taskOutput).not.toContain('...[older output');
    expect(result.content[1]).toBeUndefined();
  });
  it('should return "no more content" when page token beyond content', async () => {
    const result = await taskOutputHandler({
      taskId: 'large-task-id',
      pageToken: 10,
    });
    expect(result.content).toHaveLength(1);
    expect(result.content[0]?.text).toContain(
      'build:production - no more content on page 10',
    );
  });
  it('should handle empty output', async () => {
    const result = await taskOutputHandler({
      taskId: 'empty-task-id',
    });
    expect(result.content).toHaveLength(1);
    expect(result.content[0]?.text).toContain(
      'No task outputs available for empty:task',
    );
  });
  it('should handle task not found', async () => {
    const result = await taskOutputHandler({
      taskId: 'nonexistent-task',
    });
    expect(result.content).toHaveLength(1);
    expect(result.content[0]?.text).toContain(
      'No task found with ID nonexistent-task',
    );
  });
  it('should find task by partial name match', async () => {
    const result = await taskOutputHandler({
      taskId: 'build',
    });
    expect(result.content.length).toBeGreaterThan(0);
    const taskOutput = result.content[0]?.text;
    expect(taskOutput).toContain('TaskId: build:production');
  });
  it('should include continuous flag for continuous tasks', async () => {
    const result = await taskOutputHandler({
      taskId: 'unique-task-id',
    });
    const taskOutput = result.content[0]?.text;
    expect(taskOutput).toContain('(continuous)');
    expect(taskOutput).toContain('serve:app');
  });
  it('should correctly paginate exactly 2 chunks', async () => {
    const exactSizeOutput = 'x'.repeat(TASK_OUTPUT_CHUNK_SIZE * 2);
    mockRunningTasks['exact-task'] = {
      name: 'exact:task',
      status: 'running' as TaskStatus,
      continuous: false,
      output: exactSizeOutput,
      connectionId: 'test-connection',
      overallRunStatus: 'running' as TaskStatus,
    };
    const page0 = await taskOutputHandler({
      taskId: 'exact-task',
      pageToken: 0,
    });
    const page1 = await taskOutputHandler({
      taskId: 'exact-task',
      pageToken: 1,
    });
    const page2 = await taskOutputHandler({
      taskId: 'exact-task',
      pageToken: 2,
    });
    // Page 0 should have more content
    expect(page0.content.length).toBe(2);
    expect(page0.content[1]?.text).toContain('Next page token: 1');
    // Page 1 should be the last page (no more content)
    expect(page1.content.length).toBe(1);
    expect(page1.content[0]?.text).not.toContain('Next page token');
    // Page 2 should be beyond content
    expect(page2.content[0]?.text).toContain('no more content on page 2');
  });
});
