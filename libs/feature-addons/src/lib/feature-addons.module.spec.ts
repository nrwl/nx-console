import { async, TestBed } from '@angular/core/testing';
import { FeatureAddonsModule } from './feature-addons.module';

describe('FeatureAddonsModule', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [FeatureAddonsModule]
    })
      .compileComponents();
  }));

  it('should create', () => {
    expect(FeatureAddonsModule).toBeDefined();
  });
});
