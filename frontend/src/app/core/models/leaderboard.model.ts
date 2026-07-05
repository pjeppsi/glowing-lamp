export type Trend = 'up' | 'down' | 'same' | 'new' | '-';

export interface LeaderboardEntryResponse {
  rank: number;
  userId: string;
  firstName: string;
  lastName: string;
  totalPoints: number;
  // Computed server-side from Activity rows for the requested window. "-" only
  // when window is 'allTime', where there's no prior period to compare against.
  trend: Trend;
}

export type LeaderboardWindow = 'today' | 'week' | 'month' | 'allTime';

export interface LeaderboardResponse {
  window: LeaderboardWindow;
  page: number;
  pageSize: number;
  totalCount: number;
  entries: LeaderboardEntryResponse[];
}

// Cap on how many users can be plotted at once on the comparison chart —
// past this a multi-line chart stops being readable.
export const MAX_COMPARISON_USERS = 5;
