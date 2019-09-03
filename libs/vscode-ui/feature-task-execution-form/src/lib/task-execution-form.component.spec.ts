import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TaskExecutionFormComponent } from './task-execution-form.component';

describe('TaskExecutionFormComponent', () => {
  let component: TaskExecutionFormComponent;
  let fixture: ComponentFixture<TaskExecutionFormComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [TaskExecutionFormComponent]
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
});
