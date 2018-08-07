import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import { WebFrame } from 'electron';

/**
 * @jeffbcross: The following disables pinch zooming,
 * because pinching to zoom is awkward on a desktop app.
 * **Scaling is still supported** (i.e. Cmd + and Cmd -)
 *
 * Setting the zoom limit must be done in the renderer thread using webFrame.
 * Since this same app is used in two contexts: browser or electron,
 * it is wrapped in a conditional to make sure it's node. It's also
 * using global['require'] to access `require` so that webpack doesn't try to
 * resolve the import.
 */
declare var global: any;
let webFrame: WebFrame;
if (typeof global !== 'undefined' && global.require) {
  try {
    webFrame = global.require('electron').webFrame;
    webFrame.setZoomLevel(0);
    webFrame.setVisualZoomLevelLimits(1, 1);
  } catch (e) {
    console.error('Could not get ahold of webFrame to prevent zooming.');
  }
}

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch(err => console.log(err));
