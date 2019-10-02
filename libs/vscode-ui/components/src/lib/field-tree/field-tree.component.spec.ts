import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FieldTreeComponent } from './field-tree.component';

describe('FieldTreeComponent', () => {
  let component: FieldTreeComponent;
  let fixture: ComponentFixture<FieldTreeComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [FieldTreeComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FieldTreeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
