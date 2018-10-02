
import { async, TestBed } from '@angular/core/testing';
import { FeatureAppShellModule } from './feature-app-shell.module';

describe('FeatureAppShellModule', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [ FeatureAppShellModule ]
    })
    .compileComponents();
  }));

  it('should create', () => {
    expect(FeatureAppShellModule).toBeDefined();
  });
});
      