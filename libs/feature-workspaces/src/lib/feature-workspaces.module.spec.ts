import { async, TestBed } from '@angular/core/testing';
import { FeatureWorkspacesModule } from './feature-workspaces.module';

describe('FeatureWorkspacesModule', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [FeatureWorkspacesModule]
    }).compileComponents();
  }));

  it('should create', () => {
    expect(FeatureWorkspacesModule).toBeDefined();
  });
});
