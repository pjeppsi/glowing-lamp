import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ActivityIngestRequest, ActivityResponse } from '../models/activity.model';

@Injectable({ providedIn: 'root' })
export class ActivitiesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/activities';

  ingest(request: ActivityIngestRequest): Observable<ActivityResponse> {
    return this.http.post<ActivityResponse>(this.baseUrl, request);
  }
}
