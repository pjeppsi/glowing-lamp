import { Component, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { UsersApiService } from '../../core/services/users-api.service';
import { CurrentUserService } from '../../core/services/current-user.service';
import { ActivityResponse } from '../../core/models/activity.model';
import { UserResponse } from '../../core/models/user.model';
import { categoricalChartColors, chartThemeColors } from '../../core/models/chart-colors';
import { CHART_FONT } from '../../core/models/chart-defaults';
import { SPORT_CATEGORIES } from '../../core/models/sport.model';
import { yearlyPointTotals } from '../../core/utils/monthly-points';
import { ThemeService } from '../../core/services/theme.service';
import { LogActivityDialog } from './log-activity-dialog/log-activity-dialog';

interface SportBreakdownRow {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [
    MatIconModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatTableModule,
    MatTooltipModule,
    MatPaginatorModule,
    BaseChartDirective,
    DatePipe,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly route = inject(ActivatedRoute);
  private readonly usersApi = inject(UsersApiService);
  private readonly dialog = inject(MatDialog);
  protected readonly currentUserService = inject(CurrentUserService);
  private readonly themeService = inject(ThemeService);

  protected readonly volumeChartInfo = 'X axis: month. Y axis: total points earned that month.';
  protected readonly breakdownChartInfo =
    'X axis: number of logged activities. Y axis: sport (including Daily Steps).';
  protected readonly sportProfileChartInfo =
    'Each axis is a sport (including Daily Steps). Distance from the center: total points earned in that sport.';

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

  // Real server-side pagination (Skip/Take in the DB) for the Activity History
  // table — separate from `activities` above, which stays unpaged because the
  // charts/stat cards need the user's entire history to aggregate correctly.
  protected readonly historyItems = signal<ActivityResponse[]>([]);
  protected readonly historyTotalCount = signal(0);
  protected readonly historyLoading = signal(false);
  protected readonly activitiesPageIndex = signal(0);
  protected readonly activitiesPageSize = signal(10);
  protected readonly activitiesPageSizeOptions = [5, 10, 25, 50];

  protected onActivitiesPage(event: PageEvent): void {
    this.activitiesPageIndex.set(event.pageIndex);
    this.activitiesPageSize.set(event.pageSize);
    this.loadHistoryPage();
  }

  private loadHistoryPage(): void {
    this.historyLoading.set(true);
    this.usersApi
      .getActivitiesPage(this.userId(), this.activitiesPageIndex() + 1, this.activitiesPageSize())
      .subscribe({
        next: (response) => {
          this.historyItems.set(response.items);
          this.historyTotalCount.set(response.totalCount);
          this.historyLoading.set(false);
        },
        error: () => {
          this.historyLoading.set(false);
        },
      });
  }

  protected readonly sportBreakdown = computed<SportBreakdownRow[]>(() => {
    const counts = new Map<string, number>();
    for (const activity of this.activities()) {
      const label = activity.sport ?? 'Daily Steps';
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    const total = this.activities().length || 1;
    const colors = categoricalChartColors(this.themeService.theme());
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, count], index) => ({
        label,
        count,
        percentage: Math.round((count / total) * 100),
        color: colors[index % colors.length],
      }));
  });

  protected readonly volumeChartData = computed<ChartConfiguration<'line'>['data']>(() => {
    const { months, totals } = yearlyPointTotals(this.activities());
    const { accent } = chartThemeColors(this.themeService.theme());
    return {
      labels: months.map((m) => m.label),
      datasets: [
        {
          label: 'Points',
          data: totals,
          borderColor: accent,
          backgroundColor: 'rgba(139, 92, 246, 0.15)',
          pointBackgroundColor: accent,
          pointRadius: 3,
          pointHoverRadius: 6,
          borderWidth: 2,
          fill: true,
          tension: 0.3,
        },
      ],
    };
  });

  protected readonly volumeChartOptions = computed<ChartConfiguration<'line'>['options']>(() => {
    const { muted, grid } = chartThemeColors(this.themeService.theme());
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { mode: 'index', intersect: false },
      },
      scales: {
        x: { ticks: { color: muted, font: CHART_FONT }, grid: { color: grid } },
        y: {
          beginAtZero: true,
          ticks: { color: muted, font: CHART_FONT },
          grid: { color: grid },
        },
      },
    };
  });

  protected readonly breakdownChartType = signal<'bar' | 'pie'>('bar');

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

  protected readonly breakdownChartOptions = computed<ChartConfiguration<'bar'>['options']>(() => {
    const { muted, grid } = chartThemeColors(this.themeService.theme());
    return {
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
          ticks: { color: muted, font: CHART_FONT, stepSize: 1 },
          grid: { color: grid },
        },
        y: { ticks: { color: muted, font: CHART_FONT }, grid: { display: false } },
      },
    };
  });

  protected readonly breakdownPieChartData = computed<ChartConfiguration<'pie'>['data']>(() => {
    const rows = this.sportBreakdown();
    return {
      labels: rows.map((r) => r.label),
      datasets: [
        {
          label: 'Activities',
          data: rows.map((r) => r.count),
          backgroundColor: rows.map((r) => r.color),
          borderWidth: 0,
        },
      ],
    };
  });

  protected readonly breakdownPieChartOptions: ChartConfiguration<'pie'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { intersect: false },
    },
  };

  protected setBreakdownChartType(type: 'bar' | 'pie'): void {
    this.breakdownChartType.set(type);
  }

  protected readonly sportProfileChartData = computed<ChartConfiguration<'radar'>['data']>(() => {
    const pointsByCategory = new Array(SPORT_CATEGORIES.length).fill(0);
    for (const activity of this.activities()) {
      const label = activity.sport ?? 'Daily Steps';
      const index = SPORT_CATEGORIES.indexOf(label as (typeof SPORT_CATEGORIES)[number]);
      if (index >= 0) {
        pointsByCategory[index] += activity.points;
      }
    }
    const { accent } = chartThemeColors(this.themeService.theme());
    return {
      labels: [...SPORT_CATEGORIES],
      datasets: [
        {
          label: 'Points',
          data: pointsByCategory,
          borderColor: accent,
          backgroundColor: 'rgba(139, 92, 246, 0.2)',
          pointBackgroundColor: accent,
          pointRadius: 3,
          pointHoverRadius: 6,
          borderWidth: 2,
        },
      ],
    };
  });

  protected readonly sportProfileChartOptions = computed<ChartConfiguration<'radar'>['options']>(
    () => {
      const { muted, grid } = chartThemeColors(this.themeService.theme());
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          r: {
            beginAtZero: true,
            angleLines: { color: grid },
            grid: { color: grid },
            pointLabels: { color: muted, font: CHART_FONT },
            // Numeric radial tick labels (0/100/200…) clutter a chart this
            // small without adding much — the shape and hover tooltip carry
            // the value.
            ticks: { display: false },
          },
        },
      };
    },
  );

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
    this.activitiesPageIndex.set(0);

    this.usersApi.getById(userId).subscribe({
      next: (user) => {
        this.user.set(user);
        this.usersApi.getActivities(userId).subscribe({
          next: (activities) => {
            this.activities.set(activities);
            this.loading.set(false);
            this.loadHistoryPage();
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
        this.activitiesPageIndex.set(0);
        this.activities.update((current) => [...current, activity]);
        this.loadHistoryPage();
      }
    });
  }
}
