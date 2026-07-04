import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialog } from '@angular/material/dialog';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { LeaderboardApiService } from '../../core/services/leaderboard-api.service';
import { LeaderboardTrendService } from '../../core/services/leaderboard-trend.service';
import { CurrentUserService } from '../../core/services/current-user.service';
import { UsersApiService } from '../../core/services/users-api.service';
import { LeaderboardEntry } from '../../core/models/leaderboard.model';
import { CATEGORICAL_CHART_COLORS } from '../../core/models/chart-colors';
import { monthlyPointTotals } from '../../core/utils/monthly-points';
import {
  CompareUsersDialog,
  CompareUsersDialogData,
} from './compare-users-dialog/compare-users-dialog';

const CHART_FONT = { family: 'Inter', size: 12 };
const MUTED = '#8b8ba8';
const GRID = 'rgba(255, 255, 255, 0.07)';

interface ComparisonLegendItem {
  name: string;
  color: string;
}

@Component({
  selector: 'app-leaderboard',
  imports: [
    MatIconModule,
    MatTableModule,
    MatButtonModule,
    MatTooltipModule,
    MatExpansionModule,
    BaseChartDirective,
  ],
  templateUrl: './leaderboard.html',
  styleUrl: './leaderboard.scss',
})
export class Leaderboard {
  private readonly leaderboardApi = inject(LeaderboardApiService);
  private readonly trendService = inject(LeaderboardTrendService);
  private readonly usersApi = inject(UsersApiService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  protected readonly currentUserService = inject(CurrentUserService);

  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly entries = signal<LeaderboardEntry[]>([]);
  protected readonly displayedColumns = ['rank', 'name', 'points', 'trend'];

  protected readonly comparisonChartInfo =
    'X axis: month. Y axis: total points earned that month, one line per selected user.';

  protected readonly comparisonUsers = signal<LeaderboardEntry[]>([]);
  protected readonly comparisonLoading = signal(false);
  protected readonly comparisonChartData = signal<ChartConfiguration<'line'>['data'] | null>(null);
  protected readonly comparisonLegend = signal<ComparisonLegendItem[]>([]);

  protected readonly comparisonChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: { ticks: { color: MUTED, font: CHART_FONT }, grid: { color: GRID } },
      y: {
        beginAtZero: true,
        ticks: { color: MUTED, font: CHART_FONT },
        grid: { color: GRID },
      },
    },
  };

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(false);

    this.leaderboardApi.get().subscribe({
      next: (response) => {
        this.entries.set(this.trendService.annotate(response));
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  protected viewDashboard(userId: string): void {
    this.router.navigate(['/dashboard', userId]);
  }

  protected trendIcon(trend: LeaderboardEntry['trend']): string {
    switch (trend) {
      case 'up':
        return 'arrow_upward';
      case 'down':
        return 'arrow_downward';
      case 'new':
        return 'star';
      default:
        return 'remove';
    }
  }

  protected trendLabel(trend: LeaderboardEntry['trend']): string {
    switch (trend) {
      case 'up':
        return 'Moved up since your last visit';
      case 'down':
        return 'Moved down since your last visit';
      case 'new':
        return 'New on the leaderboard';
      default:
        return 'No change since your last visit';
    }
  }

  protected openCompareDialog(): void {
    const ref = this.dialog.open<CompareUsersDialog, CompareUsersDialogData, LeaderboardEntry[]>(
      CompareUsersDialog,
      {
        data: {
          entries: this.entries(),
          initiallySelected: this.comparisonUsers().map((u) => u.userId),
        },
      },
    );

    ref.afterClosed().subscribe((selected) => {
      if (selected) {
        this.comparisonUsers.set(selected);
        this.loadComparisonChart(selected);
      }
    });
  }

  private loadComparisonChart(users: LeaderboardEntry[]): void {
    if (users.length === 0) {
      this.comparisonChartData.set(null);
      this.comparisonLegend.set([]);
      return;
    }

    this.comparisonLoading.set(true);

    forkJoin(users.map((user) => this.usersApi.getActivities(user.userId))).subscribe({
      next: (activitiesPerUser) => {
        // Union of every month any selected user was active, so all lines
        // share the same x-axis even if one user started later than another.
        const allMonthKeys = new Set<string>();
        const perUserMonthly = activitiesPerUser.map((activities) => monthlyPointTotals(activities));
        for (const { months } of perUserMonthly) {
          for (const m of months) {
            allMonthKeys.add(m.key);
          }
        }
        const sortedKeys = [...allMonthKeys].sort();
        const labels = sortedKeys.map((key) =>
          new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
            new Date(`${key}-01T00:00:00Z`),
          ),
        );

        const datasets = users.map((user, index) => {
          const { months, totals } = perUserMonthly[index];
          const pointsByKey = new Map(months.map((m, i) => [m.key, totals[i]]));
          const color = CATEGORICAL_CHART_COLORS[index % CATEGORICAL_CHART_COLORS.length];
          return {
            label: `${user.firstName} ${user.lastName}`,
            data: sortedKeys.map((key) => pointsByKey.get(key) ?? 0),
            borderColor: color,
            backgroundColor: `${color}22`,
            pointBackgroundColor: color,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            tension: 0.3,
          };
        });

        this.comparisonChartData.set({ labels, datasets });
        this.comparisonLegend.set(
          users.map((user, index) => ({
            name: `${user.firstName} ${user.lastName}`,
            color: CATEGORICAL_CHART_COLORS[index % CATEGORICAL_CHART_COLORS.length],
          })),
        );
        this.comparisonLoading.set(false);
      },
      error: () => {
        this.comparisonChartData.set(null);
        this.comparisonLoading.set(false);
      },
    });
  }
}
