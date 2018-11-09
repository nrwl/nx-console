import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { CommandOutputComponent } from './command-output.component';
import { UiModule } from '../ui.module';
import { CommandStatus, CommandRunner } from '@angular-console/utils';

describe('CommandOutputComponent', () => {
  let component: CommandOutputComponent;
  let fixture: ComponentFixture<CommandOutputComponent>;
  let mockCommandRunner: jasmine.SpyObj<CommandRunner>;

  beforeEach(async(() => {
    mockCommandRunner = jasmine.createSpyObj<CommandRunner>('CommandRunner', [
      'stopCommandViaCtrlC'
    ]);
    TestBed.configureTestingModule({
      imports: [UiModule],
      providers: [{ provide: CommandRunner, useValue: mockCommandRunner }]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CommandOutputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should kill running commands via ctrl-c', () => {
    component.commandResponse = {
      id: 'commandId',
      out: '',
      outChunk: '',
      detailedStatus: {},
      status: CommandStatus.IN_PROGRESS,
      command: ''
    };

    document.dispatchEvent(
      new KeyboardEvent('keypress', { ctrlKey: true, key: 'c' })
    );

    expect(mockCommandRunner.stopCommandViaCtrlC).toHaveBeenCalledWith(
      component.commandResponse.id
    );

    mockCommandRunner.stopCommandViaCtrlC.calls.reset();
    component.commandResponse.status = CommandStatus.TERMINATED;
    document.dispatchEvent(
      new KeyboardEvent('keypress', { ctrlKey: true, key: 'c' })
    );
    expect(mockCommandRunner.stopCommandViaCtrlC).not.toHaveBeenCalled();
  });
});
