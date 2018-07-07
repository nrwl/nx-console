import { async, TestBed } from '@angular/core/testing';
import { FeatureGenerateModule } from './feature-generate.module';

describe('FeatureGenerateModule', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [FeatureGenerateModule]
    }).compileComponents();
  }));

  it('should create', () => {
    expect(FeatureGenerateModule).toBeDefined();
  });
});
