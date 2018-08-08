import { cleanUpUrl } from './analytics-collector.service';

describe('AnalyticsCollector', () => {
  it('should remove workspace path from the url', () => {
    expect(cleanUpUrl('/workspace/secret/aa/bb')).toEqual(
      '/workspace/PATH/aa/bb'
    );
    expect(cleanUpUrl('/workspace')).toEqual('/workspace');
    expect(cleanUpUrl('/import-workspace')).toEqual('/import-workspace');
    expect(cleanUpUrl('/workspaces')).toEqual('/workspaces');
  });
});
