jest.mock('child_process', () => ({ execSync: jest.fn() }));
jest.mock('./is-nx-cloud-used', () => ({
  isNxCloudUsed: jest.fn().mockResolvedValue(true),
}));
jest.mock('./cloud-ids', () => ({
  getNxCloudUrl: jest.fn().mockResolvedValue('https://cloud.nx.app'),
}));
jest.mock('./nx-cloud-auth-headers', () => ({
  nxCloudAuthHeaders: jest.fn().mockResolvedValue({}),
}));
jest.mock('./nx-cloud-request', () => ({ nxCloudRequest: jest.fn() }));

import { execSync } from 'child_process';
import { getRecentCIPEData } from './get-recent-cipe-data';
import { nxCloudRequest } from './nx-cloud-request';

const mockedExecSync = jest.mocked(execSync);
const mockedNxCloudRequest = jest.mocked(nxCloudRequest);

describe('getRecentCIPEData', () => {
  const logger = { log: jest.fn(), debug: jest.fn() };

  beforeEach(() => {
    mockedExecSync.mockImplementation((command) => {
      if (command === 'git config user.email') {
        return Buffer.from('me@example.com');
      }
      if (String(command).startsWith('git for-each-ref')) {
        return Buffer.from(
          `refs/heads/recent-branch - ${new Date().toISOString()} - <me@example.com>\n`,
        );
      }
      throw new Error('no upstream HEAD');
    });
    mockedNxCloudRequest.mockReset();
    mockedNxCloudRequest.mockResolvedValue({
      responseText: JSON.stringify({ ciPipelineExecutions: [] }),
    } as any);
  });

  function requestedBranches(): string[] {
    return JSON.parse(mockedNxCloudRequest.mock.calls[0][1].data as string)
      .branches;
  }

  it('requests recently committed branches along with the explicit branch', async () => {
    await getRecentCIPEData('/workspace', logger, { branch: '123' });

    expect(requestedBranches()).toEqual(['recent-branch', '123']);
  });

  it('requests only the explicit branch when recent branches are excluded', async () => {
    await getRecentCIPEData('/workspace', logger, {
      branch: '123',
      includeRecentBranches: false,
    });

    expect(requestedBranches()).toEqual(['123']);
  });
});
