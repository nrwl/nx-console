import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule, BACKEND_PORT } from './app/app.module';
import { environment } from './environments/environment';
import { WebFrame, IpcRenderer } from 'electron';

if (environment.production) {
  enableProdMode();
}

function bootstrap(port?: number) {
  platformBrowserDynamic([
    {
      provide: BACKEND_PORT,
      useValue: port
    }
  ])
    .bootstrapModule(AppModule)
    .catch(err => console.log(err));
}

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
if (typeof global !== 'undefined' && global.require) {
  try {
    const {
      webFrame,
      ipcRenderer
    }: { webFrame: WebFrame; ipcRenderer: IpcRenderer } = global.require(
      'electron'
    );
    webFrame.setZoomLevel(0);
    webFrame.setVisualZoomLevelLimits(1, 1);
    ipcRenderer.send('backend.ready');
    ipcRenderer.on('backend.ready', (event: any, port: number) => {
      bootstrap(port);
    });
  } catch (e) {
    console.error('Could not get ahold of webFrame to prevent zooming.', e);
  }
} else {
  bootstrap();
}
