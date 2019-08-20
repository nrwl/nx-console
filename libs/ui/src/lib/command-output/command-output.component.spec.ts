import { CommandRunner, CommandStatus } from '@angular-console/utils';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { ApolloModule } from 'apollo-angular';

import { TerminalFactory } from '../terminal/terminal.factory';
import { UiModule } from '../ui.module';
import { CommandOutputComponent } from './command-output.component';
import { IS_ELECTRON } from '@angular-console/environment';

describe('CommandOutputComponent', () => {
  let component: CommandOutputComponent;
  let fixture: ComponentFixture<CommandOutputComponent>;
  let mockCommandRunner: { stopCommandViaCtrlC: jest.Mock<{}> };

  beforeEach(async(() => {
    window.matchMedia = jest.fn().mockImplementation(query => {
      return {
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn()
      };
    });
    mockCommandRunner = {
      stopCommandViaCtrlC: jest.fn()
    };
    TestBed.configureTestingModule({
      imports: [UiModule, ApolloModule],
      providers: [
        { provide: CommandRunner, useValue: mockCommandRunner },
        { provide: IS_ELECTRON, useValue: true },
        {
          provide: TerminalFactory,
          useValue: {
            new: () => ({
              _core: {},
              open: jest.fn(),
              write: jest.fn(),
              rows: NaN,
              cols: NaN,
              reset: jest.fn(),
              resize: jest.fn()
            })
          }
        }
      ]
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

  xit('should kill running commands via ctrl-c', () => {
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

    mockCommandRunner.stopCommandViaCtrlC.mockClear();
    component.commandResponse.status = CommandStatus.TERMINATED;
    document.dispatchEvent(
      new KeyboardEvent('keypress', { ctrlKey: true, key: 'c' })
    );
    expect(mockCommandRunner.stopCommandViaCtrlC).not.toHaveBeenCalled();
  });
});
