import { FormatFileSizePipe } from './format-file-size.pipe';

describe('FormatFileSizePipe', () => {
  let pipe: FormatFileSizePipe;

  beforeEach(() => {
    pipe = new FormatFileSizePipe();
  });

  it('handles Infinity', () => {
    expect(pipe.transform(Infinity)).toEqual('Infinity');
  });

  it('handles numbers', () => {
    expect(pipe.transform(0)).toEqual('0.0B');
    expect(pipe.transform(1234)).toEqual('1.2kB');
    expect(pipe.transform(1234567)).toEqual('1.2MB');
    // Your application REALLY should not be serving up assets this big.
    expect(pipe.transform(1000000000)).toEqual('1000.0MB');
  });

  it('handles strings', () => {
    expect(pipe.transform('0')).toEqual('0.0B');
    expect(pipe.transform('1234')).toEqual('1.2kB');
    expect(pipe.transform('1234567')).toEqual('1.2MB');
  });
});
