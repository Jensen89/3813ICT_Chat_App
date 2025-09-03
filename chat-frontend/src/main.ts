import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { routes } from './app/app.routes';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

bootstrapApplication(App, {

  providers: [
    provideHttpClient(),
    provideRouter(routes)
  ]

}).catch((err) => console.error(err));
