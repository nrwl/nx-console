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
    animate('300ms cubic-bezier(0.4, 0.0, 0.2, 1)', style({ opacity: 1 }))
  ],
  { optional: true }
);
