import {
  animate,
  group,
  query,
  style,
  transition,
  trigger,
  state
} from '@angular/animations';

const TIMING = '700ms 150ms ease-in-out';
const STAGE = style({ transform: 'translateZ(0)' });
const STAGE_TOP = style({ transform: 'translate3d(0, -100%, 0)' });
const STAGE_BOTTOM = style({ transform: 'translate3d(0, 100%, 0)' });

const ANIMATE_UP = group([
  query(':enter', [STAGE_TOP, animate(TIMING, STAGE)]),
  query(':leave', animate(TIMING, STAGE_BOTTOM))
]);

const ANIMATE_DOWN = group([
  query(':enter', [STAGE_BOTTOM, animate(TIMING, STAGE)]),
  query(':leave', animate(TIMING, STAGE_TOP))
]);

export const ROUTING_ANIMATION = trigger('routerTransition', [
  transition('void => *', []),
  transition('* => details', ANIMATE_UP),
  transition('details => *', ANIMATE_DOWN),
  transition('tasks => *', ANIMATE_UP),
  transition('generate => extensions', ANIMATE_DOWN),
  transition('extensions => generate', ANIMATE_UP),
  transition('* => tasks', ANIMATE_DOWN)
]);

export const GROW_SHRINK = trigger('growShrink', [
  state('void', style({ width: '0' })),
  state('collapse', style({ width: '0' })),
  state('expand', style({ width: '*' })),
  transition(`expand => collapse`, animate(`800ms 300ms ease-in-out`)),
  transition(`collapse => expand`, animate(`800ms ease-in-out`))
]);
