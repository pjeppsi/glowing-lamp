import { Component, computed, inject, signal } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { LeaderboardApiService } from '../../core/services/leaderboard-api.service';
import { CurrentUserService } from '../../core/services/current-user.service';
import { UsersApiService } from '../../core/services/users-api.service';
import { LeaderboardEntryResponse, LeaderboardWindow } from '../../core/models/leaderboard.model';
import { categoricalChartColors, chartThemeColors } from '../../core/models/chart-colors';
import { CHART_FONT } from '../../core/models/chart-defaults';
import { monthlyPointTotals } from '../../core/utils/monthly-points';
import { ThemeService } from '../../core/services/theme.service';
import {
  CompareUsersDialog,
  CompareUsersDialogData,
} from './compare-users-dialog/compare-users-dialog';
import { UserDashboardDialog, UserDashboardDialogData } from './user-dashboard-dialog/user-dashboard-dialog';

// Per-request page size used while fetching the whole roster for the
// compare-users picker (see fetchAllLeaderboardEntries). This is just a
// fetch-batch size, not an assumed cap on how many users can exist — however
// large the roster actually is, every page gets fetched and concatenated.
const ROSTER_FETCH_PAGE_SIZE = 100;

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
    MatFormFieldModule,
    MatSelectModule,
    MatPaginatorModule,
    BaseChartDirective,
  ],
  templateUrl: './leaderboard.html',
  styleUrl: './leaderboard.scss',
})
export class Leaderboard {
  private readonly leaderboardApi = inject(LeaderboardApiService);
  private readonly usersApi = inject(UsersApiService);
  private readonly dialog = inject(MatDialog);
  protected readonly currentUserService = inject(CurrentUserService);
  private readonly themeService = inject(ThemeService);

  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly entries = signal<LeaderboardEntryResponse[]>([]);
  protected readonly window = signal<LeaderboardWindow>('allTime');
  protected readonly displayedColumns = computed(() =>
    this.window() === 'allTime' ? ['rank', 'name', 'points'] : ['rank', 'name', 'points', 'trend'],
  );
  protected readonly windowOptions: { value: LeaderboardWindow; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'allTime', label: 'All Time' },
  ];

  protected readonly totalCount = signal(0);
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(10);
  protected readonly pageSizeOptions = [5, 10, 25, 50];
  protected readonly compareCandidatesLoading = signal(false);

  protected onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.load();
  }

  protected readonly comparisonChartInfo =
    'X axis: month. Y axis: total points earned that month, one line per selected user.';

  protected readonly trendColumnInfo =
    '↑ moved up, ↓ moved down, – no change, ★ new on the leaderboard — all compared to the start of the selected window.';

  protected readonly windowSelectInfo =
    "Compares each user's current rank to their rank at the start of the selected period — it does not filter which activities are shown.";

  protected readonly comparisonUsers = signal<LeaderboardEntryResponse[]>([]);
  protected readonly comparisonLoading = signal(false);
  protected readonly comparisonChartData = signal<ChartConfiguration<'line'>['data'] | null>(null);
  protected readonly comparisonLegend = signal<ComparisonLegendItem[]>([]);

  protected readonly comparisonChartOptions = computed<ChartConfiguration<'line'>['options']>(
    () => {
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
    },
  );

  constructor() {
    this.load();
  }

  // Guards against a stale response overwriting a newer one when load() is
  // called again (window/page change) before an in-flight request resolves —
  // network order isn't guaranteed to match request order, so an older
  // request finishing last would otherwise clobber the table with data for a
  // window/page that's no longer selected.
  private loadRequestId = 0;

  protected load(): void {
    this.loading.set(true);
    this.error.set(false);
    const requestId = ++this.loadRequestId;

    this.leaderboardApi.get(this.window(), this.pageIndex() + 1, this.pageSize()).subscribe({
      next: (response) => {
        if (requestId !== this.loadRequestId) {
          return;
        }
        this.entries.set(response.entries);
        this.totalCount.set(response.totalCount);
        this.loading.set(false);
      },
      error: () => {
        if (requestId !== this.loadRequestId) {
          return;
        }
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  protected setWindow(window: LeaderboardWindow): void {
    if (window === this.window()) {
      return;
    }
    this.window.set(window);
    this.pageIndex.set(0);
    this.load();
  }

  protected viewDashboard(userId: string): void {
    this.dialog.open<UserDashboardDialog, UserDashboardDialogData>(UserDashboardDialog, {
      data: { userId },
      width: '95vw',
      maxWidth: '1200px',
      height: '90vh',
      panelClass: 'user-dashboard-dialog-panel',
    });
  }

  protected trendIcon(trend: LeaderboardEntryResponse['trend']): string {
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

  protected trendLabel(trend: LeaderboardEntryResponse['trend']): string {
    switch (trend) {
      case 'up':
        return `Moved up this ${this.window()}`;
      case 'down':
        return `Moved down this ${this.window()}`;
      case 'new':
        return 'New on the leaderboard for this window';
      case '-':
        return 'Trend not applicable for all-time view';
      default:
        return `No change this ${this.window()}`;
    }
  }

  // Richer than trendLabel() — includes the actual previous rank/points when
  // the server provided them, falling back to the short label for allTime/new
  // entries where there's no prior state to report.
  protected trendTooltip(entry: LeaderboardEntryResponse): string {
    if (entry.previousRank === undefined || entry.previousPoints === undefined) {
      return this.trendLabel(entry.trend);
    }

    const spots = Math.abs(entry.positionChange ?? 0);
    const spotsLabel =
      entry.positionChange && entry.positionChange !== 0
        ? `, ${spots} spot${spots === 1 ? '' : 's'} ${entry.positionChange > 0 ? 'up' : 'down'}`
        : '';

    return (
      `Was #${entry.previousRank} (${entry.previousPoints} pts) → ` +
      `now #${entry.rank} (${entry.totalPoints} pts)${spotsLabel}`
    );
  }

  protected openCompareDialog(): void {
    // The visible table only holds the current page — the picker needs the
    // full roster, so it's fetched separately rather than reusing `entries()`.
    this.compareCandidatesLoading.set(true);

    this.fetchAllLeaderboardEntries(this.window()).subscribe({
      next: (allEntries) => {
        this.compareCandidatesLoading.set(false);

        const ref = this.dialog.open<CompareUsersDialog, CompareUsersDialogData, LeaderboardEntryResponse[]>(
          CompareUsersDialog,
          {
            data: {
              entries: allEntries,
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
      },
      error: () => {
        this.compareCandidatesLoading.set(false);
      },
    });
  }

  // Fetches every page of the leaderboard for the given window and concatenates
  // them, regardless of how large the roster actually is — the first request
  // reveals totalCount, and however many additional pages that implies are then
  // requested in parallel and merged, so this stays correct whether there are
  // 9 users or 90,000.
  private fetchAllLeaderboardEntries(window: LeaderboardWindow): Observable<LeaderboardEntryResponse[]> {
    return this.leaderboardApi.get(window, 1, ROSTER_FETCH_PAGE_SIZE).pipe(
      switchMap((first) => {
        const totalPages = Math.ceil(first.totalCount / ROSTER_FETCH_PAGE_SIZE);
        if (totalPages <= 1) {
          return of(first.entries);
        }

        const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) =>
          this.leaderboardApi.get(window, i + 2, ROSTER_FETCH_PAGE_SIZE),
        );
        return forkJoin(remainingPages).pipe(
          map((pages) => [...first.entries, ...pages.flatMap((p) => p.entries)]),
        );
      }),
    );
  }

  private loadComparisonChart(users: LeaderboardEntryResponse[]): void {
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

        const colors = categoricalChartColors(this.themeService.theme());
        const datasets = users.map((user, index) => {
          const { months, totals } = perUserMonthly[index];
          const pointsByKey = new Map(months.map((m, i) => [m.key, totals[i]]));
          const color = colors[index % colors.length];
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
            color: colors[index % colors.length],
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
