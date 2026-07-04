import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { CurrentUserService } from './core/services/current-user.service';
import { Shell } from './layout/shell/shell';

export const routes: Routes = [
  {
    path: '',
    component: Shell,
    children: [
      {
        path: '',
        pathMatch: 'full',
        children: [],
        canActivate: [
          () => {
            const currentUser = inject(CurrentUserService).user();
            const router = inject(Router);
            return router.parseUrl(currentUser ? `/dashboard/${currentUser.id}` : '/register');
          },
        ],
      },
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
