import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Leaderboard } from './leaderboard';

describe('Leaderboard', () => {
  let component: Leaderboard;
  let fixture: ComponentFixture<Leaderboard>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Leaderboard],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should create and stop loading on an empty leaderboard', async () => {
    fixture = TestBed.createComponent(Leaderboard);
    component = fixture.componentInstance;
    fixture.detectChanges();

    httpMock.expectOne('/api/leaderboard').flush([]);
    await fixture.whenStable();

    expect(component).toBeTruthy();
    expect(component['loading']()).toBe(false);
    expect(component['radarChartData']()).toBeNull();
  });

  it('builds a sport-profile radar dataset per top user', async () => {
    fixture = TestBed.createComponent(Leaderboard);
    component = fixture.componentInstance;
    fixture.detectChanges();

    httpMock.expectOne('/api/leaderboard').flush([
      { rank: 1, userId: 'u1', firstName: 'Ana', lastName: 'Peric', totalPoints: 500 },
      { rank: 2, userId: 'u2', firstName: 'Bob', lastName: 'Baker', totalPoints: 300 },
    ]);
    await fixture.whenStable();

    httpMock
      .expectOne('/api/users/u1/activities')
      .flush([{ id: 'a1', userId: 'u1', dateTime: '2026-07-01T00:00:00Z', sport: 'Running', steps: null, distance: 5, duration: null, points: 500 }]);
    httpMock
      .expectOne('/api/users/u2/activities')
      .flush([{ id: 'a2', userId: 'u2', dateTime: '2026-07-01T00:00:00Z', sport: null, steps: 30000, distance: null, duration: null, points: 300 }]);
    await fixture.whenStable();

    const data = component['radarChartData']();
    expect(data?.labels).toEqual(['Running', 'Walking', 'Cycling', 'Gym', 'Swimming', 'Daily Steps']);
    expect(data?.datasets.length).toBe(2);
    expect(data?.datasets[0].data).toEqual([500, 0, 0, 0, 0, 0]);
    expect(data?.datasets[1].data).toEqual([0, 0, 0, 0, 0, 300]);
    expect(component['radarLegend']()).toEqual([
      { name: 'Ana Peric', color: '#3987e5' },
      { name: 'Bob Baker', color: '#199e70' },
    ]);
  });
});
