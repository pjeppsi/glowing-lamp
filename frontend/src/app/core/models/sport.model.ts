// Matches FitnessChallenge.Domain.Enums.Sport member names exactly — the API
// serializes enum responses using the C# member name (PascalCase), with no
// naming policy applied.
export type Sport = 'Running' | 'Walking' | 'Cycling' | 'Gym' | 'Swimming';

export const SPORTS: Sport[] = ['Running', 'Walking', 'Cycling', 'Gym', 'Swimming'];

export type MetricKind = 'distance' | 'duration' | 'steps';

export function metricKindForSport(sport: Sport | null): MetricKind {
  if (sport === null) {
    return 'steps';
  }
  if (sport === 'Running' || sport === 'Walking' || sport === 'Cycling') {
    return 'distance';
  }
  return 'duration';
}

// Design handoff reserves a single generic icon for the "activity/sport"
// concept (`directions_run`) — every sport reuses it rather than introducing
// new icon synonyms per sport; the label text carries the distinction.
export const SPORT_ICON = 'directions_run';
