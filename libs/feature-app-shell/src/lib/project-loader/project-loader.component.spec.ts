import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UiModule } from '@angular-console/ui';

import { ProjectLoaderComponent } from './project-loader.component';

describe('ProjectLoaderComponent', () => {
  let component: ProjectLoaderComponent;
  let fixture: ComponentFixture<ProjectLoaderComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [UiModule],
      declarations: [ProjectLoaderComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ProjectLoaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should be empty', () => {
    expect(fixture.elementRef.nativeElement.querySelector('ui-content-loader')).toBeTruthy();
  });
});
