import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    // Root-level, not per-route: a MatDialog opened without an explicit
    // injector (e.g. UserDashboardDialog from Leaderboard) resolves through
    // the root injector, not the lazy route's injector — a route-scoped
    // provideCharts wouldn't be visible to it, leaving its charts unregistered.
    provideCharts(withDefaultRegisterables()),
  ]
};
