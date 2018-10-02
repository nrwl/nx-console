import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, ViewChild } from '@angular/core';

import { ContentLoaderComponent } from './content-loader.component';

@Component({
  selector: 'test-component',
  template: `
    <ui-content-loader>
      <svg:rect x="0" y="0" height="100" width="100"/>
    </ui-content-loader>
  `
})
class TestComponent {
  @ViewChild(ContentLoaderComponent) contentLoader: ContentLoaderComponent;
}

describe('ContentLoaderComponent', () => {
  let component: ContentLoaderComponent;
  let fixture: ComponentFixture<TestComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ContentLoaderComponent, TestComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance.contentLoader;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should project content', () => {
    const container = fixture.nativeElement.querySelector('clipPath');
    expect(container.querySelector('rect')).toBeTruthy();
  });

  it('should have a linear gradient', () => {
    expect(fixture.nativeElement.querySelector('linearGradient')).toBeTruthy();
  });
});
