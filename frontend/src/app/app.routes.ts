import { Routes } from '@angular/router';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { Shell } from './layout/shell/shell';

export const routes: Routes = [
  {
    path: '',
    component: Shell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'leaderboard' },
      {
        path: 'register',
        loadComponent: () => import('./features/register/register').then((m) => m.Register),
      },
      {
        path: 'leaderboard',
        providers: [provideCharts(withDefaultRegisterables())],
        loadComponent: () =>
          import('./features/leaderboard/leaderboard').then((m) => m.Leaderboard),
      },
      {
        path: 'dashboard/:userId',
        providers: [provideCharts(withDefaultRegisterables())],
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      { path: '**', redirectTo: 'leaderboard' },
    ],
  },
];
