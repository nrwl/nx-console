import {
  animate,
  group,
  query,
  style,
  transition,
  trigger
} from '@angular/animations';

const TIMING = '0.5s ease-in-out';
const STAGE = style({ transform: 'translate3d(0%, 0, 0)' });

const STAGE_TOP = style({ transform: 'translate3d(0, -100%, 0)' });
const STAGE_BOTTOM = style({ transform: 'translate3d(0, 100%, 0)' });

const ANIMATE_UP = group([
  query(':enter', [STAGE_TOP, animate(TIMING, STAGE)], { optional: true }),
  query(':leave', [STAGE, animate(TIMING, STAGE_BOTTOM)], { optional: true })
]);

const ANIMATE_DOWN = group([
  query(':enter', [STAGE_BOTTOM, animate(TIMING, STAGE)], { optional: true }),
  query(':leave', [STAGE, animate(TIMING, STAGE_TOP)], { optional: true })
]);

export const ROUTING_ANIMATION = trigger('routerTransition', [
  transition('* => details', ANIMATE_UP),
  transition('details => *', ANIMATE_DOWN),
  transition('tasks => *', ANIMATE_UP),
  transition('generate => extensions', ANIMATE_DOWN),
  transition('extensions => generate', ANIMATE_UP),
  transition('* => tasks', ANIMATE_DOWN)
]);
