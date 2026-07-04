import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivitiesApiService } from '../../../core/services/activities-api.service';
import { ActivityResponse } from '../../../core/models/activity.model';
import { Sport, SPORTS, metricKindForSport } from '../../../core/models/sport.model';

export interface LogActivityDialogData {
  userId: string;
}

type SportOption = Sport | 'DailySteps';

@Component({
  selector: 'app-log-activity-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './log-activity-dialog.html',
  styleUrl: './log-activity-dialog.scss',
})
export class LogActivityDialog {
  private readonly activitiesApi = inject(ActivitiesApiService);
  private readonly dialogRef = inject(MatDialogRef<LogActivityDialog, ActivityResponse>);
  private readonly data = inject<LogActivityDialogData>(MAT_DIALOG_DATA);

  protected readonly sports = SPORTS;
  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly form = new FormGroup({
    sport: new FormControl<SportOption>('DailySteps', { nonNullable: true }),
    dateTime: new FormControl(this.nowForInput(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    distance: new FormControl<number | null>(null, [Validators.min(0.001)]),
    minutes: new FormControl<number | null>(null, [Validators.min(0)]),
    seconds: new FormControl<number | null>(null, [Validators.min(0), Validators.max(59)]),
    steps: new FormControl<number | null>(null, [Validators.min(1)]),
  });

  private readonly sportValue = toSignal(this.form.controls.sport.valueChanges, {
    initialValue: this.form.controls.sport.value,
  });

  protected readonly metricKind = computed(() => {
    const sport = this.sportValue();
    return metricKindForSport(sport === 'DailySteps' ? null : sport);
  });

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const { sport, dateTime, distance, minutes, seconds, steps } = this.form.getRawValue();
    const kind = this.metricKind();

    if (kind === 'distance' && !distance) {
      this.form.controls.distance.setErrors({ required: true });
      return;
    }
    if (kind === 'duration' && !minutes && !seconds) {
      this.form.controls.minutes.setErrors({ required: true });
      return;
    }
    if (kind === 'steps' && !steps) {
      this.form.controls.steps.setErrors({ required: true });
      return;
    }

    this.submitting.set(true);
    this.serverError.set(null);

    this.activitiesApi
      .ingest({
        userId: this.data.userId,
        dateTime: new Date(dateTime).toISOString(),
        sport: sport === 'DailySteps' ? undefined : sport.toLowerCase(),
        distance: kind === 'distance' ? (distance ?? undefined) : undefined,
        duration:
          kind === 'duration' ? `${minutes ?? 0}:${String(seconds ?? 0).padStart(2, '0')}` : undefined,
        steps: kind === 'steps' ? (steps ?? undefined) : undefined,
      })
      .subscribe({
        next: (activity) => {
          this.submitting.set(false);
          this.dialogRef.close(activity);
        },
        error: (error: HttpErrorResponse) => {
          this.submitting.set(false);
          this.serverError.set(
            error.status === 400
              ? 'Invalid activity data. Double-check the fields for the selected sport.'
              : 'Could not save the activity. Please try again.',
          );
        },
      });
  }

  protected cancel(): void {
    this.dialogRef.close();
  }

  private nowForInput(): string {
    const now = new Date();
    now.setSeconds(0, 0);
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }
}
