import { OptionType } from '@angular/cli/models/interface';
import { NgZone } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TaskExecutionFormComponent } from './task-execution-form.component';

describe('TaskExecutionFormComponent', () => {
  let component: TaskExecutionFormComponent;
  let fixture: ComponentFixture<TaskExecutionFormComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [TaskExecutionFormComponent],
      providers: [
        {
          provide: NgZone,
          useValue: {
            run(fn: Function): any {
              return fn();
            }
          }
        }
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TaskExecutionFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set validator for valid options', () => {
    const formGroup = component.buildForm({
      name: 'long-form-x-prompt-without-enum',
      command: 'generate',
      positional: 'workspace-generator:long-form-x-prompt-without-enum',
      cliName: 'ng',
      description: 'LongFormXPrompt',
      options: [
        {
          name: 'anOption',
          type: OptionType.String,
          aliases: [],
          description: 'a long form select option',
          items: {
            type: OptionType.String,
            enum: ['css', 'scss', 'styl', 'less']
          }
        }
      ]
    });
    expect(
      formGroup.controls['long-form-x-prompt-without-enum'].validator
    ).not.toBeUndefined();
    // TODO: get tests working on this vscode-ui-component target and finish testing this
  });
});
