import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DirectorySelectorComponent } from './directory-selector.component';

describe('DirectorySelectorComponent', () => {
  let component: DirectorySelectorComponent;
  let fixture: ComponentFixture<DirectorySelectorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [DirectorySelectorComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DirectorySelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
