import { Injectable } from '@angular/core';
import { LeaderboardEntry, LeaderboardEntryResponse, Trend } from '../models/leaderboard.model';

const STORAGE_KEY = 'fc-leaderboard-snapshot';

// The backend explicitly leaves the ranking-trend mechanism undefined (see
// LeaderboardEntryResponse) — there's no "previous period" concept server
// side. This computes trend client-side by diffing against the last snapshot
// of ranks seen in this browser, persisted across visits.
@Injectable({ providedIn: 'root' })
export class LeaderboardTrendService {
  annotate(entries: LeaderboardEntryResponse[]): LeaderboardEntry[] {
    const previousRanks = this.readSnapshot();

    const annotated = entries.map((entry) => {
      const previousRank = previousRanks[entry.userId];
      let trend: Trend;
      if (previousRank === undefined) {
        trend = 'new';
      } else if (entry.rank < previousRank) {
        trend = 'up';
      } else if (entry.rank > previousRank) {
        trend = 'down';
      } else {
        trend = 'same';
      }
      return { ...entry, trend };
    });

    this.writeSnapshot(entries);
    return annotated;
  }

  private readSnapshot(): Record<string, number> {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    try {
      return JSON.parse(raw) as Record<string, number>;
    } catch {
      return {};
    }
  }

  private writeSnapshot(entries: LeaderboardEntryResponse[]): void {
    const snapshot: Record<string, number> = {};
    for (const entry of entries) {
      snapshot[entry.userId] = entry.rank;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }
}
