import { CommandResponse, CommandRunner } from '@angular-console/utils';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Subject } from 'rxjs';

import { ActionBarComponent } from './action-bar.component';
import { FeatureActionBarModule } from './feature-action-bar.module';

describe('ActionBarComponent', () => {
  let component: ActionBarComponent;
  let fixture: ComponentFixture<ActionBarComponent>;
  let mockCommandRunner: {
    listAllCommands: jest.Mock<{}>;
    stopCommandViaCtrlC: jest.Mock<{}>;
  };
  let mockCommands: Subject<CommandResponse[]>;

  beforeEach(async(() => {
    mockCommands = new Subject<CommandResponse[]>();
    mockCommandRunner = {
      listAllCommands: jest.fn(),
      stopCommandViaCtrlC: jest.fn()
    };
    mockCommandRunner.listAllCommands.mockReturnValue(mockCommands);
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
});
