import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';

import { enableProdMode, provideZoneChangeDetection } from '@angular/core';
import { environment } from './environments/environment';

const buildVersion = environment.appVersion || 'unknown';
const currentPath = window.location.pathname;
console.info(`[DeployStamp] build=${buildVersion} path=${currentPath} org=${environment.org || 'unknown'}`);

platformBrowserDynamic().bootstrapModule(AppModule, { applicationProviders: [provideZoneChangeDetection()], })
  .catch(err => console.error(err));


if (environment.production) {
  enableProdMode();
}
