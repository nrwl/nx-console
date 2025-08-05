import { createYargsConfig } from './yargs-config';

describe('createYargsConfig', () => {
  let consoleWarnSpy: jest.SpyInstance;
  let processExitSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('deprecated --sse option', () => {
    it('should warn when using deprecated --sse flag', () => {
      const argv = createYargsConfig(['--sse']).parseSync();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Warning: --sse option is deprecated. Please use --transport sse instead.',
      );
    });

    it('should set transport to sse when using deprecated --sse flag', () => {
      const argv = createYargsConfig(['--sse']).parseSync();

      expect(argv.transport).toBe('sse');
      expect(argv.sse).toBe(false);
    });

    it('should throw error when using --sse with --transport http', () => {
      expect(() => {
        createYargsConfig(['--sse', '--transport', 'http']).parseSync();
      }).toThrow('process.exit called');

      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should allow --sse with --transport sse', () => {
      const argv = createYargsConfig([
        '--sse',
        '--transport',
        'sse',
      ]).parseSync();

      expect(argv.transport).toBe('sse');
      expect(argv.sse).toBe(true);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Warning: --sse option is deprecated. Please use --transport sse instead.',
      );
    });
  });

  describe('conflicting options', () => {
    it('should throw error when using both --sse and --http', () => {
      expect(() => {
        createYargsConfig(['--sse', '--transport', 'http']).parseSync();
      }).toThrow('process.exit called');

      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should not throw error when using only --transport', () => {
      expect(() => {
        createYargsConfig(['--transport', 'http']).parseSync();
      }).not.toThrow();
    });
  });

  describe('port validation', () => {
    it('should throw error when using --port with stdio transport', () => {
      expect(() => {
        createYargsConfig(['--port', '9922']).parseSync();
      }).toThrow('process.exit called');

      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should throw error when using --port with explicit stdio transport', () => {
      expect(() => {
        createYargsConfig([
          '--transport',
          'stdio',
          '--port',
          '9922',
        ]).parseSync();
      }).toThrow('process.exit called');

      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should allow --port with sse transport', () => {
      expect(() => {
        createYargsConfig(['--transport', 'sse', '--port', '9922']).parseSync();
      }).not.toThrow();
    });

    it('should allow --port with http transport', () => {
      expect(() => {
        createYargsConfig([
          '--transport',
          'http',
          '--port',
          '9922',
        ]).parseSync();
      }).not.toThrow();
    });

    it('should allow --port with deprecated --sse flag', () => {
      expect(() => {
        createYargsConfig(['--sse', '--port', '9922']).parseSync();
      }).not.toThrow();
    });
  });

  describe('default values', () => {
    it('should default to stdio transport', () => {
      const argv = createYargsConfig([]).parseSync();

      expect(argv.transport).toBe('stdio');
    });

    it('should have default values for all options', () => {
      const argv = createYargsConfig([]).parseSync();

      expect(argv.transport).toBe('stdio');
      expect(argv.sse).toBe(false);
      expect(argv.disableTelemetry).toBe(false);
      expect(argv.keepAliveInterval).toBe(30000);
      expect(argv.port).toBeUndefined();
    });
  });

  describe('transport option', () => {
    it('should accept stdio transport', () => {
      const argv = createYargsConfig(['--transport', 'stdio']).parseSync();
      expect(argv.transport).toBe('stdio');
    });

    it('should accept sse transport', () => {
      const argv = createYargsConfig(['--transport', 'sse']).parseSync();
      expect(argv.transport).toBe('sse');
    });

    it('should accept http transport', () => {
      const argv = createYargsConfig(['--transport', 'http']).parseSync();
      expect(argv.transport).toBe('http');
    });

    it('should reject invalid transport values', () => {
      expect(() => {
        createYargsConfig(['--transport', 'invalid']).parseSync();
      }).toThrow();
    });
  });
});
