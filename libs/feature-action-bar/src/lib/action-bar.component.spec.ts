import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import {
  CommandStatus,
  CommandRunner,
  CommandResponse
} from '@angular-console/utils';
import { ActionBarComponent } from './action-bar.component';
import { FeatureActionBarModule } from './feature-action-bar.module';
import { BehaviorSubject, Subject } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('ActionBarComponent', () => {
  let component: ActionBarComponent;
  let fixture: ComponentFixture<ActionBarComponent>;
  let mockCommandRunner: jasmine.SpyObj<CommandRunner>;
  let mockCommands: Subject<CommandResponse[]>;

  beforeEach(async(() => {
    mockCommands = new Subject<CommandResponse[]>();
    mockCommandRunner = jasmine.createSpyObj<CommandRunner>('CommandRunner', [
      'stopCommandViaCtrlC',
      'listAllCommands'
    ]);
    mockCommandRunner.listAllCommands.and.returnValue(mockCommands);
    TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, FeatureActionBarModule],
      providers: [{ provide: CommandRunner, useValue: mockCommandRunner }]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ActionBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ctrl-c', () => {
    it('should not kill multiple commands', () => {
      const commandResponse: CommandResponse = {
        id: 'commandId',
        out: '',
        outChunk: '',
        detailedStatus: {},
        status: CommandStatus.IN_PROGRESS,
        command: ''
      };
      mockCommands.next([commandResponse, commandResponse]);

      // Dont call if multiple events
      document.dispatchEvent(
        new KeyboardEvent('keypress', { ctrlKey: true, key: 'c' })
      );
      expect(mockCommandRunner.stopCommandViaCtrlC).not.toHaveBeenCalled();
    });

    it('should not kill an opened command', () => {
      const commandResponse: CommandResponse = {
        id: 'commandId',
        out: '',
        outChunk: '',
        detailedStatus: {},
        status: CommandStatus.IN_PROGRESS,
        command: ''
      };
      mockCommands.next([commandResponse]);

      component.actionsExpanded.next(true);
      mockCommands.next([commandResponse]);
      document.dispatchEvent(
        new KeyboardEvent('keypress', { ctrlKey: true, key: 'c' })
      );
      expect(mockCommandRunner.stopCommandViaCtrlC).not.toHaveBeenCalled();
    });

    it('should kill a single command', () => {
      const commandResponse: CommandResponse = {
        id: 'commandId',
        out: '',
        outChunk: '',
        detailedStatus: {},
        status: CommandStatus.IN_PROGRESS,
        command: ''
      };
      mockCommands.next([commandResponse]);

      document.dispatchEvent(
        new KeyboardEvent('keypress', { ctrlKey: true, key: 'c' })
      );
      expect(mockCommandRunner.stopCommandViaCtrlC).toHaveBeenCalledWith(
        commandResponse.id
      );
    });

    it('should only kill running events', () => {
      const commandResponse: CommandResponse = {
        id: 'commandId',
        out: '',
        outChunk: '',
        detailedStatus: {},
        status: CommandStatus.TERMINATED,
        command: ''
      };
      mockCommands.next([commandResponse]);
      document.dispatchEvent(
        new KeyboardEvent('keypress', { ctrlKey: true, key: 'c' })
      );
      expect(mockCommandRunner.stopCommandViaCtrlC).not.toHaveBeenCalled();
    });
  });
});
