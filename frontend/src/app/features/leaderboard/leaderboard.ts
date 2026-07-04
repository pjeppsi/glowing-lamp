import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { LeaderboardApiService } from '../../core/services/leaderboard-api.service';
import { LeaderboardTrendService } from '../../core/services/leaderboard-trend.service';
import { CurrentUserService } from '../../core/services/current-user.service';
import { LeaderboardEntry } from '../../core/models/leaderboard.model';

@Component({
  selector: 'app-leaderboard',
  imports: [MatIconModule, MatTableModule, MatButtonModule],
  templateUrl: './leaderboard.html',
  styleUrl: './leaderboard.scss',
})
export class Leaderboard {
  private readonly leaderboardApi = inject(LeaderboardApiService);
  private readonly trendService = inject(LeaderboardTrendService);
  private readonly router = inject(Router);
  protected readonly currentUserService = inject(CurrentUserService);

  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly entries = signal<LeaderboardEntry[]>([]);
  protected readonly displayedColumns = ['rank', 'name', 'points', 'trend'];

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
}
