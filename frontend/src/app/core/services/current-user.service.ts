import { Injectable, signal } from '@angular/core';

export interface CurrentUser {
  id: string;
  firstName: string;
  lastName: string;
}

const STORAGE_KEY = 'fc-current-user';

@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  readonly user = signal<CurrentUser | null>(this.readFromStorage());

  set(user: CurrentUser): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    this.user.set(user);
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.user.set(null);
  }

  private readFromStorage(): CurrentUser | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as CurrentUser;
    } catch {
      return null;
    }
  }
}
