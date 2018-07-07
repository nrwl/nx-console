import { async, TestBed } from '@angular/core/testing';
import { UiModule } from './ui.module';

describe('UiModule', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [UiModule]
    }).compileComponents();
  }));

  it('should create', () => {
    expect(UiModule).toBeDefined();
  });
});
