import {
  animate,
  query,
  style,
  AnimationQueryMetadata
} from '@angular/animations';

export const FADE_IN: AnimationQueryMetadata = query(':enter', [
  style({ opacity: 0 }),
  animate('500ms ease-in-out', style({ opacity: 1 }))
]);
