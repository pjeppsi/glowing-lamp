import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RegisterUserRequest, UserResponse } from '../models/user.model';
import { ActivityResponse } from '../models/activity.model';

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

  getActivities(id: string): Observable<ActivityResponse[]> {
    return this.http.get<ActivityResponse[]>(`${this.baseUrl}/${id}/activities`);
  }
}
