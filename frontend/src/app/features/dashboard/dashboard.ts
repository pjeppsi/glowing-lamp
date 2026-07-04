import { Component, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { UsersApiService } from '../../core/services/users-api.service';
import { CurrentUserService } from '../../core/services/current-user.service';
import { ActivityResponse } from '../../core/models/activity.model';
import { UserResponse } from '../../core/models/user.model';
import { CATEGORICAL_CHART_COLORS } from '../../core/models/chart-colors';
import { LogActivityDialog } from './log-activity-dialog/log-activity-dialog';

interface SportBreakdownRow {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

const CHART_FONT = { family: 'Inter', size: 12 };
const MUTED = '#8b8ba8';
const GRID = 'rgba(255, 255, 255, 0.07)';

@Component({
  selector: 'app-dashboard',
  imports: [MatIconModule, MatButtonModule, MatTableModule, BaseChartDirective, DatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly route = inject(ActivatedRoute);
  private readonly usersApi = inject(UsersApiService);
  private readonly dialog = inject(MatDialog);
  protected readonly currentUserService = inject(CurrentUserService);

  protected readonly userId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('userId')!)),
    { requireSync: true },
  );

  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly user = signal<UserResponse | null>(null);
  protected readonly activities = signal<ActivityResponse[]>([]);
  protected readonly displayedColumns = ['date', 'sport', 'metric', 'points'];

  protected readonly isOwnDashboard = computed(
    () => this.currentUserService.user()?.id === this.userId(),
  );

  protected readonly totalPoints = computed(() =>
    this.activities().reduce((sum, a) => sum + a.points, 0),
  );

  protected readonly totalActivities = computed(() => this.activities().length);

  protected readonly favoriteSport = computed(() => {
    const counts = new Map<string, number>();
    for (const activity of this.activities()) {
      const label = activity.sport ?? 'Daily Steps';
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    let best: string | null = null;
    let bestCount = 0;
    for (const [label, count] of counts) {
      if (count > bestCount) {
        best = label;
        bestCount = count;
      }
    }
    return best ?? '—';
  });

  protected readonly recentActivities = computed(() =>
    [...this.activities()]
      .sort((a, b) => b.dateTime.localeCompare(a.dateTime))
      .slice(0, 10),
  );

  protected readonly sportBreakdown = computed<SportBreakdownRow[]>(() => {
    const counts = new Map<string, number>();
    for (const activity of this.activities()) {
      const label = activity.sport ?? 'Daily Steps';
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    const total = this.activities().length || 1;
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, count], index) => ({
        label,
        count,
        percentage: Math.round((count / total) * 100),
        color: CATEGORICAL_CHART_COLORS[index % CATEGORICAL_CHART_COLORS.length],
      }));
  });

  protected readonly volumeChartData = computed<ChartConfiguration<'line'>['data']>(() => {
    const byDay = new Map<string, number>();
    for (const activity of this.activities()) {
      const day = activity.dateTime.slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + activity.points);
    }
    const days = [...byDay.keys()].sort();
    return {
      labels: days,
      datasets: [
        {
          label: 'Points',
          data: days.map((day) => byDay.get(day)!),
          borderColor: '#a78bfa',
          backgroundColor: 'rgba(139, 92, 246, 0.15)',
          pointBackgroundColor: '#a78bfa',
          pointRadius: 3,
          pointHoverRadius: 6,
          borderWidth: 2,
          fill: true,
          tension: 0.3,
        },
      ],
    };
  });

  protected readonly volumeChartOptions: ChartConfiguration<'line'>['options'] = {
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

  protected readonly breakdownChartData = computed<ChartConfiguration<'bar'>['data']>(() => {
    const rows = this.sportBreakdown();
    return {
      labels: rows.map((r) => r.label),
      datasets: [
        {
          label: 'Activities',
          data: rows.map((r) => r.count),
          backgroundColor: rows.map((r) => r.color),
          borderRadius: 4,
          barThickness: 18,
        },
      ],
    };
  });

  protected readonly breakdownChartOptions: ChartConfiguration<'bar'>['options'] = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { intersect: false },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: MUTED, font: CHART_FONT, stepSize: 1 },
        grid: { color: GRID },
      },
      y: { ticks: { color: MUTED, font: CHART_FONT }, grid: { display: false } },
    },
  };

  protected readonly heatmapDays = computed(() => {
    const byDay = new Map<string, number>();
    for (const activity of this.activities()) {
      const day = activity.dateTime.slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + activity.points);
    }
    const max = Math.max(1, ...byDay.values());

    // Stay in UTC throughout — activity.dateTime is a UTC ISO string, and
    // mixing local-time day boundaries with toISOString() here would shift
    // "today" onto the wrong UTC date for users ahead of/behind UTC.
    const days: { date: string; points: number; intensity: number }[] = [];
    const now = new Date();
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    for (let i = 27; i >= 0; i--) {
      const key = new Date(todayUtc - i * 86_400_000).toISOString().slice(0, 10);
      const points = byDay.get(key) ?? 0;
      days.push({ date: key, points, intensity: points / max });
    }
    return days;
  });

  constructor() {
    effect(() => this.load());
  }

  protected load(): void {
    const userId = this.userId();
    this.loading.set(true);
    this.error.set(false);

    this.usersApi.getById(userId).subscribe({
      next: (user) => {
        this.user.set(user);
        this.usersApi.getActivities(userId).subscribe({
          next: (activities) => {
            this.activities.set(activities);
            this.loading.set(false);
          },
          error: () => {
            this.error.set(true);
            this.loading.set(false);
          },
        });
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  protected formatMetric(activity: ActivityResponse): string {
    if (activity.distance !== null) {
      return `${activity.distance} km`;
    }
    if (activity.duration !== null) {
      return activity.duration;
    }
    return `${activity.steps} steps`;
  }

  protected openLogActivityDialog(): void {
    const ref = this.dialog.open(LogActivityDialog, {
      data: { userId: this.userId() },
    });

    ref.afterClosed().subscribe((activity) => {
      if (activity) {
        this.activities.update((current) => [...current, activity]);
      }
    });
  }
}
