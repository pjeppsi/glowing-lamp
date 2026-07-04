import { LeaderboardTrendService } from './leaderboard-trend.service';
import { LeaderboardEntryResponse } from '../models/leaderboard.model';

describe('LeaderboardTrendService', () => {
  beforeEach(() => localStorage.clear());

  function entry(userId: string, rank: number): LeaderboardEntryResponse {
    return { userId, rank, firstName: 'A', lastName: 'B', totalPoints: 0 };
  }

  it('marks every user as new on first sighting', () => {
    const service = new LeaderboardTrendService();
    const result = service.annotate([entry('u1', 1), entry('u2', 2)]);
    expect(result.map((r) => r.trend)).toEqual(['new', 'new']);
  });

  it('marks improved rank as up and worsened rank as down', () => {
    const service = new LeaderboardTrendService();
    service.annotate([entry('u1', 1), entry('u2', 2)]);

    const result = service.annotate([entry('u1', 2), entry('u2', 1)]);
    expect(result.find((r) => r.userId === 'u1')?.trend).toBe('down');
    expect(result.find((r) => r.userId === 'u2')?.trend).toBe('up');
  });

  it('marks unchanged rank as same', () => {
    const service = new LeaderboardTrendService();
    service.annotate([entry('u1', 1)]);

    const result = service.annotate([entry('u1', 1)]);
    expect(result[0].trend).toBe('same');
  });
});
