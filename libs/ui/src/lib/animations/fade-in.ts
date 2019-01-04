import {
  animate,
  query,
  style,
  AnimationQueryMetadata
} from '@angular/animations';

export const FADE_IN: AnimationQueryMetadata = query(
  ':enter',
  [
    style({ opacity: 0 }),
    animate('300ms 100ms ease-in-out', style({ opacity: 1 }))
  ],
  { optional: true }
);
