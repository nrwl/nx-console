import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TaskRunnerComponent } from './task-runner.component';

describe('TaskRunnerComponent', () => {
  let component: TaskRunnerComponent;
  let fixture: ComponentFixture<TaskRunnerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [TaskRunnerComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TaskRunnerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
