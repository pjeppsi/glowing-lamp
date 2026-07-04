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
