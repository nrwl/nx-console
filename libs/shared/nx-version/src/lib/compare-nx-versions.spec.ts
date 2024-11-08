import { gte } from './compare-nx-versions';
import { NxVersion } from './nx-version';

describe('gte', () => {
  it('should return true if string version a is greater than string version b', () => {
    expect(gte('2.0.0', '1.0.0')).toBe(true);
  });

  it('should return false if string version a is less than string version b', () => {
    expect(gte('1.0.0', '2.0.0')).toBe(false);
  });

  it('should return true if string version a is equal to string version b', () => {
    expect(gte('1.0.0', '1.0.0')).toBe(true);
  });

  it('should return true if NxVersion a is greater than string version b', () => {
    const a: NxVersion = { full: '2.0.0', major: 2, minor: 0 };
    expect(gte(a, '1.0.0')).toBe(true);
  });

  it('should return false if NxVersion a is less than string version b', () => {
    const a: NxVersion = { full: '1.0.0', major: 1, minor: 0 };
    expect(gte(a, '2.0.0')).toBe(false);
  });

  it('should return true if NxVersion a is equal to string version b', () => {
    const a: NxVersion = { full: '1.0.0', major: 1, minor: 0 };
    expect(gte(a, '1.0.0')).toBe(true);
  });

  it('should return true if string version a is greater than NxVersion b', () => {
    const b: NxVersion = { full: '1.0.0', major: 1, minor: 0 };
    expect(gte('2.0.0', b)).toBe(true);
  });

  it('should return false if string version a is less than NxVersion b', () => {
    const b: NxVersion = { full: '2.0.0', major: 2, minor: 0 };
    expect(gte('1.0.0', b)).toBe(false);
  });

  it('should return true if string version a is equal to NxVersion b', () => {
    const b: NxVersion = { full: '1.0.0', major: 1, minor: 0 };
    expect(gte('1.0.0', b)).toBe(true);
  });

  it('should return true if string version a starts with 0.0.0-pr-', () => {
    expect(gte('0.0.0-pr-123', '1.0.0')).toBe(true);
  });

  it('should return false if string version b starts with 0.0.0-pr-', () => {
    expect(gte('1.0.0', '0.0.0-pr-123')).toBe(false);
  });
});
