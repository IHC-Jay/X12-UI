import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';

import { enableProdMode, provideZoneChangeDetection } from '@angular/core';
import { environment } from './environments/environment';

platformBrowserDynamic().bootstrapModule(AppModule, { applicationProviders: [provideZoneChangeDetection()], })
  .catch(err => console.error(err));


if (environment.production) {
  enableProdMode();
}
