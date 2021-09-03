import { FormatTaskPipe } from './format-task.pipe';

describe('FormatTaskPipe', () => {
  const pipe = new FormatTaskPipe();

  it('should reformat workspace generator commands', () => {
    expect(
      pipe.transform({
        name: '',
        cliName: 'ng',
        description: '',
        options: [],
        command: 'generate',
        positional: 'workspace-schematic:xyz-name',
      })
    ).toEqual('nx workspace-schematic xyz-name');
    expect(
      pipe.transform({
        name: '',
        cliName: 'ng',
        description: '',
        options: [],
        command: 'generate',
        positional: 'workspace-generator:xyz-name',
      })
    ).toEqual('nx workspace-generator xyz-name');
    expect(
      pipe.transform({
        name: '',
        cliName: 'ng',
        description: '',
        options: [],
        command: 'generate',
        positional: '@nrwl/angular:library',
      })
    ).toEqual('ng generate @nrwl/angular:library');
  });

  it('should optionally include configuration flag', () => {
    expect(
      pipe.transform({
        name: '',
        cliName: 'nx',
        description: '',
        options: [],
        command: 'build',
        positional: 'the-project',
      }, 'production')
    ).toEqual('nx build the-project --prod');
  })
});
