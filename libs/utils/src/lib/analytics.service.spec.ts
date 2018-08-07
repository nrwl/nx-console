import { TestBed, inject } from '@angular/core/testing';

import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AnalyticsService]
    });
  });

  it('should be created', inject(
    [AnalyticsService],
    (service: AnalyticsService) => {
      expect(service).toBeTruthy();
    }
  ));
});
