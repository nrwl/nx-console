import { parseNxCloudUrl } from './parse-nx-cloud-url';

describe('parseNxCloudUrl', () => {
  describe('CIPE URLs', () => {
    it('should parse a basic CIPE URL', () => {
      const result = parseNxCloudUrl('https://cloud.nx.app/cipes/abc123');
      expect(result).toEqual({
        type: 'cipe',
        cipeId: 'abc123',
      });
    });

    it('should parse CIPE URL with trailing slash', () => {
      const result = parseNxCloudUrl('https://cloud.nx.app/cipes/abc123/');
      expect(result).toEqual({
        type: 'cipe',
        cipeId: 'abc123',
      });
    });

    it('should parse CIPE URL with query params', () => {
      const result = parseNxCloudUrl(
        'https://cloud.nx.app/cipes/abc123?foo=bar&baz=qux',
      );
      expect(result).toEqual({
        type: 'cipe',
        cipeId: 'abc123',
      });
    });

    it('should parse CIPE URL from snapshot domain', () => {
      const result = parseNxCloudUrl('https://snapshot.nx.app/cipes/def456');
      expect(result).toEqual({
        type: 'cipe',
        cipeId: 'def456',
      });
    });

    it('should parse CIPE URL from custom domain', () => {
      const result = parseNxCloudUrl(
        'https://my-company.nx.app/cipes/custom-id',
      );
      expect(result).toEqual({
        type: 'cipe',
        cipeId: 'custom-id',
      });
    });

    it('should parse CIPE URL with additional path segments', () => {
      const result = parseNxCloudUrl(
        'https://staging.nx.app/cipes/6971fd9a2481515cb75c0d56/self-healing?runGroup=21245198689-1-linux&utm_source=pull-request',
      );
      expect(result).toEqual({
        type: 'cipe',
        cipeId: '6971fd9a2481515cb75c0d56',
      });
    });
  });

  describe('Run URLs', () => {
    it('should parse a basic run URL', () => {
      const result = parseNxCloudUrl('https://cloud.nx.app/runs/xyz789');
      expect(result).toEqual({
        type: 'run',
        runId: 'xyz789',
      });
    });

    it('should parse run URL with trailing slash', () => {
      const result = parseNxCloudUrl('https://cloud.nx.app/runs/xyz789/');
      expect(result).toEqual({
        type: 'run',
        runId: 'xyz789',
      });
    });

    it('should parse run URL with query params', () => {
      const result = parseNxCloudUrl(
        'https://cloud.nx.app/runs/xyz789?utm_source=pr',
      );
      expect(result).toEqual({
        type: 'run',
        runId: 'xyz789',
      });
    });

    it('should parse run URL from custom domain', () => {
      const result = parseNxCloudUrl(
        'https://my-company.nx.app/runs/my-run-id',
      );
      expect(result).toEqual({
        type: 'run',
        runId: 'my-run-id',
      });
    });
  });

  describe('Task URLs', () => {
    it('should parse a task URL', () => {
      const result = parseNxCloudUrl(
        'https://cloud.nx.app/runs/abc/task/project:build',
      );
      expect(result).toEqual({
        type: 'task',
        runId: 'abc',
        taskId: 'project:build',
      });
    });

    it('should parse task URL with trailing slash', () => {
      const result = parseNxCloudUrl(
        'https://cloud.nx.app/runs/abc/task/project:build/',
      );
      expect(result).toEqual({
        type: 'task',
        runId: 'abc',
        taskId: 'project:build',
      });
    });

    it('should parse task URL with encoded taskId', () => {
      const result = parseNxCloudUrl(
        'https://cloud.nx.app/runs/abc/task/my-project%3Abuild',
      );
      expect(result).toEqual({
        type: 'task',
        runId: 'abc',
        taskId: 'my-project:build',
      });
    });

    it('should parse task URL with query params', () => {
      const result = parseNxCloudUrl(
        'https://cloud.nx.app/runs/abc/task/project:test?foo=bar',
      );
      expect(result).toEqual({
        type: 'task',
        runId: 'abc',
        taskId: 'project:test',
      });
    });
  });

  describe('Invalid URLs', () => {
    it('should return null for non-URL strings', () => {
      expect(parseNxCloudUrl('not-a-url')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(parseNxCloudUrl('')).toBeNull();
    });

    it('should return null for URL without matching pattern', () => {
      expect(parseNxCloudUrl('https://cloud.nx.app/')).toBeNull();
    });

    it('should return null for URL with unknown path', () => {
      expect(parseNxCloudUrl('https://cloud.nx.app/unknown/abc')).toBeNull();
    });

    it('should return null for partial CIPE path', () => {
      expect(parseNxCloudUrl('https://cloud.nx.app/cipes')).toBeNull();
    });
  });
});
