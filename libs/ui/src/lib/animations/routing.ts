import {
  animate,
  group,
  query,
  style,
  AnimationGroupMetadata
} from '@angular/animations';

const STAGE = style({ transform: 'translateZ(0)' });
const STAGE_TOP = style({ transform: 'translate3d(0, -100%, 0)' });
const STAGE_BOTTOM = style({ transform: 'translate3d(0, 100%, 0)' });
const STAGE_LEFT = style({ transform: 'translate3d(-100%, 0, 0)' });
const STAGE_RIGHT = style({ transform: 'translate3d(100%, 0, 0)' });

export function animateUp(timing: string): AnimationGroupMetadata {
  return group([
    query(':enter', [STAGE_TOP, animate(timing, STAGE)]),
    query(':leave', animate(timing, STAGE_BOTTOM))
  ]);
}

export function animateDown(timing: string): AnimationGroupMetadata {
  return group([
    query(':enter', [STAGE_BOTTOM, animate(timing, STAGE)]),
    query(':leave', animate(timing, STAGE_TOP))
  ]);
}

export function animateLeft(timing: string): AnimationGroupMetadata {
  return group([
    query(':enter', [STAGE_LEFT, animate(timing, STAGE)]),
    query(':leave', animate(timing, STAGE_RIGHT))
  ]);
}

export function animateRight(timing: string): AnimationGroupMetadata {
  return group([
    query(':enter', [STAGE_RIGHT, animate(timing, STAGE)]),
    query(':leave', animate(timing, STAGE_LEFT))
  ]);
}
