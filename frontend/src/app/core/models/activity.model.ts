import { Sport } from './sport.model';

export interface ActivityResponse {
  id: string;
  userId: string;
  dateTime: string;
  sport: Sport | null;
  steps: number | null;
  distance: number | null;
  duration: string | null;
  points: number;
}

export interface ActivityIngestRequest {
  userId: string;
  dateTime: string;
  sport?: string;
  steps?: number;
  distance?: number;
  duration?: string;
}
