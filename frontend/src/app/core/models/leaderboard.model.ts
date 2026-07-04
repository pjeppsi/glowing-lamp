export interface LeaderboardEntryResponse {
  rank: number;
  userId: string;
  firstName: string;
  lastName: string;
  totalPoints: number;
}

export type Trend = 'up' | 'down' | 'same' | 'new';

export interface LeaderboardEntry extends LeaderboardEntryResponse {
  trend: Trend;
}

// Cap on how many users can be plotted at once on the comparison chart —
// past this a multi-line chart stops being readable.
export const MAX_COMPARISON_USERS = 5;
