import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ContextualActionBarComponent } from './contextual-action-bar.component';

describe('ContextualActionBarComponent', () => {
  let component: ContextualActionBarComponent;
  let fixture: ComponentFixture<ContextualActionBarComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ContextualActionBarComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ContextualActionBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
