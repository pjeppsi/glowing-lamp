import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { LeaderboardResponse, LeaderboardWindow } from '../models/leaderboard.model';

@Injectable({ providedIn: 'root' })
export class LeaderboardApiService {
  private readonly http = inject(HttpClient);

  get(window: LeaderboardWindow, page: number, pageSize: number): Observable<LeaderboardResponse> {
    return this.http.get<LeaderboardResponse>('/api/leaderboard', {
      params: { window, page, pageSize },
    });
  }
}
