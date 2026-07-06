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

// Like monthlyPointTotals, but always spans all 12 months of the given year
// (default: current year) with 0 for months with no activity — for a
// single-user trend chart, showing only the sparse months an activity
// happened to land in makes a short history look like a steep, alarming
// drop-off rather than "the year isn't over yet."
export function yearlyPointTotals(
  activities: ActivityResponse[],
  year = new Date().getUTCFullYear(),
): { months: MonthlyPoints[]; totals: number[] } {
  const byMonth = new Map<string, number>();
  for (const activity of activities) {
    const key = activity.dateTime.slice(0, 7);
    byMonth.set(key, (byMonth.get(key) ?? 0) + activity.points);
  }

  const months: MonthlyPoints[] = [];
  const totals: number[] = [];
  for (let month = 1; month <= 12; month++) {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    months.push({ key, label: MONTH_FORMATTER.format(new Date(`${key}-01T00:00:00Z`)) });
    totals.push(byMonth.get(key) ?? 0);
  }

  return { months, totals };
}
