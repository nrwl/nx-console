import { TestBed, async } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { VscodeUiFeatureTaskExecutionFormModule } from '@angular-console/vscode-ui/feature-task-execution-form';

describe('AppComponent', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [VscodeUiFeatureTaskExecutionFormModule],
      declarations: [AppComponent]
    }).compileComponents();
  }));

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  });
});
