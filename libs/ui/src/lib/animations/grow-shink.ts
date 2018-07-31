import {
  animate,
  state,
  style,
  transition,
  trigger
} from '@angular/animations';

export const GROW_SHRINK = trigger('growShrink', [
  state('void', style({ width: '0' })),
  state('collapse', style({ width: '0' })),
  state('expand', style({ width: '*' })),
  transition(`expand => collapse`, animate(`400ms 300ms ease-in-out`)),
  transition(`collapse => expand`, animate(`400ms ease-in-out`))
]);
