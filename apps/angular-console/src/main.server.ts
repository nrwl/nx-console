import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppServerModule } from './app/app.server.module';
import { environment } from './environments/environment';
import { createWindow } from 'domino';

enableProdMode();
const window = createWindow();
Object.assign(global, { ...window, window });

document.body.classList.add(environment.application);

platformBrowserDynamic()
  .bootstrapModule(AppServerModule)
  .catch(err => console.log(err));
