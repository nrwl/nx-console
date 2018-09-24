/**
 * Based off of https://github.com/NetanelBasal/ngx-content-loader
 */

import { Component, Input } from '@angular/core';

function uid() {
  return Math.random()
    .toString(36)
    .substring(2);
}

@Component({
  selector: 'ui-content-loader',
  styleUrls: ['./content-loader.component.scss'],
  templateUrl: './content-loader.component.html'
})
export class ContentLoaderComponent {
  @Input() animate = true;
  @Input() width = 400;
  @Input() height = 130;
  @Input() speed = 2;
  @Input() preserveAspectRatio = 'xMidYMid meet';
  @Input() primaryColor = '#f9f9f9';
  @Input() secondaryColor = '#ecebeb';
  @Input() primaryOpacity = 1;
  @Input() secondaryOpacity = 1;
  idClip = uid();
  idGradient = uid();
}