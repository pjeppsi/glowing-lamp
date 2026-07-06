import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RegisterUserRequest, UserResponse } from '../models/user.model';
import { ActivitiesPageResponse, ActivityResponse } from '../models/activity.model';

@Injectable({ providedIn: 'root' })
export class UsersApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/users';

  register(request: RegisterUserRequest): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(this.baseUrl, request);
  }

  getById(id: string): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.baseUrl}/${id}`);
  }

  // Unpaged — returns the full history. Used wherever charts/stats need to
  // aggregate over every activity (dashboard stat cards/charts, leaderboard
  // comparison chart), not just the currently visible page.
  getActivities(id: string): Observable<ActivityResponse[]> {
    return this.http.get<ActivityResponse[]>(`${this.baseUrl}/${id}/activities`);
  }

  // Real server-side pagination (Skip/Take in the DB) — backs the browsable
  // Activity History table specifically.
  getActivitiesPage(id: string, page: number, pageSize: number): Observable<ActivitiesPageResponse> {
    return this.http.get<ActivitiesPageResponse>(`${this.baseUrl}/${id}/activities`, {
      params: { page, pageSize },
    });
  }
}
