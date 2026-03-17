import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// sockjs-client is a CommonJS package that references Node's `global`.
// This polyfill makes it available in the browser.
(window as unknown as Record<string, unknown>)['global'] = window;

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
