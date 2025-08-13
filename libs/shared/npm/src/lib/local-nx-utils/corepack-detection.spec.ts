import { vol } from 'memfs';
import { 
  detectCorepackPackageManager, 
  shouldUseCorepack, 
  extractPackageManagerName 
} from './corepack-detection';

jest.mock('fs');

describe('corepack-detection', () => {
  beforeEach(() => {
    vol.reset();
  });

  describe('detectCorepackPackageManager', () => {
    it('should detect yarn package manager from packageManager field', async () => {
      vol.fromJSON({
        '/workspace/package.json': JSON.stringify({
          name: 'test-project',
          packageManager: 'yarn@4.7.0',
        }),
      });

      const result = await detectCorepackPackageManager('/workspace');
      expect(result).toBe('yarn@4.7.0');
    });

    it('should detect pnpm package manager from packageManager field', async () => {
      vol.fromJSON({
        '/workspace/package.json': JSON.stringify({
          name: 'test-project',
          packageManager: 'pnpm@8.6.0',
        }),
      });

      const result = await detectCorepackPackageManager('/workspace');
      expect(result).toBe('pnpm@8.6.0');
    });

    it('should detect npm package manager from packageManager field', async () => {
      vol.fromJSON({
        '/workspace/package.json': JSON.stringify({
          name: 'test-project',
          packageManager: 'npm@10.2.0',
        }),
      });

      const result = await detectCorepackPackageManager('/workspace');
      expect(result).toBe('npm@10.2.0');
    });

    it('should return undefined when packageManager field is not present', async () => {
      vol.fromJSON({
        '/workspace/package.json': JSON.stringify({
          name: 'test-project',
        }),
      });

      const result = await detectCorepackPackageManager('/workspace');
      expect(result).toBeUndefined();
    });

    it('should return undefined when package.json does not exist', async () => {
      const result = await detectCorepackPackageManager('/workspace');
      expect(result).toBeUndefined();
    });

    it('should handle malformed package.json', async () => {
      vol.fromJSON({
        '/workspace/package.json': 'not valid json',
      });

      const result = await detectCorepackPackageManager('/workspace');
      expect(result).toBeUndefined();
    });
  });

  describe('shouldUseCorepack', () => {
    it('should return true when packageManager field is present', async () => {
      vol.fromJSON({
        '/workspace/package.json': JSON.stringify({
          name: 'test-project',
          packageManager: 'yarn@4.7.0',
        }),
      });

      const result = await shouldUseCorepack('/workspace');
      expect(result).toBe(true);
    });

    it('should return false when packageManager field is not present', async () => {
      vol.fromJSON({
        '/workspace/package.json': JSON.stringify({
          name: 'test-project',
        }),
      });

      const result = await shouldUseCorepack('/workspace');
      expect(result).toBe(false);
    });
  });

  describe('extractPackageManagerName', () => {
    it('should extract yarn from yarn@4.7.0', () => {
      const result = extractPackageManagerName('yarn@4.7.0');
      expect(result).toBe('yarn');
    });

    it('should extract pnpm from pnpm@8.6.0', () => {
      const result = extractPackageManagerName('pnpm@8.6.0');
      expect(result).toBe('pnpm');
    });

    it('should extract npm from npm@10.2.0', () => {
      const result = extractPackageManagerName('npm@10.2.0');
      expect(result).toBe('npm');
    });

    it('should handle package manager string without version', () => {
      const result = extractPackageManagerName('yarn');
      expect(result).toBe('yarn');
    });

    it('should handle empty string', () => {
      const result = extractPackageManagerName('');
      expect(result).toBe('');
    });
  });
});