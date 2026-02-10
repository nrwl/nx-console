import { configToArgs, loadConfigFile } from './load-config-file';
import * as fs from 'fs';

jest.mock('fs');

const mockedReadFileSync = fs.readFileSync as jest.MockedFunction<
  typeof fs.readFileSync
>;

describe('loadConfigFile', () => {
  afterEach(() => {
    mockedReadFileSync.mockReset();
  });

  it('should return empty object when no config file exists', () => {
    mockedReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    expect(loadConfigFile('/workspace')).toEqual({});
  });

  it('should return empty object for malformed JSON', () => {
    mockedReadFileSync.mockReturnValue('not json {{{');
    expect(loadConfigFile('/workspace')).toEqual({});
  });

  it('should return empty object for non-object JSON', () => {
    mockedReadFileSync.mockReturnValue('"just a string"');
    expect(loadConfigFile('/workspace')).toEqual({});

    mockedReadFileSync.mockReturnValue('[1, 2, 3]');
    expect(loadConfigFile('/workspace')).toEqual({});
  });

  it('should parse supported keys', () => {
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({
        minimal: true,
        debugLogs: false,
        transport: 'sse',
        port: 9922,
        tools: ['nx_docs', '!cloud_*'],
        disableTelemetry: true,
        experimentalPolygraph: true,
      }),
    );

    expect(loadConfigFile('/workspace')).toEqual({
      minimal: true,
      debugLogs: false,
      transport: 'sse',
      port: 9922,
      tools: ['nx_docs', '!cloud_*'],
      disableTelemetry: true,
      experimentalPolygraph: true,
    });
  });

  it('should ignore unknown keys', () => {
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({
        minimal: true,
        unknownOption: 'value',
        workspacePath: '/some/path',
      }),
    );
    expect(loadConfigFile('/workspace')).toEqual({ minimal: true });
  });

  it('should read from correct path', () => {
    mockedReadFileSync.mockReturnValue('{}');
    loadConfigFile('/my/workspace');
    expect(mockedReadFileSync).toHaveBeenCalledWith(
      expect.stringContaining('/my/workspace/.nx/nx-mcp-config.json'),
      'utf-8',
    );
  });
});

describe('configToArgs', () => {
  it('should return empty array for empty config', () => {
    expect(configToArgs({})).toEqual([]);
  });

  it('should convert boolean true to --flag', () => {
    expect(configToArgs({ minimal: true })).toEqual(['--minimal']);
  });

  it('should convert boolean false to --no-flag', () => {
    expect(configToArgs({ debugLogs: false })).toEqual(['--no-debugLogs']);
  });

  it('should convert string values', () => {
    expect(configToArgs({ transport: 'sse' })).toEqual(['--transport', 'sse']);
  });

  it('should convert number values', () => {
    expect(configToArgs({ port: 9922 })).toEqual(['--port', '9922']);
  });

  it('should convert array values to repeated flags', () => {
    expect(configToArgs({ tools: ['nx_docs', '!cloud_*'] })).toEqual([
      '--tools',
      'nx_docs',
      '--tools',
      '!cloud_*',
    ]);
  });
});
