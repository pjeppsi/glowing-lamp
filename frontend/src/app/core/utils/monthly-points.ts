import { ActivityResponse } from '../models/activity.model';

export interface MonthlyPoints {
  key: string; // "YYYY-MM", sortable
  label: string; // "Jan 2026"
}

const MONTH_FORMATTER = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' });

// Buckets activity points by calendar month (UTC, matching the UTC ISO
// dateTime strings from the API) instead of by individual day — a chart
// spanning several months of daily activity is unreadable with one label
// per day.
export function monthlyPointTotals(activities: ActivityResponse[]): { months: MonthlyPoints[]; totals: number[] } {
  const byMonth = new Map<string, number>();
  for (const activity of activities) {
    const key = activity.dateTime.slice(0, 7); // "YYYY-MM"
    byMonth.set(key, (byMonth.get(key) ?? 0) + activity.points);
  }

  const keys = [...byMonth.keys()].sort();
  const months = keys.map((key) => ({
    key,
    label: MONTH_FORMATTER.format(new Date(`${key}-01T00:00:00Z`)),
  }));

  return { months, totals: keys.map((key) => byMonth.get(key)!) };
}
