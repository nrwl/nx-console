import { PassiveDaemonWatcher } from './passive-daemon-watcher';
import { getNxDaemonClient } from '@nx-console/shared-nx-workspace-info';

jest.mock('@nx-console/shared-nx-workspace-info');

describe('PassiveDaemonWatcher', () => {
  let mockDaemonClient: any;
  let capturedDaemonCallback: any;
  let mockUnregister: jest.Mock;
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUnregister = jest.fn();
    mockLogger = {
      log: jest.fn(),
    };

    mockDaemonClient = {
      enabled: jest.fn().mockReturnValue(true),
      registerProjectGraphRecomputationListener: jest
        .fn()
        .mockImplementation((callback) => {
          capturedDaemonCallback = callback;
          return mockUnregister;
        }),
    };

    (getNxDaemonClient as jest.Mock).mockResolvedValue({
      daemonClient: mockDaemonClient,
    });
  });

  describe('Basic Listener Flow', () => {
    it('should trigger registered listener when daemon emits project graph change', async () => {
      const watcher = new PassiveDaemonWatcher('/workspace', mockLogger);
      const listener = jest.fn();

      watcher.listen(listener);
      watcher.start();

      await flushPromises();

      const mockProjectGraph = { nodes: {}, dependencies: {} };
      const mockSourceMaps = {};
      capturedDaemonCallback(null, {
        projectGraph: mockProjectGraph,
        sourceMaps: mockSourceMaps,
      });

      expect(listener).toHaveBeenCalledWith(null, {
        projectGraph: mockProjectGraph,
        sourceMaps: mockSourceMaps,
      });

      watcher.dispose();
    });

    it('should trigger multiple listeners when daemon emits change', async () => {
      const watcher = new PassiveDaemonWatcher('/workspace', mockLogger);
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const listener3 = jest.fn();

      watcher.listen(listener1);
      watcher.listen(listener2);
      watcher.listen(listener3);
      watcher.start();

      await flushPromises();

      const mockData = {
        projectGraph: { nodes: {}, dependencies: {} },
        sourceMaps: {},
      };
      capturedDaemonCallback(null, mockData);

      expect(listener1).toHaveBeenCalledWith(null, mockData);
      expect(listener2).toHaveBeenCalledWith(null, mockData);
      expect(listener3).toHaveBeenCalledWith(null, mockData);

      watcher.dispose();
    });

    it('should stop notifying listeners after unregister is called', async () => {
      const watcher = new PassiveDaemonWatcher('/workspace', mockLogger);
      const listener = jest.fn();

      const unregister = watcher.listen(listener);
      watcher.start();

      await flushPromises();

      unregister();

      const mockData = {
        projectGraph: { nodes: {}, dependencies: {} },
        sourceMaps: {},
      };
      capturedDaemonCallback(null, mockData);

      expect(listener).not.toHaveBeenCalled();

      watcher.dispose();
    });
  });

  describe('Error Handling', () => {
    it('should transition to idle when daemon listener callback receives an error', async () => {
      const watcher = new PassiveDaemonWatcher('/workspace', mockLogger);
      watcher.start();

      await flushPromises();

      expect(watcher.state).toBe('listening');

      capturedDaemonCallback(new Error('Daemon error'));

      await flushPromises();

      expect(watcher.state).toBe('idle');

      watcher.dispose();
    });

    it('should transition to idle when daemon listener callback receives "closed"', async () => {
      const watcher = new PassiveDaemonWatcher('/workspace', mockLogger);
      watcher.start();

      await flushPromises();

      expect(watcher.state).toBe('listening');

      capturedDaemonCallback('closed');

      await flushPromises();

      expect(watcher.state).toBe('idle');

      watcher.dispose();
    });

    it('should transition to idle when registration fails', async () => {
      (getNxDaemonClient as jest.Mock).mockRejectedValueOnce(
        new Error('Failed'),
      );

      const watcher = new PassiveDaemonWatcher('/workspace', mockLogger);
      watcher.start();

      await flushPromises();

      expect(watcher.state).toBe('idle');

      watcher.dispose();
    });

    it('should transition to idle when daemon is not enabled', async () => {
      mockDaemonClient.enabled.mockReturnValue(false);

      const watcher = new PassiveDaemonWatcher('/workspace', mockLogger);
      watcher.start();

      await flushPromises();

      expect(watcher.state).toBe('idle');

      watcher.dispose();
    });
  });

  describe('Cleanup', () => {
    it('should call unregister callback on stop()', async () => {
      const watcher = new PassiveDaemonWatcher('/workspace', mockLogger);
      watcher.start();

      await flushPromises();

      expect(mockUnregister).not.toHaveBeenCalled();

      watcher.stop();

      await flushPromises();

      expect(mockUnregister).toHaveBeenCalled();

      watcher.dispose();
    });

    it('should call unregister callback on dispose()', async () => {
      const watcher = new PassiveDaemonWatcher('/workspace', mockLogger);
      watcher.start();

      await flushPromises();

      expect(mockUnregister).not.toHaveBeenCalled();

      watcher.dispose();

      expect(mockUnregister).toHaveBeenCalled();
    });

    it('should clear all listeners on dispose()', async () => {
      const watcher = new PassiveDaemonWatcher('/workspace', mockLogger);
      const listener = jest.fn();

      watcher.listen(listener);
      watcher.start();

      await flushPromises();

      watcher.dispose();

      const mockData = {
        projectGraph: { nodes: {}, dependencies: {} },
        sourceMaps: {},
      };

      capturedDaemonCallback?.(null, mockData);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Operational State Callback', () => {
    it('should call callback with operational when starting', async () => {
      const onStatusChange = jest.fn();
      const watcher = new PassiveDaemonWatcher(
        '/workspace',
        mockLogger,
        onStatusChange,
      );

      watcher.start();
      await flushPromises();

      expect(onStatusChange).toHaveBeenCalledWith('operational');

      watcher.dispose();
    });

    it('should call callback with operational when listening', async () => {
      const onStatusChange = jest.fn();
      const watcher = new PassiveDaemonWatcher(
        '/workspace',
        mockLogger,
        onStatusChange,
      );

      watcher.start();
      await flushPromises();

      expect(onStatusChange).toHaveBeenCalledWith('operational');

      watcher.dispose();
    });

    it('should call callback with notRunning when registration fails', async () => {
      const onStatusChange = jest.fn();
      (getNxDaemonClient as jest.Mock).mockRejectedValueOnce(
        new Error('Failed'),
      );

      const watcher = new PassiveDaemonWatcher(
        '/workspace',
        mockLogger,
        onStatusChange,
      );

      watcher.start();
      await flushPromises();

      expect(onStatusChange).toHaveBeenCalledWith('notRunning');

      watcher.dispose();
    });

    it('should call callback with notRunning when listener receives error', async () => {
      const onStatusChange = jest.fn();
      const watcher = new PassiveDaemonWatcher(
        '/workspace',
        mockLogger,
        onStatusChange,
      );

      watcher.start();
      await flushPromises();

      onStatusChange.mockClear();

      capturedDaemonCallback('closed');
      await flushPromises();

      expect(onStatusChange).toHaveBeenCalledWith('notRunning');

      watcher.dispose();
    });

    it('should call callback with notRunning after stop', async () => {
      const onStatusChange = jest.fn();
      const watcher = new PassiveDaemonWatcher(
        '/workspace',
        mockLogger,
        onStatusChange,
      );

      watcher.start();
      await flushPromises();

      onStatusChange.mockClear();

      watcher.stop();
      await flushPromises();

      expect(onStatusChange).toHaveBeenCalledWith('notRunning');

      watcher.dispose();
    });
  });

  describe('Reconnection Events', () => {
    it('should not trigger state change on reconnecting event', async () => {
      const onStatusChange = jest.fn();
      const watcher = new PassiveDaemonWatcher(
        '/workspace',
        mockLogger,
        onStatusChange,
      );

      watcher.start();
      await flushPromises();

      onStatusChange.mockClear();

      capturedDaemonCallback('reconnecting');
      await flushPromises();

      expect(onStatusChange).not.toHaveBeenCalled();
      expect(watcher.state).toBe('listening');

      watcher.dispose();
    });

    it('should not trigger state change on reconnected event', async () => {
      const onStatusChange = jest.fn();
      const watcher = new PassiveDaemonWatcher(
        '/workspace',
        mockLogger,
        onStatusChange,
      );

      watcher.start();
      await flushPromises();

      onStatusChange.mockClear();

      capturedDaemonCallback('reconnected');
      await flushPromises();

      expect(onStatusChange).not.toHaveBeenCalled();
      expect(watcher.state).toBe('listening');

      watcher.dispose();
    });
  });
});

async function flushPromises() {
  return new Promise((resolve) => setImmediate(resolve));
}
