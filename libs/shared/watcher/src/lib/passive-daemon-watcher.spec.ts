import { PassiveDaemonWatcher } from './passive-daemon-watcher';
import type * as nxWorkspaceInfo from '@nx-console/shared-nx-workspace-info';

jest.mock('@nx-console/shared-nx-workspace-info');

const { getNxDaemonClient } =
  require('@nx-console/shared-nx-workspace-info') as typeof nxWorkspaceInfo;

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

  describe('Retry on Registration Failure', () => {
    it('should retry registration if getNxDaemonClient fails', async () => {
      (getNxDaemonClient as jest.Mock)
        .mockRejectedValueOnce(new Error('Failed'))
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ daemonClient: mockDaemonClient });

      const watcher = new PassiveDaemonWatcher('/workspace', mockLogger);
      const listener = jest.fn();

      watcher.listen(listener);
      watcher.start();

      await flushPromises();

      expect(getNxDaemonClient).toHaveBeenCalledTimes(1);

      await new Promise((resolve) => setTimeout(resolve, 2500));

      expect(getNxDaemonClient).toHaveBeenCalledTimes(2);

      await new Promise((resolve) => setTimeout(resolve, 5500));

      expect(getNxDaemonClient).toHaveBeenCalledTimes(3);

      const mockData = {
        projectGraph: { nodes: {}, dependencies: {} },
        sourceMaps: {},
      };
      capturedDaemonCallback(null, mockData);

      expect(listener).toHaveBeenCalledWith(null, mockData);

      watcher.dispose();
    }, 15000);

    it('should retry registration if daemon.enabled() returns false', async () => {
      mockDaemonClient.enabled
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      const watcher = new PassiveDaemonWatcher('/workspace', mockLogger);
      watcher.start();

      await flushPromises();

      expect(
        mockDaemonClient.registerProjectGraphRecomputationListener,
      ).toHaveBeenCalledTimes(0);

      await new Promise((resolve) => setTimeout(resolve, 2500));

      expect(
        mockDaemonClient.registerProjectGraphRecomputationListener,
      ).toHaveBeenCalledTimes(1);

      watcher.dispose();
    }, 10000);

    it('should retry registration if registerProjectGraphRecomputationListener throws', async () => {
      mockDaemonClient.registerProjectGraphRecomputationListener
        .mockImplementationOnce(() => {
          throw new Error('Registration failed');
        })
        .mockImplementationOnce((callback: any) => {
          capturedDaemonCallback = callback;
          return mockUnregister;
        });

      const watcher = new PassiveDaemonWatcher('/workspace', mockLogger);
      watcher.start();

      await flushPromises();

      expect(
        mockDaemonClient.registerProjectGraphRecomputationListener,
      ).toHaveBeenCalledTimes(1);

      await new Promise((resolve) => setTimeout(resolve, 2500));

      expect(
        mockDaemonClient.registerProjectGraphRecomputationListener,
      ).toHaveBeenCalledTimes(2);

      watcher.dispose();
    }, 10000);
  });

  describe('Retry on Listener Error', () => {
    it('should retry when daemon listener callback receives an error', async () => {
      const watcher = new PassiveDaemonWatcher('/workspace', mockLogger);
      watcher.start();

      await flushPromises();

      expect(
        mockDaemonClient.registerProjectGraphRecomputationListener,
      ).toHaveBeenCalledTimes(1);

      capturedDaemonCallback(new Error('Daemon error'));

      await new Promise((resolve) => setTimeout(resolve, 2500));

      expect(
        mockDaemonClient.registerProjectGraphRecomputationListener,
      ).toHaveBeenCalledTimes(2);

      watcher.dispose();
    }, 10000);

    it('should retry when daemon listener callback receives "closed"', async () => {
      const watcher = new PassiveDaemonWatcher('/workspace', mockLogger);
      watcher.start();

      await flushPromises();

      expect(
        mockDaemonClient.registerProjectGraphRecomputationListener,
      ).toHaveBeenCalledTimes(1);

      capturedDaemonCallback('closed');

      await new Promise((resolve) => setTimeout(resolve, 2500));

      expect(
        mockDaemonClient.registerProjectGraphRecomputationListener,
      ).toHaveBeenCalledTimes(2);

      watcher.dispose();
    }, 10000);

    it('should notify listeners of error before retrying', async () => {
      const watcher = new PassiveDaemonWatcher('/workspace', mockLogger);
      const listener = jest.fn();

      watcher.listen(listener);
      watcher.start();

      await flushPromises();

      const error = new Error('Daemon error');
      capturedDaemonCallback(error);

      expect(listener).toHaveBeenCalledWith(error);

      await new Promise((resolve) => setTimeout(resolve, 2500));

      expect(
        mockDaemonClient.registerProjectGraphRecomputationListener,
      ).toHaveBeenCalledTimes(2);

      watcher.dispose();
    }, 10000);
  });

  describe('Exponential Backoff', () => {
    it('should use exponential backoff for retries (2s, 5s, 10s, 20s)', async () => {
      (getNxDaemonClient as jest.Mock).mockRejectedValue(
        new Error('Always fails'),
      );

      const watcher = new PassiveDaemonWatcher('/workspace', mockLogger);
      watcher.start();

      await flushPromises();
      expect(getNxDaemonClient).toHaveBeenCalledTimes(1);

      await new Promise((resolve) => setTimeout(resolve, 2500));
      expect(getNxDaemonClient).toHaveBeenCalledTimes(2);

      await new Promise((resolve) => setTimeout(resolve, 5500));
      expect(getNxDaemonClient).toHaveBeenCalledTimes(3);

      await new Promise((resolve) => setTimeout(resolve, 10500));
      expect(getNxDaemonClient).toHaveBeenCalledTimes(4);

      await new Promise((resolve) => setTimeout(resolve, 20500));
      expect(getNxDaemonClient).toHaveBeenCalledTimes(5);

      watcher.dispose();
    }, 50000);

    it('should stop retrying after 4 failed attempts', async () => {
      (getNxDaemonClient as jest.Mock).mockRejectedValue(
        new Error('Always fails'),
      );

      const watcher = new PassiveDaemonWatcher('/workspace', mockLogger);
      watcher.start();

      await flushPromises();

      await new Promise((resolve) => setTimeout(resolve, 40000));

      expect(getNxDaemonClient).toHaveBeenCalledTimes(5);

      await new Promise((resolve) => setTimeout(resolve, 5000));

      expect(getNxDaemonClient).toHaveBeenCalledTimes(5);

      watcher.dispose();
    }, 50000);
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
    it('should call callback with true when starting', async () => {
      const onOperationalStateChange = jest.fn();
      const watcher = new PassiveDaemonWatcher(
        '/workspace',
        mockLogger,
        onOperationalStateChange,
      );

      watcher.start();
      await flushPromises();

      expect(onOperationalStateChange).toHaveBeenCalledWith(true);

      watcher.dispose();
    });

    it('should call callback with true when listening', async () => {
      const onOperationalStateChange = jest.fn();
      const watcher = new PassiveDaemonWatcher(
        '/workspace',
        mockLogger,
        onOperationalStateChange,
      );

      watcher.start();
      await flushPromises();

      expect(onOperationalStateChange).toHaveBeenCalledWith(true);

      watcher.dispose();
    });

    it('should call callback with true when failed but can retry', async () => {
      const onOperationalStateChange = jest.fn();
      (getNxDaemonClient as jest.Mock).mockRejectedValueOnce(
        new Error('Failed once'),
      );

      const watcher = new PassiveDaemonWatcher(
        '/workspace',
        mockLogger,
        onOperationalStateChange,
      );

      watcher.start();
      await flushPromises();

      const trueCalls = onOperationalStateChange.mock.calls.filter(
        (call) => call[0] === true,
      );
      expect(trueCalls.length).toBeGreaterThan(0);

      watcher.dispose();
    });

    it('should call callback with false when permanently failed', async () => {
      const onOperationalStateChange = jest.fn();
      (getNxDaemonClient as jest.Mock).mockRejectedValue(
        new Error('Always fails'),
      );

      const watcher = new PassiveDaemonWatcher(
        '/workspace',
        mockLogger,
        onOperationalStateChange,
      );

      watcher.start();
      await flushPromises();

      await new Promise((resolve) => setTimeout(resolve, 45000));
      await flushPromises();

      const falseCalls = onOperationalStateChange.mock.calls.filter(
        (call) => call[0] === false,
      );
      expect(falseCalls.length).toBeGreaterThan(0);

      watcher.dispose();
    }, 50000);

    it('should call callback with true after stop', async () => {
      const onOperationalStateChange = jest.fn();
      const watcher = new PassiveDaemonWatcher(
        '/workspace',
        mockLogger,
        onOperationalStateChange,
      );

      watcher.start();
      await flushPromises();

      onOperationalStateChange.mockClear();

      watcher.stop();
      await flushPromises();

      expect(onOperationalStateChange).toHaveBeenCalledWith(true);

      watcher.dispose();
    });
  });
});

async function flushPromises() {
  return new Promise((resolve) => setImmediate(resolve));
}
