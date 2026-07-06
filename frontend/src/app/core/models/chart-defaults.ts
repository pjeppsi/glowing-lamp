// Single source for chart-wide Chart.js defaults, shared by every chart
// across dashboard, leaderboard and the user-dashboard dialog — keeps font
// (and any future shared default) in sync in one place instead of a
// per-component hardcoded copy.
export const CHART_FONT = { family: 'Inter', size: 12 } as const;
