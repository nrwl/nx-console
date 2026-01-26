import { parseNxCloudUrl } from './parse-nx-cloud-url';

describe('parseNxCloudUrl', () => {
  describe('CIPE URLs', () => {
    it('should parse a basic CIPE URL', () => {
      const result = parseNxCloudUrl('https://cloud.nx.app/cipes/abc123');
      expect(result).toEqual({
        cipeId: 'abc123',
      });
    });

    it('should parse CIPE URL with trailing slash', () => {
      const result = parseNxCloudUrl('https://cloud.nx.app/cipes/abc123/');
      expect(result).toEqual({
        cipeId: 'abc123',
      });
    });

    it('should parse CIPE URL with query params', () => {
      const result = parseNxCloudUrl(
        'https://cloud.nx.app/cipes/abc123?foo=bar&baz=qux',
      );
      expect(result).toEqual({
        cipeId: 'abc123',
      });
    });

    it('should parse CIPE URL from snapshot domain', () => {
      const result = parseNxCloudUrl('https://snapshot.nx.app/cipes/def456');
      expect(result).toEqual({
        cipeId: 'def456',
      });
    });

    it('should parse CIPE URL from custom domain', () => {
      const result = parseNxCloudUrl(
        'https://my-company.nx.app/cipes/custom-id',
      );
      expect(result).toEqual({
        cipeId: 'custom-id',
      });
    });

    it('should parse CIPE URL with additional path segments', () => {
      const result = parseNxCloudUrl(
        'https://staging.nx.app/cipes/6971fd9a2481515cb75c0d56/self-healing?runGroup=21245198689-1-linux&utm_source=pull-request',
      );
      expect(result).toEqual({
        cipeId: '6971fd9a2481515cb75c0d56',
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

    it('should return null for run URLs', () => {
      expect(parseNxCloudUrl('https://cloud.nx.app/runs/xyz789')).toBeNull();
    });

    it('should return null for task URLs', () => {
      expect(
        parseNxCloudUrl('https://cloud.nx.app/runs/abc/task/project:build'),
      ).toBeNull();
    });
  });
});
