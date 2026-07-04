import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { LeaderboardEntryResponse } from '../models/leaderboard.model';

@Injectable({ providedIn: 'root' })
export class LeaderboardApiService {
  private readonly http = inject(HttpClient);

  get(): Observable<LeaderboardEntryResponse[]> {
    return this.http.get<LeaderboardEntryResponse[]>('/api/leaderboard');
  }
}
