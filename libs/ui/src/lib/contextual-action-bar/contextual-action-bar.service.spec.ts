import { TestBed, inject } from '@angular/core/testing';

import { ContextualActionBarService } from './contextual-action-bar.service';

describe('ContextualActionBarService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ContextualActionBarService]
    });
  });

  it(
    'should be created',
    inject(
      [ContextualActionBarService],
      (service: ContextualActionBarService) => {
        expect(service).toBeTruthy();
      }
    )
  );
});
