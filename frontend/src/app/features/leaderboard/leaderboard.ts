import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { LeaderboardApiService } from '../../core/services/leaderboard-api.service';
import { LeaderboardTrendService } from '../../core/services/leaderboard-trend.service';
import { CurrentUserService } from '../../core/services/current-user.service';
import { UsersApiService } from '../../core/services/users-api.service';
import { LeaderboardEntry } from '../../core/models/leaderboard.model';
import { CATEGORICAL_CHART_COLORS } from '../../core/models/chart-colors';

const TOP_N = 5;
const SPORT_CATEGORIES = ['Running', 'Walking', 'Cycling', 'Gym', 'Swimming', 'Daily Steps'];
const CHART_FONT = { family: 'Inter', size: 12 };
const MUTED = '#8b8ba8';
const GRID = 'rgba(255, 255, 255, 0.07)';

interface RadarLegendItem {
  name: string;
  color: string;
}

@Component({
  selector: 'app-leaderboard',
  imports: [MatIconModule, MatTableModule, MatButtonModule, BaseChartDirective],
  templateUrl: './leaderboard.html',
  styleUrl: './leaderboard.scss',
})
export class Leaderboard {
  private readonly leaderboardApi = inject(LeaderboardApiService);
  private readonly trendService = inject(LeaderboardTrendService);
  private readonly usersApi = inject(UsersApiService);
  private readonly router = inject(Router);
  protected readonly currentUserService = inject(CurrentUserService);

  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly entries = signal<LeaderboardEntry[]>([]);
  protected readonly displayedColumns = ['rank', 'name', 'points', 'trend'];

  protected readonly radarLoading = signal(false);
  protected readonly radarChartData = signal<ChartConfiguration<'radar'>['data'] | null>(null);
  protected readonly radarLegend = signal<RadarLegendItem[]>([]);

  protected readonly radarChartOptions: ChartConfiguration<'radar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      r: {
        beginAtZero: true,
        angleLines: { color: GRID },
        grid: { color: GRID },
        pointLabels: { color: MUTED, font: CHART_FONT },
        ticks: { color: MUTED, backdropColor: 'transparent' },
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
        const annotated = this.trendService.annotate(response);
        this.entries.set(annotated);
        this.loading.set(false);
        this.loadRadarChart(annotated);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  private loadRadarChart(entries: LeaderboardEntry[]): void {
    const topEntries = entries.slice(0, TOP_N);

    if (topEntries.length === 0) {
      this.radarChartData.set(null);
      this.radarLegend.set([]);
      return;
    }

    this.radarLoading.set(true);

    forkJoin(topEntries.map((entry) => this.usersApi.getActivities(entry.userId))).subscribe({
      next: (activitiesPerUser) => {
        const datasets = topEntries.map((entry, index) => {
          const pointsByCategory = new Array(SPORT_CATEGORIES.length).fill(0);
          for (const activity of activitiesPerUser[index]) {
            const label = activity.sport ?? 'Daily Steps';
            const categoryIndex = SPORT_CATEGORIES.indexOf(label);
            if (categoryIndex >= 0) {
              pointsByCategory[categoryIndex] += activity.points;
            }
          }
          const color = CATEGORICAL_CHART_COLORS[index % CATEGORICAL_CHART_COLORS.length];
          return {
            label: `${entry.firstName} ${entry.lastName}`,
            data: pointsByCategory,
            borderColor: color,
            backgroundColor: `${color}33`,
            pointBackgroundColor: color,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
          };
        });

        this.radarChartData.set({ labels: SPORT_CATEGORIES, datasets });
        this.radarLegend.set(
          topEntries.map((entry, index) => ({
            name: `${entry.firstName} ${entry.lastName}`,
            color: CATEGORICAL_CHART_COLORS[index % CATEGORICAL_CHART_COLORS.length],
          })),
        );
        this.radarLoading.set(false);
      },
      error: () => {
        this.radarChartData.set(null);
        this.radarLoading.set(false);
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
}
