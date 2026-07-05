import { Component, ViewChildren, QueryList, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { UsersApiService } from '../../../core/services/users-api.service';
import { CurrentUserService } from '../../../core/services/current-user.service';
import { ActivityResponse } from '../../../core/models/activity.model';
import { UserResponse } from '../../../core/models/user.model';
import { categoricalChartColors, chartThemeColors } from '../../../core/models/chart-colors';
import { CHART_FONT } from '../../../core/models/chart-defaults';
import { SPORT_CATEGORIES } from '../../../core/models/sport.model';
import { monthlyPointTotals } from '../../../core/utils/monthly-points';
import { ThemeService } from '../../../core/services/theme.service';
import { LogActivityDialog } from '../../dashboard/log-activity-dialog/log-activity-dialog';

export interface UserDashboardDialogData {
  userId: string;
}

interface SportBreakdownRow {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

interface Slide {
  title: string;
}

const SLIDES: Slide[] = [
  { title: 'Overview' },
  { title: 'Sport Profile & Breakdown' },
  { title: 'Activity Volume Over Time' },
  { title: 'Last 28 Days' },
  { title: 'Activity History' },
];

// A separate component from the routed Dashboard page rather than a shared
// one: this shows one section at a time (carousel), the page shows all of
// them stacked, and reusing Dashboard directly would require it to run
// outside its ActivatedRoute-based userId lookup. The duplication is the
// deliberate tradeoff for keeping the existing page and its tests untouched.
@Component({
  selector: 'app-user-dashboard-dialog',
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
  templateUrl: './user-dashboard-dialog.html',
  styleUrl: './user-dashboard-dialog.scss',
})
export class UserDashboardDialog {
  private readonly data = inject<UserDashboardDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<UserDashboardDialog>);
  private readonly usersApi = inject(UsersApiService);
  private readonly dialog = inject(MatDialog);
  protected readonly currentUserService = inject(CurrentUserService);
  private readonly themeService = inject(ThemeService);

  protected readonly userId = this.data.userId;

  protected readonly slides = SLIDES;
  protected readonly currentSlide = signal(0);

  // Slides other than the active one are [hidden] (display:none), not
  // removed from the DOM — so all canvases are created once, up front, while
  // the dialog is at its final size. A chart created (or last laid out)
  // while its container was display:none keeps a stale, near-zero canvas
  // size from that moment (Chart.js/ng2-charts doesn't auto-detect becoming
  // visible again), which renders as nonsense — e.g. the volume line chart
  // degenerating into a single diagonal from corner to corner. Resizing
  // explicitly whenever the slide changes fixes that up.
  @ViewChildren(BaseChartDirective) private readonly chartDirectives!: QueryList<BaseChartDirective>;

  protected readonly volumeChartInfo = 'X axis: month. Y axis: total points earned that month.';
  protected readonly breakdownChartInfo =
    'X axis: number of logged activities. Y axis: sport (including Daily Steps).';
  protected readonly sportProfileChartInfo =
    'Each axis is a sport (including Daily Steps). Distance from the center: total points earned in that sport.';

  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly user = signal<UserResponse | null>(null);
  protected readonly activities = signal<ActivityResponse[]>([]);
  protected readonly displayedColumns = ['date', 'sport', 'metric', 'points'];

  protected readonly isOwnDashboard = computed(
    () => this.currentUserService.user()?.id === this.userId,
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
      .getActivitiesPage(this.userId, this.activitiesPageIndex() + 1, this.activitiesPageSize())
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
    const { months, totals } = monthlyPointTotals(this.activities());
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
    this.load();

    effect(() => {
      this.currentSlide();
      // Wait a frame so the browser has actually laid out the now-visible
      // slide before Chart.js measures its container.
      requestAnimationFrame(() => {
        this.chartDirectives?.forEach((directive) => directive.chart?.resize());
      });
    });
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.activitiesPageIndex.set(0);

    this.usersApi.getById(this.userId).subscribe({
      next: (user) => {
        this.user.set(user);
        this.usersApi.getActivities(this.userId).subscribe({
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
      data: { userId: this.userId },
    });

    ref.afterClosed().subscribe((activity) => {
      if (activity) {
        this.activitiesPageIndex.set(0);
        this.activities.update((current) => [...current, activity]);
        this.loadHistoryPage();
      }
    });
  }

  protected close(): void {
    this.dialogRef.close();
  }

  protected goToSlide(index: number): void {
    this.currentSlide.set(index);
  }

  protected prevSlide(): void {
    this.currentSlide.update((i) => Math.max(0, i - 1));
  }

  protected nextSlide(): void {
    this.currentSlide.update((i) => Math.min(this.slides.length - 1, i + 1));
  }
}
