import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { LogActivityDialog } from './log-activity-dialog';

describe('LogActivityDialog', () => {
  let component: LogActivityDialog;
  let fixture: ComponentFixture<LogActivityDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LogActivityDialog],
      providers: [
        provideHttpClient(),
        { provide: MatDialogRef, useValue: { close: () => {} } },
        { provide: MAT_DIALOG_DATA, useValue: { userId: 'u1' } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LogActivityDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('defaults to the steps metric', () => {
    expect(component['metricKind']()).toBe('steps');
  });

  it('switches metric kind with sport selection', () => {
    component['form'].controls.sport.setValue('Running');
    expect(component['metricKind']()).toBe('distance');

    component['form'].controls.sport.setValue('Gym');
    expect(component['metricKind']()).toBe('duration');
  });
});
