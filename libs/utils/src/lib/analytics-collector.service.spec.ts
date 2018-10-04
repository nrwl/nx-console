import { cleanUpUrl } from './analytics-collector.service';

describe('AnalyticsCollector', () => {
  it('should remove workspace path from the url', () => {
    expect(cleanUpUrl('/workspace/secret/aa/bb')).toEqual(
      '/workspace/PATH/aa/bb'
    );
    expect(cleanUpUrl('/workspace')).toEqual('/workspace');
    expect(cleanUpUrl('/open-workspace')).toEqual('/open-workspace');
    expect(cleanUpUrl('/workspaces')).toEqual('/workspaces');
  });
});
