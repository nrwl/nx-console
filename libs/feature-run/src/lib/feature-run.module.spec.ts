import { async, TestBed } from '@angular/core/testing';
import { FeatureRunModule } from './feature-run.module';

describe('FeatureRunModule', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [FeatureRunModule]
    }).compileComponents();
  }));

  it('should create', () => {
    expect(FeatureRunModule).toBeDefined();
  });
});
