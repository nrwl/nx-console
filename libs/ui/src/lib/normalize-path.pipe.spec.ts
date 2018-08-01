import { NormalizePathPipe } from './normalize-path.pipe';

describe('NormalizePathPipe', () => {
  const pipe = new NormalizePathPipe();

  it('should do nothing to an empty path', () => {
    expect(pipe.transform('')).toEqual('');
  });

  it('should do nothing when given a Unix-style path', () => {
    expect(pipe.transform('/')).toEqual('/');
    expect(pipe.transform('/one/two')).toEqual('/one/two');
    expect(pipe.transform('./one/two')).toEqual('./one/two');
    expect(pipe.transform('./one/two:blah')).toEqual('./one/two:blah');
  });

  it('should flip slashes when given a Window-style path', () => {
    expect(pipe.transform('C:')).toEqual('C:');
    expect(pipe.transform('C://')).toEqual('C:');
    expect(pipe.transform('C://one/two')).toEqual('C:\\one\\two');
  });
});
